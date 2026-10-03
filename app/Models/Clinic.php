<?php

namespace App\Models;

use App\Models\Traits\HasSearchText;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Clinic extends Model
{
    use HasSearchText;

    public const STATUSES = ['draft', 'pending', 'published', 'rejected', 'hidden'];

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'schedule' => 'array',
            'payment_methods' => 'array',
            'achievements' => 'array',
            'license_date' => 'date',
            'rating' => 'float',
            'lat' => 'float',
            'lng' => 'float',
            'is_verified' => 'boolean',
            'is_24_7' => 'boolean',
            'accepts_children' => 'boolean',
            'same_day' => 'boolean',
            'has_installment' => 'boolean',
            'accepts_dms' => 'boolean',
            'has_sedation' => 'boolean',
            'has_anesthesia' => 'boolean',
            'has_microscope' => 'boolean',
            'has_ct' => 'boolean',
        ];
    }

    public function searchableParts(): array
    {
        return [
            $this->name, $this->tagline, $this->address, $this->metro,
            $this->district?->name, $this->city?->name,
        ];
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('clinics.status', 'published');
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    public function doctors(): HasMany
    {
        return $this->hasMany(Doctor::class);
    }

    public function clinicServices(): HasMany
    {
        return $this->hasMany(ClinicService::class);
    }

    public function specialties(): BelongsToMany
    {
        return $this->belongsToMany(Specialty::class, 'clinic_specialty');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(ClinicPhoto::class)->orderBy('sort');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(ClinicDocument::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }
}
