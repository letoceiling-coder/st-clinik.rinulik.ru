<?php

namespace App\Repositories\Eloquent;

use App\Models\ClinicPropertyType;
use App\Models\Doctor;
use App\Repositories\Contracts\DoctorRepository;
use App\Repositories\Filters\DoctorFilters;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class EloquentDoctorRepository implements DoctorRepository
{
    public function paginate(DoctorFilters $f, int $perPage = 12): LengthAwarePaginator
    {
        return $this->query($f)->paginate($perPage);
    }

    private function withCard(Builder $query): Builder
    {
        return $query->with([
            'specialties:id,name,slug',
            'clinic:id,name,slug,address,city_id,phone,is_verified,rating,same_day,is_24_7',
            'clinic.city:id,name,slug',
        ]);
    }

    public function query(DoctorFilters $f): Builder
    {
        $query = $this->withCard(Doctor::query()->published()->whereHas('clinic', fn ($c) => $c->published()));

        if ($f->ids) {
            return $query->whereIn('doctors.id', $f->ids);
        }

        $query
            ->when($f->cityId, fn (Builder $q, $id) => $q->whereHas('clinic', fn ($c) => $c->where('city_id', $id)))
            ->when($f->clinic, fn (Builder $q, $slug) => $q->whereHas('clinic', fn ($c) => $c->where('slug', $slug)))
            ->when($f->specialty, fn (Builder $q, $slug) => $q->whereHas('specialties', fn ($s) => $s->where('slug', $slug)))
            ->when($f->ratingMin, fn (Builder $q, $v) => $q->where('doctors.rating', '>=', $v))
            ->when($f->reviewsMin, fn (Builder $q, $v) => $q->where('doctors.reviews_count', '>=', $v))
            ->when($f->experienceMin, fn (Builder $q, $v) => $q->where('doctors.experience_years', '>=', $v))
            ->when($f->priceMax !== null, fn (Builder $q) => $q->where('doctors.consult_price', '<=', $f->priceMax))
            ->when($f->achievements, fn (Builder $q) => $q->whereJsonLength('doctors.achievements', '>', 0))
            ->when($f->verified, fn (Builder $q) => $q->where('doctors.is_verified', true));

        if ($f->children) {
            $query->where('doctors.accepts_children', true);
            if ($f->childAge !== null) {
                $query->where(fn ($q) => $q->whereNull('doctors.children_age_from')->orWhere('doctors.children_age_from', '<=', $f->childAge));
            }
        }

        if ($f->flags) {
            $query->whereHas('clinic', function ($c) use ($f) {
                foreach ($f->flags as $slug) {
                    $type = ClinicPropertyType::findBySlug($slug);
                    if ($type?->filter_kind === 'boolean' && $type->db_column) {
                        $c->where($type->db_column, true);
                    }
                }
            });
        }

        foreach ($f->tokens() as $token) {
            $query->where('doctors.search_text', 'like', '%'.$token.'%');
        }

        return (match ($f->sort) {
            'rating' => $query->orderByDesc('doctors.rating')->orderByDesc('doctors.reviews_count'),
            'reviews' => $query->orderByDesc('doctors.reviews_count')->orderByDesc('doctors.rating'),
            'experience' => $query->orderByDesc('doctors.experience_years'),
            'price_asc' => $query->orderBy('doctors.consult_price'),
            default => $query->orderByDesc('doctors.is_verified')->orderByDesc('doctors.rating')->orderByDesc('doctors.reviews_count'),
        })->orderBy('doctors.id');
    }

    public function byIds(array $ids): Collection
    {
        if ($ids === []) {
            return collect();
        }
        $found = $this->withCard(Doctor::query()->published()->whereIn('doctors.id', $ids))->get()->keyBy('id');

        return collect($ids)->map(fn ($id) => $found->get($id))->filter()->values();
    }

    public function findPublishedBySlug(string $slug): ?Doctor
    {
        return Doctor::query()->published()->where('slug', $slug)->with([
            'specialties', 'clinic.city', 'clinic.district',
        ])->first();
    }

    public function top(int $cityId, int $limit = 6): Collection
    {
        return $this->withCard(Doctor::query()->published()
            ->whereHas('clinic', fn ($c) => $c->published()->where('city_id', $cityId))
            ->where('doctors.reviews_count', '>=', 1)
            ->orderByDesc('doctors.is_verified')->orderByDesc('doctors.rating')->orderByDesc('doctors.reviews_count')
            ->limit($limit))->get();
    }

    public function colleagues(Doctor $doctor, int $limit = 4): Collection
    {
        return $this->withCard(Doctor::query()->published()->where('clinic_id', $doctor->clinic_id)
            ->where('doctors.id', '!=', $doctor->id)->orderByDesc('rating')->limit($limit))->get();
    }
}
