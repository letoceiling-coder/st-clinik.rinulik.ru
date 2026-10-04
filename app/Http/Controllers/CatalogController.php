<?php

namespace App\Http\Controllers;

use App\Http\Resources\ClinicResource;
use App\Http\Resources\DoctorResource;
use App\Http\Resources\PromotionBannerResource;
use App\Http\Resources\ReviewResource;
use App\Models\City;
use App\Repositories\Contracts\CatalogRepository;
use App\Repositories\Contracts\ClinicRepository;
use App\Repositories\Contracts\DoctorRepository;
use App\Repositories\Contracts\ReviewRepository;
use App\Repositories\Filters\ClinicFilters;
use App\Repositories\Filters\DoctorFilters;
use App\Services\PromotionService;
use App\Services\SchemaOrg;
use App\Services\Seo;
use App\Support\Text;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Response;

class CatalogController extends Controller
{
    public function __construct(
        private readonly CatalogRepository $catalog,
        private readonly ClinicRepository $clinics,
        private readonly DoctorRepository $doctors,
        private readonly ReviewRepository $reviews,
        private readonly Seo $seo,
        private readonly SchemaOrg $schema,
        private readonly PromotionService $promotions,
    ) {}

    /** @return list<array{0:string,1:string}> */
    private function crumbs(City $city, ?string $label = null, ?string $url = null): array
    {
        $c = [['Главная', url('/')], [$city->name, route('city.clinics', $city->slug)]];
        if ($label) {
            $c[] = [$label, $url ?? url()->current()];
        }

        return $c;
    }

    private function filterOptions(City $city): array
    {
        return [
            'districts' => $this->catalog->districts($city->id)->map(fn ($d) => ['slug' => $d->slug, 'name' => $d->name])->values(),
            'specialties' => $this->catalog->specialties()->map(fn ($s) => ['slug' => $s->slug, 'name' => $s->name])->values(),
            'services' => $this->catalog->services()->map(fn ($s) => ['slug' => $s->slug, 'name' => $s->name, 'group' => $s->specialty?->name])->values(),
        ];
    }

    public function clinics(Request $request, City $city): Response
    {
        $filters = ClinicFilters::fromArray($request->query(), $city->id);
        $page = $this->clinics->paginate($filters, 12);
        $boosted = collect($this->promotions->boostedClinicIds($city->id))->flip();
        $page->getCollection()->each(fn ($c) => $c->setAttribute('is_promoted', $boosted->has($c->id)));

        $recommended = $this->clinics->byIds($this->promotions->boostedClinicIds($city->id));
        $recommended->each(fn ($c) => $c->setAttribute('is_promoted', true));

        $serviceName = $filters->service ? $this->catalog->services()->firstWhere('slug', $filters->service)?->name : null;
        $seoData = $this->seo->build('city_clinics', ['city' => $city->name, 'city_in' => $city->name_in, 'count' => $page->total()], [
            $this->schema->breadcrumbs($this->crumbs($city, 'Клиники')),
            $this->schema->itemList($page->getCollection()->map(fn ($c) => ['name' => $c->name, 'url' => route('clinics.show', $c->slug)])->all()),
        ]);

        return $this->page('Clinics/Index', [
            'clinics' => $this->paged($page, ClinicResource::class),
            'recommended_clinics' => ClinicResource::collection($recommended)->resolve(),
            'banner_catalog' => PromotionBannerResource::collection($this->promotions->activeBanners($city->id, 'banner_catalog'))->resolve(),
            'map_clinics' => $this->clinics->mapPoints($filters)->map(fn ($c) => [
                'slug' => $c->slug,
                'name' => $c->name,
                'address' => $c->address,
                'lat' => (float) $c->lat,
                'lng' => (float) $c->lng,
            ])->values(),
            'filters' => $filters->active(),
            'options' => $this->filterOptions($city),
            'service_name' => $serviceName,
            'breadcrumbs' => $this->crumbs($city, 'Клиники'),
        ], $seoData);
    }

