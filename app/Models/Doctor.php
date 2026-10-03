<?php

namespace App\Models;

use App\Models\Traits\HasSearchText;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Doctor extends Model
{
    use HasSearchText;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'education' => 'array',
            'achievements' => 'array',
            'schedule_days' => 'array',
            'rating' => 'float',
            'is_verified' => 'boolean',
            'accepts_children' => 'boolean',
        ];
    }

    public function searchableParts(): array
    {
        $specialties = $this->exists ? $this->specialties()->pluck('name')->all() : [];

        return [$this->name, $this->position, ...$specialties];
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('doctors.status', 'published');
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function specialties(): BelongsToMany
    {
        return $this->belongsToMany(Specialty::class, 'doctor_specialty');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }
}
