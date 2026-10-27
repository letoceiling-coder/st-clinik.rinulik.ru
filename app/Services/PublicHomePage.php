<?php

namespace App\Services;

use App\Http\Resources\ClinicResource;
use App\Http\Resources\DoctorResource;
use App\Http\Resources\PromotionBannerResource;
use App\Http\Resources\ReviewResource;
use App\Models\City;
use App\Models\Doctor;
use App\Models\Lead;
use App\Models\Review;
use App\Repositories\Contracts\CatalogRepository;
use App\Repositories\Contracts\ClinicRepository;
use App\Repositories\Contracts\DoctorRepository;
use App\Repositories\Contracts\ReviewRepository;
use App\Repositories\Filters\ClinicFilters;
use App\Support\SpecialtyCover;
use Illuminate\Support\Facades\Cache;

/** Данные главной страницы (сайт и Mini App MAX). */
class PublicHomePage
{
    public function __construct(
        private readonly CatalogRepository $catalog,
        private readonly ClinicRepository $clinics,
        private readonly DoctorRepository $doctors,
        private readonly ReviewRepository $reviews,
        private readonly PromotionService $promotions,
        private readonly PublicDisplaySettings $display,
        private readonly IntegrationSettings $integrations,
    ) {}

    /** @return array<string, mixed> */
    public function inertiaProps(City $city): array
    {
        $prices = $this->clinics->minPricesByService($city->id);
        $popular = $this->catalog->services()->where('is_popular', true)->take(8)->map(fn ($s) => [
            'name' => $s->name,
            'slug' => $s->slug,
            'specialty' => $s->specialty?->name,
            'price_from' => $prices[$s->id]['min'] ?? null,
            'clinics' => $prices[$s->id]['clinics'] ?? 0,
        ])->values();

        $leadCounts = Cache::remember('home.concern_counts', 600, fn () => Lead::query()->whereNotNull('concern_id')
            ->selectRaw('concern_id, count(*) as c')->groupBy('concern_id')->pluck('c', 'concern_id')->all());
        $concerns = $this->catalog->concerns()->sortByDesc(fn ($c) => $leadCounts[$c->id] ?? 0)->take(10)->map(fn ($c) => [
            'slug' => $c->slug, 'name' => $c->name, 'hint' => $c->hint, 'icon' => $c->icon,
        ])->values();

        $statsKey = 'home.stats.'.$city->id.'.'.now()->toDateString();
        $stats = Cache::remember($statsKey, 300, function () use ($city) {
            $bonuses = app(ClinicCardBonusService::class);

            return [
                'clinics' => $this->clinics->countPublished($city->id),
                'clinics_total' => $this->clinics->countPublished(),
                'doctors' => Doctor::published()->whereHas('clinic', fn ($c) => $c->published()->where('city_id', $city->id))->count(),
                'reviews' => Review::published()->count(),
                'same_day' => $bonuses->countSameDayAvailableInCity($city->id),
            ];
        });

        $catalogServices = $this->catalog->services()->map(fn ($s) => [
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

        $mapsKey = $this->integrations->valueForConfigPath('services.yandex.maps_api_key');
        $homeMapActive = $this->display->homeMapEnabled() && filled($mapsKey);
        $mapClinics = collect();
        if ($homeMapActive) {
            $mapClinics = $this->clinics->mapPoints(new ClinicFilters(cityId: $city->id), 120)->map(fn ($c) => [
                'slug' => $c->slug,
                'name' => $c->name,
                'address' => $c->address,
                'lat' => (float) $c->lat,
                'lng' => (float) $c->lng,
            ])->values();
        }

        return [
            'home_map_active' => $homeMapActive,
            'home_map_clinics' => $mapClinics->all(),
            'stats' => $stats,
            'concerns' => $concerns,
            'popular_services' => $popular,
            'catalog_services' => $catalogServices,
            'hero_chips' => $heroChips,
            'specialties' => $this->catalog->specialties()->map(fn ($s) => SpecialtyCover::toCard($s))->values(),
            'top_clinics' => ClinicResource::collection($this->clinics->top($city->id, 6))->resolve(),
            'top_clinics_has_more' => $this->clinics->rankedForHome($city->id, 1, 6)->isNotEmpty(),
            'top_doctors' => DoctorResource::collection($this->doctors->top($city->id, 6))->resolve(),
            'latest_reviews' => ReviewResource::collection($this->reviews->latest($city->id, 6))->resolve(),
            'banner_home' => $this->display->adsEnabled()
                ? PromotionBannerResource::collection($this->promotions->activeBanners($city->id, 'banner_home'))->resolve()
                : [],
        ];
    }
}
