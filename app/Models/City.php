<?php

namespace App\Models;

use App\Models\Traits\HasSearchText;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class City extends Model
{
    use HasSearchText;

    protected $guarded = [];

    protected static function booted(): void
    {
        static::saving(function (City $city): void {
            if ($city->region_id) {
                $name = Region::query()->whereKey($city->region_id)->value('name');
                if ($name) {
                    $city->region = $name;
                }
            }
        });
    }

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'lat' => 'float', 'lng' => 'float'];
    }

    public function searchableParts(): array
    {
        return [$this->name, $this->region];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function regionModel(): BelongsTo
    {
        return $this->belongsTo(Region::class, 'region_id');
    }

    public function districts(): HasMany
    {
        return $this->hasMany(District::class);
    }

    public function clinics(): HasMany
    {
        return $this->hasMany(Clinic::class);
    }
}