    public function doctors(Request $request, City $city): Response
    {
        $filters = DoctorFilters::fromArray($request->query(), $city->id);
        $page = $this->doctors->paginate($filters, 12);

        $seoData = $this->seo->build('city_doctors', ['city' => $city->name, 'city_in' => $city->name_in, 'count' => $page->total()], [
            $this->schema->breadcrumbs($this->crumbs($city, 'Врачи')),
            $this->schema->itemList($page->getCollection()->map(fn ($d) => ['name' => $d->name, 'url' => route('doctors.show', $d->slug)])->all()),
        ]);

        return $this->page('Doctors/Index', [
            'doctors' => $this->paged($page, DoctorResource::class),
            'filters' => $filters->active(),
            'options' => $this->filterOptions($city),
            'breadcrumbs' => $this->crumbs($city, 'Врачи'),
        ], $seoData);
    }

    public function directions(City $city): Response
    {
        $counts = DB::table('clinic_specialty')
            ->join('clinics', 'clinics.id', '=', 'clinic_specialty.clinic_id')
            ->where('clinics.city_id', $city->id)->where('clinics.status', 'published')
            ->groupBy('clinic_specialty.specialty_id')
            ->selectRaw('clinic_specialty.specialty_id as id, count(*) as c')->pluck('c', 'id');
        $prices = $this->clinics->minPricesByService($city->id);

        $specialties = $this->catalog->specialties()->map(function ($s) use ($counts, $prices) {
            $services = $this->catalog->services()->where('specialty_id', $s->id);
            $min = $services->map(fn ($sv) => $prices[$sv->id]['min'] ?? null)->filter()->min();

            return [
                'slug' => $s->slug, 'name' => $s->name, 'short' => $s->short, 'icon' => $s->icon,
                'clinics' => (int) ($counts[$s->id] ?? 0), 'price_from' => $min,
            ];
        })->values();

        $seoData = $this->seo->build('city_directions', ['city' => $city->name, 'city_in' => $city->name_in], [
            $this->schema->breadcrumbs($this->crumbs($city, 'Направления')),
        ]);

        return $this->page('Directions/Index', [
            'specialties' => $specialties,
            'concerns' => $this->catalog->concerns()->take(10)->map(fn ($c) => ['slug' => $c->slug, 'name' => $c->name, 'hint' => $c->hint, 'icon' => $c->icon])->values(),
            'breadcrumbs' => $this->crumbs($city, 'Направления'),
        ], $seoData);
    }

    public function direction(City $city, string $specialty): Response
    {
        $spec = $this->catalog->specialty($specialty) ?? abort(404);
        $prices = $this->clinics->minPricesByService($city->id);

        $services = $this->catalog->services()->where('specialty_id', $spec->id)->map(fn ($s) => [
            'slug' => $s->slug, 'name' => $s->name, 'description' => $s->description, 'duration_min' => $s->duration_min,
            'price_from' => $prices[$s->id]['min'] ?? null, 'clinics' => $prices[$s->id]['clinics'] ?? 0,
        ])->values();

        $clinicPage = $this->clinics->paginate(ClinicFilters::fromArray(['specialty' => $spec->slug, 'sort' => 'rating'], $city->id), 6);
        $doctorPage = $this->doctors->paginate(DoctorFilters::fromArray(['specialty' => $spec->slug, 'sort' => 'rating'], $city->id), 6);
        $minPrice = $services->pluck('price_from')->filter()->min();

        $crumbs = array_merge($this->crumbs($city, 'Направления', route('city.directions', $city->slug)), [[$spec->name, url()->current()]]);
        $seoData = $this->seo->build('direction', [
            'direction' => $spec->name, 'city' => $city->name, 'city_in' => $city->name_in,
            'count' => $clinicPage->total(), 'price' => $minPrice ? Text::money($minPrice) : '',
        ], [$this->schema->breadcrumbs($crumbs)]);

        return $this->page('Directions/Show', [
            'specialty' => [
                'slug' => $spec->slug, 'name' => $spec->name, 'description' => $spec->description,
                'when_to_apply' => $spec->when_to_apply, 'restrictions' => $spec->restrictions, 'icon' => $spec->icon,
            ],
            'services' => $services,
            'clinics' => ClinicResource::collection($clinicPage->getCollection())->resolve(),
            'clinics_total' => $clinicPage->total(),
            'doctors' => DoctorResource::collection($doctorPage->getCollection())->resolve(),
            'concerns' => $this->catalog->concerns()->where('specialty_id', $spec->id)->map(fn ($c) => ['slug' => $c->slug, 'name' => $c->name, 'hint' => $c->hint, 'icon' => $c->icon])->values(),
            'breadcrumbs' => $crumbs,
        ], $seoData);
    }

