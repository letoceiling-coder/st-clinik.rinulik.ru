<?php

namespace App\Repositories\Contracts;

use App\Models\Clinic;
use App\Repositories\Filters\ClinicFilters;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

interface ClinicRepository
{
    public function paginate(ClinicFilters $filters, int $perPage = 12): LengthAwarePaginator;

    /** @return Collection<int,Clinic> */
    public function byIds(array $ids): Collection;

    public function findPublishedBySlug(string $slug): ?Clinic;

    /** @return Collection<int,Clinic> */
    public function top(int $cityId, int $limit = 6): Collection;

    /** @return Collection<int,Clinic> */
    public function similar(Clinic $clinic, int $limit = 4): Collection;

    public function countPublished(?int $cityId = null): int;

    /** Минимальная цена услуги по городу: [service_id => min price_from]. */
    public function minPricesByService(int $cityId): array;
}
