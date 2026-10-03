<?php

namespace App\Models;

use App\Models\Traits\HasSearchText;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    use HasSearchText;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['is_popular' => 'boolean', 'is_active' => 'boolean'];
    }

    public function searchableParts(): array
    {
        return [$this->name, $this->description];
    }

    public function specialty(): BelongsTo
    {
        return $this->belongsTo(Specialty::class);
    }

    public function clinicServices(): HasMany
    {
        return $this->hasMany(ClinicService::class);
    }

    public function concerns(): BelongsToMany
    {
        return $this->belongsToMany(Concern::class, 'concern_service');
    }
}
