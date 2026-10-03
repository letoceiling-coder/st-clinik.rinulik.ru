<?php

namespace App\Models;

use App\Models\Traits\HasSearchText;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class City extends Model
{
    use HasSearchText;

    protected $guarded = [];

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

    public function districts(): HasMany
    {
        return $this->hasMany(District::class);
    }

    public function clinics(): HasMany
    {
        return $this->hasMany(Clinic::class);
    }
}
