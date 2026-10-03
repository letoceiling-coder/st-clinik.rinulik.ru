<?php

namespace App\Services;

use App\Http\Resources\ClinicResource;
use App\Http\Resources\DoctorResource;
use App\Models\City;
use App\Models\Clinic;
use App\Models\Concern;
use App\Models\Doctor;
use App\Models\Service;
use App\Models\Specialty;
use App\Repositories\Contracts\CatalogRepository;
use App\Repositories\Contracts\ClinicRepository;
use App\Repositories\Contracts\DoctorRepository;
use App\Repositories\Filters\ClinicFilters;
use App\Support\Text;
use Illuminate\Database\Eloquent\Builder;

/**
 * Единый поиск: город, клиника, врач, услуга, направление и «что беспокоит».
 */
class SearchService
{
    public function __construct(
        private readonly ClinicRepository $clinics,
        private readonly DoctorRepository $doctors,
        private readonly CatalogRepository $catalog,
    ) {}

    /** @return list<string> */
    private function tokens(string $q): array
    {
        return (new ClinicFilters(q: $q))->tokens();
    }

    private function matchTokens(Builder $query, array $tokens, string $column = 'search_text'): Builder
    {
        foreach ($tokens as $token) {
            $query->where($column, 'like', '%'.$token.'%');
        }

        return $query;
    }

    /** Лёгкая выдача для выпадающего списка. */
    public function suggest(string $q, City $city): array
    {
        $q = trim($q);
        $tokens = $this->tokens($q);
        if ($tokens === [] || mb_strlen($q) < 2) {
            return $this->empty();
        }

        $cities = $this->matchTokens(City::query()->where('is_active', true), $tokens)->limit(3)->get();
        $clinics = $this->matchTokens(Clinic::published()->with('city:id,name,slug')->where('city_id', $city->id), $tokens)
            ->orderByDesc('rating')->limit(4)->get();
        $doctors = $this->matchTokens(Doctor::published()->with(['clinic:id,name,slug,city_id'])->whereHas('clinic', fn ($c) => $c->published()->where('city_id', $city->id)), $tokens)
            ->orderByDesc('rating')->limit(4)->get();
        $services = $this->matchTokens(Service::query()->where('is_active', true), $tokens)->limit(4)->get();
        $concerns = $this->matchTokens(Concern::query()->where('is_active', true), $tokens)->limit(4)->get();
        $specialties = $this->matchTokens(Specialty::query()->where('is_active', true), $tokens)->limit(3)->get();
        $prices = $services->isEmpty() ? [] : $this->clinics->minPricesByService($city->id);

        return [
            'query' => $q,
            'cities' => $cities->map(fn (City $c) => ['name' => $c->name, 'hint' => 'Город', 'url' => route('city.clinics', $c->slug)])->values(),
            'clinics' => $clinics->map(fn (Clinic $c) => ['name' => $c->name, 'hint' => $c->address, 'rating' => (float) $c->rating, 'url' => route('clinics.show', $c->slug)])->values(),
            'doctors' => $doctors->map(fn (Doctor $d) => ['name' => $d->name, 'hint' => $d->position.' · '.$d->clinic?->name, 'rating' => (float) $d->rating, 'url' => route('doctors.show', $d->slug)])->values(),
            'services' => $services->map(fn (Service $s) => [
                'name' => $s->name,
                'hint' => isset($prices[$s->id]) ? 'от '.Text::money($prices[$s->id]['min']) : 'Услуга',
                'url' => route('city.clinics', $city->slug).'?service='.$s->slug,
            ])->values(),
            'concerns' => $concerns->map(fn (Concern $c) => ['name' => $c->name, 'hint' => $c->hint, 'url' => route('city.concern', [$city->slug, $c->slug])])->values(),
            'specialties' => $specialties->map(fn (Specialty $s) => ['name' => $s->name, 'hint' => 'Направление', 'url' => route('city.direction', [$city->slug, $s->slug])])->values(),
        ];
    }

    /** Полная выдача страницы /search. */
    public function search(string $q, City $city): array
    {
        $tokens = $this->tokens($q);
        if ($tokens === []) {
            return $this->empty() + ['clinic_cards' => [], 'doctor_cards' => []];
        }

        $base = $this->suggest($q, $city);

        $clinicPage = $this->clinics->paginate(ClinicFilters::fromArray(['q' => $q], $city->id), 8);
        $doctorIds = $this->matchTokens(
            Doctor::published()->whereHas('clinic', fn ($c) => $c->published()->where('city_id', $city->id)),
            $tokens,
            'doctors.search_text'
        )->orderByDesc('rating')->limit(8)->pluck('id')->all();

        return $base + [
            'clinic_cards' => ClinicResource::collection($clinicPage->getCollection())->resolve(),
            'clinic_total' => $clinicPage->total(),
            'doctor_cards' => DoctorResource::collection($this->doctors->byIds($doctorIds))->resolve(),
        ];
    }

    private function empty(): array
    {
        return ['query' => '', 'cities' => [], 'clinics' => [], 'doctors' => [], 'services' => [], 'concerns' => [], 'specialties' => []];
    }
}
