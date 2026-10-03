<?php

namespace App\Repositories\Eloquent;

use App\Models\City;
use App\Models\Concern;
use App\Models\District;
use App\Models\Service;
use App\Models\Specialty;
use App\Repositories\Contracts\CatalogRepository;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class EloquentCatalogRepository implements CatalogRepository
{
    public function cities(): Collection
    {
        return City::query()->where('is_active', true)->orderBy('sort')->get();
    }

    public function city(string $slug): ?City
    {
        return $this->cities()->firstWhere('slug', $slug);
    }

    public function defaultCity(): City
    {
        return $this->city('moskva') ?? $this->cities()->firstOrFail();
    }

    public function specialties(): Collection
    {
        return Specialty::query()->where('is_active', true)->orderBy('sort')->get();
    }

    public function specialty(string $slug): ?Specialty
    {
        return $this->specialties()->firstWhere('slug', $slug);
    }

    public function services(): Collection
    {
        return Service::query()->where('is_active', true)->with('specialty:id,name,slug')->orderBy('specialty_id')->orderBy('id')->get();
    }

    public function concerns(): Collection
    {
        return Concern::query()->where('is_active', true)->with(['specialty:id,name,slug', 'services:id,name,slug'])->orderBy('sort')->get();
    }

    public function concern(string $slug): ?Concern
    {
        return $this->concerns()->firstWhere('slug', $slug);
    }

    public function districts(int $cityId): Collection
    {
        return District::query()->where('city_id', $cityId)->orderBy('name')->get();
    }

    public function flush(): void
    {
        foreach (['cities', 'specialties', 'services', 'concerns'] as $key) {
            Cache::forget("dict.$key");
        }
        foreach (City::query()->pluck('id') as $id) {
            Cache::forget("dict.districts.$id");
        }
    }
}