    public function prices(City $city): Response
    {
        $prices = $this->clinics->minPricesByService($city->id);
        $groups = $this->catalog->services()->groupBy(fn ($s) => $s->specialty?->name)->map(fn ($items, $group) => [
            'group' => $group,
            'items' => $items->map(fn ($s) => [
                'slug' => $s->slug, 'name' => $s->name, 'duration_min' => $s->duration_min,
                'price_from' => $prices[$s->id]['min'] ?? null, 'clinics' => $prices[$s->id]['clinics'] ?? 0,
            ])->values(),
        ])->values();

        $seoData = $this->seo->build('prices', ['city' => $city->name, 'city_in' => $city->name_in], [
            $this->schema->breadcrumbs($this->crumbs($city, 'Цены')),
        ]);

        return $this->page('Prices/Index', ['groups' => $groups, 'breadcrumbs' => $this->crumbs($city, 'Цены')], $seoData);
    }

    public function reviews(Request $request, City $city): Response
    {
        $rating = $request->integer('rating') ?: null;
        $page = $this->reviews->forCity($city->id, 12, $rating);

        $seoData = $this->seo->build('reviews', ['city' => $city->name, 'city_in' => $city->name_in], [
            $this->schema->breadcrumbs($this->crumbs($city, 'Отзывы')),
        ]);

        return $this->page('Reviews/Index', [
            'reviews' => $this->paged($page, ReviewResource::class),
            'filters' => array_filter(['rating' => $rating]),
            'breadcrumbs' => $this->crumbs($city, 'Отзывы'),
        ], $seoData);
    }

    public function concern(City $city, string $concern): Response
    {
        $item = $this->catalog->concern($concern) ?? abort(404);
        $prices = $this->clinics->minPricesByService($city->id);

        $services = $item->services->map(fn ($s) => [
            'slug' => $s->slug, 'name' => $s->name,
            'price_from' => $prices[$s->id]['min'] ?? null, 'clinics' => $prices[$s->id]['clinics'] ?? 0,
        ])->values();

        $clinicPage = $this->clinics->paginate(ClinicFilters::fromArray(['specialty' => $item->specialty?->slug, 'sort' => 'rating'], $city->id), 6);

        $seoData = $this->seo->build('direction', [
            'direction' => $item->name, 'city' => $city->name, 'city_in' => $city->name_in, 'count' => $clinicPage->total(),
            'price' => $services->pluck('price_from')->filter()->min() ? Text::money($services->pluck('price_from')->filter()->min()) : '',
        ], [$this->schema->breadcrumbs($this->crumbs($city, $item->name))]);

        return $this->page('Concerns/Show', [
            'concern' => ['slug' => $item->slug, 'name' => $item->name, 'hint' => $item->hint, 'advice' => $item->advice, 'icon' => $item->icon],
            'specialty' => $item->specialty ? ['slug' => $item->specialty->slug, 'name' => $item->specialty->name, 'restrictions' => $item->specialty->restrictions] : null,
            'services' => $services,
            'clinics' => ClinicResource::collection($clinicPage->getCollection())->resolve(),
            'clinics_total' => $clinicPage->total(),
            'other_concerns' => $this->catalog->concerns()->where('slug', '!=', $item->slug)->take(8)->map(fn ($c) => ['slug' => $c->slug, 'name' => $c->name, 'icon' => $c->icon])->values(),
            'breadcrumbs' => $this->crumbs($city, $item->name),
        ], $seoData);
    }
}
