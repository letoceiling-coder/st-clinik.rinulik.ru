<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Lead extends Model
{
    /** Путь заявки: новая → связались / не дозвонились → подтверждена (записан) → приём состоялся / не пришёл; отказ — на любом шаге. */
    public const STATUSES = [
        'new' => 'Новая',
        'contacted' => 'Связались',
        'no_answer' => 'Не дозвонились',
        'confirmed' => 'Подтверждена',
        'completed' => 'Приём состоялся',
        'cancelled' => 'Отменена',
        'no_show' => 'Не пришёл',
    ];

    /** Заявки, которые ещё требуют действий клиники. */
    public const ACTIVE_STATUSES = ['new', 'contacted', 'no_answer'];

    public const CANCEL_REASONS = [
        'price' => 'Не устроила цена',
        'other_clinic' => 'Выбрал другую клинику',
        'not_reached' => 'Не удалось связаться',
        'changed_mind' => 'Передумал или решил позже',
        'not_our_service' => 'Нет нужной услуги',
        'duplicate' => 'Дубль или ошибочная заявка',
        'other' => 'Другое',
    ];

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'preferred_date' => 'date',
            'consent_at' => 'datetime',
            'is_child' => 'boolean',
            'assistant_broadcast' => 'boolean',
            'first_response_at' => 'datetime',
            'callback_at' => 'datetime',
        ];
    }

    /** Первое действие клиники по заявке — для показателя «скорость ответа». */
    public function markResponded(): void
    {
        if ($this->first_response_at === null) {
            $this->forceFill(['first_response_at' => now()])->save();
        }
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
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
