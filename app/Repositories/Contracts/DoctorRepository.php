<?php

namespace App\Repositories\Contracts;

use App\Models\Doctor;
use App\Repositories\Filters\DoctorFilters;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface DoctorRepository
{
    public function paginate(DoctorFilters $filters, int $perPage = 12): LengthAwarePaginator;

    /** @return Collection<int,Doctor> */
    public function byIds(array $ids): Collection;

    public function findPublishedBySlug(string $slug): ?Doctor;

    /** @return Collection<int,Doctor> */
    public function top(int $cityId, int $limit = 6): Collection;

    /** @return Collection<int,Doctor> */
    public function colleagues(Doctor $doctor, int $limit = 4): Collection;
}
