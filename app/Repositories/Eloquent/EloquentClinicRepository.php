<?php

namespace App\Repositories\Eloquent;

use App\Models\Clinic;
use App\Models\ClinicPromotion;
use App\Models\ClinicService;
use App\Repositories\Contracts\ClinicRepository;
use App\Repositories\Filters\ClinicFilters;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class EloquentClinicRepository implements ClinicRepository
{
    public function paginate(ClinicFilters $f, int $perPage = 12): LengthAwarePaginator
    {
        return $this->query($f)->paginate($perPage);
    }

    public function query(ClinicFilters $f): Builder
    {
        $query = $this->filteredQuery($f);
        $this->withCardRelations($query);

        return $this->sort($query, $f->sort, $f->cityId);
    }

    public function mapPoints(ClinicFilters $f, int $limit = 50): Collection
    {
        return $this->sort(
            $this->filteredQuery($f)
                ->whereNotNull('clinics.lat')
                ->whereNotNull('clinics.lng'),
            $f->sort,
            $f->cityId,
        )
            ->limit($limit)
            ->get(['clinics.id', 'clinics.slug', 'clinics.name', 'clinics.lat', 'clinics.lng', 'clinics.address']);
    }

    private function filteredQuery(ClinicFilters $f): Builder
    {
        $query = Clinic::query()->published();

        if ($f->ids) {
            return $query->whereIn('clinics.id', $f->ids);
        }

        $query
            ->when($f->cityId, fn (Builder $q, $id) => $q->where('clinics.city_id', $id))
            ->when($f->district, fn (Builder $q, $slug) => $q->whereHas('district', fn ($d) => $d->where('slug', $slug)))
            ->when($f->specialty, fn (Builder $q, $slug) => $q->whereHas('specialties', fn ($s) => $s->where('slug', $slug)))
            ->when($f->ratingMin, fn (Builder $q, $v) => $q->where('clinics.rating', '>=', $v))
            ->when($f->reviewsMin, fn (Builder $q, $v) => $q->where('clinics.reviews_count', '>=', $v))
            ->when($f->experienceMin, fn (Builder $q, $v) => $q->where('clinics.max_experience', '>=', $v))
            ->when($f->achievements, fn (Builder $q) => $q->whereJsonLength('clinics.achievements', '>', 0));

        if ($f->service) {
            $query->whereHas('clinicServices', function ($cs) use ($f) {
                $cs->whereHas('service', fn ($s) => $s->where('slug', $f->service));
                if ($f->priceMax) {
                    $cs->where('price_from', '<=', $f->priceMax);
                }
            });
        } elseif ($f->priceMax) {
            $query->whereNotNull('clinics.min_price')->where('clinics.min_price', '<=', $f->priceMax);
        }

        if ($f->children) {
            $query->where('clinics.accepts_children', true);
            if ($f->childAge !== null) {
                $query->where(fn ($q) => $q->whereNull('clinics.children_age_from')->orWhere('clinics.children_age_from', '<=', $f->childAge));
            }
        }

        foreach ($f->flags as $flag) {
            $query->where('clinics.'.ClinicFilters::FLAGS[$flag], true);
        }

        foreach ($f->tokens() as $token) {
            $like = '%'.$token.'%';
            $query->where(fn ($q) => $q
                ->where('clinics.search_text', 'like', $like)
                ->orWhereHas('doctors', fn ($d) => $d->where('search_text', 'like', $like)));
        }

        return $query;
    }

    private function sort(Builder $query, string $sort, ?int $cityId = null): Builder
    {
        if ($cityId && $sort === 'relevance') {
            $boosted = ClinicPromotion::query()
                ->active()
                ->where('city_id', $cityId)
                ->where('product_code', 'boost')
                ->pluck('clinic_id');

            if ($boosted->isNotEmpty()) {
                $ids = $boosted->implode(',');
                $query->orderByRaw("case when clinics.id in ({$ids}) then 0 else 1 end");
            }
        }

        return (match ($sort) {
            'rating' => $query->orderByDesc('clinics.rating')->orderByDesc('clinics.reviews_count'),
            'reviews' => $query->orderByDesc('clinics.reviews_count')->orderByDesc('clinics.rating'),
            'price_asc' => $query->orderByRaw('clinics.min_price is null')->orderBy('clinics.min_price'),
            'price_desc' => $query->orderByRaw('clinics.min_price is null')->orderByDesc('clinics.min_price'),
            'experience' => $query->orderByDesc('clinics.max_experience')->orderByDesc('clinics.rating'),
            default => $query->orderByDesc('clinics.is_verified')->orderByDesc('clinics.rating')->orderByDesc('clinics.reviews_count'),
        })->orderBy('clinics.id');
    }

    private function withCardRelations(Builder $query): void
    {
        $query->with([
            'city:id,name,slug,name_in',
            'district:id,name',
            'specialties:id,name,slug',
            'doctors' => fn ($q) => $q->published()->orderByDesc('rating')->orderByDesc('experience_years'),
            'photos' => fn ($q) => $q->where('status', 'approved'),
            'documents' => fn ($q) => $q->where('type', 'license')->where('status', 'approved'),
            'clinicServices' => fn ($q) => $q->with('service:id,name,slug,is_popular')
                ->where('price_from', '>', 0)->orderBy('price_from'),
        ]);
    }

    public function byIds(array $ids): Collection
    {
        if ($ids === []) {
            return collect();
        }
        $query = Clinic::query()->published()->whereIn('clinics.id', $ids);
        $this->withCardRelations($query);
        $found = $query->get()->keyBy('id');

        return collect($ids)->map(fn ($id) => $found->get($id))->filter()->values();
    }

    public function findPublishedBySlug(string $slug): ?Clinic
    {
        return Clinic::query()->published()->where('slug', $slug)->with([
            'organization:id,name,legal_name',
            'city', 'district', 'specialties',
            'doctors' => fn ($q) => $q->published()->with('specialties:id,name,slug')->orderByDesc('rating')->orderByDesc('experience_years'),
            'photos' => fn ($q) => $q->where('status', 'approved'),
            'documents' => fn ($q) => $q->where('status', 'approved'),
            'clinicServices' => fn ($q) => $q->with('service.specialty:id,name,slug')->orderBy('price_from'),
            'posts' => fn ($q) => $q->published()->active()->orderByDesc('is_pinned')->orderBy('sort')->orderByDesc('id'),
        ])->first();
    }

    public function top(int $cityId, int $limit = 6): Collection
    {
        $query = Clinic::query()->published()->where('clinics.city_id', $cityId)->where('clinics.reviews_count', '>=', 3)
            ->orderByDesc('clinics.is_verified')->orderByDesc('clinics.rating')->orderByDesc('clinics.reviews_count')->limit($limit);
        $this->withCardRelations($query);

        return $query->get();
    }

    public function similar(Clinic $clinic, int $limit = 4): Collection
    {
        $query = Clinic::query()->published()->where('clinics.city_id', $clinic->city_id)->where('clinics.id', '!=', $clinic->id)
            ->orderByDesc('clinics.rating')->limit($limit);
        $this->withCardRelations($query);

        return $query->get();
    }

    public function countPublished(?int $cityId = null): int
    {
        return Clinic::published()->when($cityId, fn ($q, $id) => $q->where('city_id', $id))->count();
    }

    public function minPricesByService(int $cityId): array
    {
        return ClinicService::query()
            ->join('clinics', 'clinics.id', '=', 'clinic_services.clinic_id')
            ->where('clinics.city_id', $cityId)->where('clinics.status', 'published')->where('clinic_services.price_from', '>', 0)
            ->groupBy('clinic_services.service_id')
            ->select('clinic_services.service_id', DB::raw('min(clinic_services.price_from) as min_price'), DB::raw('count(*) as clinics'))
            ->get()
            ->mapWithKeys(fn ($r) => [$r->service_id => ['min' => (int) $r->min_price, 'clinics' => (int) $r->clinics]])
            ->all();
    }
}
