<?php

namespace App\Repositories\Contracts;

use App\Models\Clinic;
use App\Models\Doctor;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface ReviewRepository
{
    public function forClinic(Clinic $clinic, int $perPage = 6, ?int $rating = null, string $sort = 'new'): LengthAwarePaginator;

    public function forDoctor(Doctor $doctor, int $perPage = 6): LengthAwarePaginator;

    public function forCity(int $cityId, int $perPage = 12, ?int $rating = null): LengthAwarePaginator;

    public function latest(int $cityId, int $limit = 6): Collection;

    /** @return array<int,int> рейтинг => количество */
    public function distribution(Clinic|Doctor $subject): array;
}
