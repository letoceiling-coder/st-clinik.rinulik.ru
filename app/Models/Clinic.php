<?php

namespace App\Models;

use App\Models\Traits\HasSearchText;
use App\Services\SlotAvailabilityService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Clinic extends Model
{
    use HasSearchText;

    public const STATUSES = ['draft', 'pending', 'approved', 'published', 'rejected', 'hidden', 'blocked'];

    /** @var list<string> */
    public const VISIBLE_STATUSES = ['published'];

    protected $guarded = [];

    protected static function booted(): void
    {
        static::saved(function (self $clinic) {
            if ($clinic->wasChanged(['schedule', 'is_24_7'])) {
                app(SlotAvailabilityService::class)->invalidate($clinic);
            }
        });
    }

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
            'accepts_oms' => 'boolean',
            'has_partial_payment' => 'boolean',
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

    /** Премиум-карточка: включённый бонус с triggers_premium и заполненными текстами в ЛК. */
    public function scopeOrderByCardPremiumFirst(Builder $query): Builder
    {
        $exists = 'EXISTS (
            SELECT 1 FROM clinic_card_bonuses
            INNER JOIN card_bonus_types ON card_bonus_types.id = clinic_card_bonuses.card_bonus_type_id
            WHERE clinic_card_bonuses.clinic_id = clinics.id
            AND clinic_card_bonuses.enabled = ?
            AND LENGTH(TRIM(COALESCE(clinic_card_bonuses.short_label, \'\'))) > 0
            AND LENGTH(TRIM(COALESCE(clinic_card_bonuses.description, \'\'))) > 0
            AND card_bonus_types.is_active = ?
            AND card_bonus_types.triggers_premium = ?
        )';

        return $query->orderByRaw("({$exists}) DESC", [true, true, true]);
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

    public function posts(): HasMany
    {
        return $this->hasMany(ClinicPost::class)->orderByDesc('is_pinned')->orderBy('sort')->orderByDesc('id');
    }

    /** Активные акции для карточки в каталоге (ограничение — в eager load). */
    public function cardPromos(): HasMany
    {
        return $this->hasMany(ClinicPost::class);
    }

    /** Строки прайса для авто-офферов на карточке (фильтр — в eager load). */
    public function cardOfferServices(): HasMany
    {
        return $this->hasMany(ClinicService::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    public function cardBonuses(): HasMany
    {
        return $this->hasMany(ClinicCardBonus::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class);
    }
}
