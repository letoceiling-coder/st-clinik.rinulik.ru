<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

class ClinicPropertyType extends Model
{
    public const KINDS = ['boolean', 'specialty', 'sort', 'achievement'];

    /** @var list<string> */
    public const DB_COLUMNS = [
        'is_verified',
        'is_24_7',
        'same_day',
        'accepts_children',
        'has_installment',
        'has_partial_payment',
        'accepts_dms',
        'accepts_oms',
        'has_sedation',
        'has_anesthesia',
        'has_microscope',
        'has_ct',
    ];

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'show_in_filter' => 'boolean',
            'show_in_cabinet' => 'boolean',
        ];
    }

    /** @return Collection<int, self> */
    public static function cached(): Collection
    {
        return self::query()
            ->where('is_active', true)
            ->orderBy('sort')
            ->orderBy('id')
            ->get();
    }

    public static function flushCache(): void
    {
        Cache::forget('dict.clinic_property_types');
    }

    /** @return Collection<int, self> */
    public static function forFilter(): Collection
    {
        return self::cached()->where('show_in_filter', true)->values();
    }

    /** @return Collection<int, self> */
    public static function forCabinet(): Collection
    {
        return self::cached()
            ->where('show_in_cabinet', true)
            ->where('filter_kind', 'boolean')
            ->whereNotNull('db_column')
            ->values();
    }

    public static function findBySlug(string $slug): ?self
    {
        return self::cached()->firstWhere('slug', $slug);
    }

    /** @return array<string, string> slug => db_column */
    public static function booleanFlagMap(): array
    {
        return self::forFilter()
            ->where('filter_kind', 'boolean')
            ->whereNotNull('db_column')
            ->pluck('db_column', 'slug')
            ->all();
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }
}
