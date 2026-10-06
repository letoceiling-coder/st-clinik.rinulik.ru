<?php

namespace App\Http\Controllers;

use App\Http\Resources\ClinicResource;
use App\Http\Resources\DoctorResource;
use App\Http\Resources\PromotionBannerResource;
use App\Http\Resources\ReviewResource;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Lead;
use App\Models\Review;
use App\Repositories\Contracts\CatalogRepository;
use App\Repositories\Contracts\ClinicRepository;
use App\Repositories\Contracts\DoctorRepository;
use App\Repositories\Contracts\ReviewRepository;
use App\Services\PromotionService;
use App\Services\SchemaOrg;
use App\Services\Seo;
use Illuminate\Support\Facades\Cache;
use Inertia\Response;

class HomeController extends Controller
{
    public function __invoke(
        CatalogRepository $catalog,
        ClinicRepository $clinics,
        DoctorRepository $doctors,
        ReviewRepository $reviews,
        Seo $seo,
        SchemaOrg $schema,
        PromotionService $promotions,
    ): Response {
        $city = $this->city();

        $prices = $clinics->minPricesByService($city->id);
        $popular = $catalog->services()->where('is_popular', true)->take(8)->map(fn ($s) => [
            'name' => $s->name,
            'slug' => $s->slug,
            'specialty' => $s->specialty?->name,
            'price_from' => $prices[$s->id]['min'] ?? null,
            'clinics' => $prices[$s->id]['clinics'] ?? 0,
        ])->values();

        $leadCounts = Cache::remember('home.concern_counts', 600, fn () => Lead::query()->whereNotNull('concern_id')
            ->selectRaw('concern_id, count(*) as c')->groupBy('concern_id')->pluck('c', 'concern_id')->all());
        $concerns = $catalog->concerns()->sortByDesc(fn ($c) => $leadCounts[$c->id] ?? 0)->take(10)->map(fn ($c) => [
            'slug' => $c->slug, 'name' => $c->name, 'hint' => $c->hint, 'icon' => $c->icon,
        ])->values();

        $stats = Cache::remember('home.stats.'.$city->id, 300, fn () => [
            'clinics' => $clinics->countPublished($city->id),
            'clinics_total' => $clinics->countPublished(),
            'doctors' => Doctor::published()->whereHas('clinic', fn ($c) => $c->published()->where('city_id', $city->id))->count(),
            'reviews' => Review::published()->count(),
            'same_day' => Clinic::published()->where('city_id', $city->id)->where('same_day', true)->count(),
        ]);

        $catalogServices = $catalog->services()->map(fn ($s) => [
            'slug' => $s->slug,
            'name' => $s->name,
            'group' => $s->specialty?->name ?? 'Прочее',
            'price_from' => $prices[$s->id]['min'] ?? $s->price_hint_from,
        ])->values();

        $heroChips = [
            ['label' => 'Лечить зуб', 'services' => ['lechenie-kariesa']],
            ['label' => 'Болит зуб', 'services' => ['lechenie-pulpita']],
            ['label' => 'Чистка', 'services' => ['professionalnaya-chistka']],
            ['label' => 'Удаление', 'services' => ['udalenie-zuba-prostoe']],
            ['label' => 'Имплантация', 'services' => ['implant-standart']],
            ['label' => 'Брекеты', 'services' => ['bregety-metall']],
            ['label' => 'Детский стоматолог', 'flag' => 'detskaya'],
        ];

        $seoData = $seo->build('home', ['count' => $stats['clinics_total'], 'city' => $city->name], [$schema->website()]);

        return $this->page('Home', [
            'stats' => $stats,
            'concerns' => $concerns,
            'popular_services' => $popular,
            'catalog_services' => $catalogServices,
            'hero_chips' => $heroChips,
            'specialties' => $catalog->specialties()->map(fn ($s) => [
                'slug' => $s->slug, 'name' => $s->name, 'short' => $s->short, 'icon' => $s->icon,
            ])->values(),
            'top_clinics' => ClinicResource::collection($clinics->top($city->id, 6))->resolve(),
            'top_doctors' => DoctorResource::collection($doctors->top($city->id, 6))->resolve(),
            'latest_reviews' => ReviewResource::collection($reviews->latest($city->id, 6))->resolve(),
            'banner_home' => PromotionBannerResource::collection($promotions->activeBanners($city->id, 'banner_home'))->resolve(),
        ], $seoData);
    }
}
