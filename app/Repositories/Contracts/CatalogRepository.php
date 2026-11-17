<?php

namespace App\Repositories\Contracts;

use App\Models\City;
use App\Models\Concern;
use App\Models\District;
use App\Models\Service;
use App\Models\Specialty;
use Illuminate\Support\Collection;

interface CatalogRepository
{
    /** @return Collection<int,City> */
    public function cities(): Collection;

    public function city(string $slug): ?City;

    public function defaultCity(): City;

    /** @return Collection<int,Specialty> */
    public function specialties(): Collection;

    public function specialty(string $slug): ?Specialty;

    /** @return Collection<int,Service> */
    public function services(): Collection;

    /** @return Collection<int,Concern> */
    public function concerns(): Collection;

    public function concern(string $slug): ?Concern;

    /** @return Collection<int,District> */
    public function districts(int $cityId): Collection;

    public function flush(): void;
}
