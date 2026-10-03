<?php

namespace App\Repositories\Eloquent;

use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Review;
use App\Repositories\Contracts\ReviewRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class EloquentReviewRepository implements ReviewRepository
{
    private function base(): Builder
    {
        return Review::query()->published()->with(['doctor:id,name,slug', 'service:id,name,slug', 'clinic:id,name,slug,city_id']);
    }

    public function forClinic(Clinic $clinic, int $perPage = 6, ?int $rating = null, string $sort = 'new'): LengthAwarePaginator
    {
        return $this->base()->where('reviews.clinic_id', $clinic->id)
            ->when($rating, fn (Builder $q, $r) => $q->where('reviews.rating', $r))
            ->when($sort === 'low', fn (Builder $q) => $q->orderBy('reviews.rating'), fn (Builder $q) => $q->orderByDesc('reviews.published_at'))
            ->orderByDesc('reviews.id')
            ->paginate($perPage, pageName: 'reviews_page');
    }

    public function forDoctor(Doctor $doctor, int $perPage = 6): LengthAwarePaginator
    {
        return $this->base()->where('reviews.doctor_id', $doctor->id)
            ->orderByDesc('reviews.published_at')->paginate($perPage, pageName: 'reviews_page');
    }

    public function forCity(int $cityId, int $perPage = 12, ?int $rating = null): LengthAwarePaginator
    {
        return $this->base()->whereHas('clinic', fn ($c) => $c->published()->where('city_id', $cityId))
            ->when($rating, fn (Builder $q, $r) => $q->where('reviews.rating', $r))
            ->orderByDesc('reviews.published_at')->paginate($perPage);
    }

    public function latest(int $cityId, int $limit = 6): Collection
    {
        return $this->base()->whereHas('clinic', fn ($c) => $c->published()->where('city_id', $cityId))
            ->where('reviews.rating', '>=', 4)
            ->orderByDesc('reviews.published_at')->limit($limit)->get();
    }

    public function distribution(Clinic|Doctor $subject): array
    {
        $column = $subject instanceof Clinic ? 'clinic_id' : 'doctor_id';
        $rows = Review::published()->where($column, $subject->id)
            ->selectRaw('rating, count(*) as c')->groupBy('rating')->pluck('c', 'rating');

        return collect([5, 4, 3, 2, 1])->mapWithKeys(fn ($r) => [$r => (int) ($rows[$r] ?? 0)])->all();
    }
}
