<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Lead extends Model
{
    public const STATUSES = [
        'new' => 'Новая',
        'confirmed' => 'Подтверждена',
        'completed' => 'Приём состоялся',
        'cancelled' => 'Отменена',
        'no_show' => 'Не пришёл',
    ];

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'preferred_date' => 'date',
            'consent_at' => 'datetime',
            'is_child' => 'boolean',
            'assistant_broadcast' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function concern(): BelongsTo
    {
        return $this->belongsTo(Concern::class);
    }

    public function appointment(): HasOne
    {
        return $this->hasOne(Appointment::class);
    }

    public function dispatches(): HasMany
    {
        return $this->hasMany(LeadDispatch::class);
    }

    public function visibleForClinicId(int $clinicId): bool
    {
        if ((int) $this->clinic_id === $clinicId) {
            return true;
        }

        return $this->dispatches()->where('clinic_id', $clinicId)->exists();
    }
}
