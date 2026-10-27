<?php

namespace App\Models;

use App\Services\SlotAvailabilityService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Appointment extends Model
{
    use HasFactory;

    public const STATUSES = [
        'new' => 'Новая',
        'pending' => 'Ждёт подтверждения переноса',
        'confirmed' => 'Подтверждена',
        'rescheduled' => 'Перенесена',
        'completed' => 'Приём состоялся',
        'cancelled' => 'Отменена',
        'no_show' => 'Не пришёл',
    ];

    /** Статусы, при которых время врача занято. */
    public const ACTIVE = ['new', 'pending', 'confirmed', 'rescheduled'];

    /** @var array<string, list<string>> */
    public const TRANSITIONS = [
        'new' => ['confirmed', 'rescheduled', 'cancelled', 'completed', 'no_show'],
        'pending' => ['confirmed', 'rescheduled', 'cancelled'],
        'confirmed' => ['rescheduled', 'pending', 'cancelled', 'completed', 'no_show'],
        'rescheduled' => ['confirmed', 'rescheduled', 'pending', 'cancelled', 'completed', 'no_show'],
        'completed' => ['no_show'],
        'no_show' => ['completed'],
        'cancelled' => [],
    ];

    public const SOURCES = [
        'online' => 'Онлайн-запись',
        'manual' => 'Добавлена клиникой',
        'lead' => 'Из заявки',
    ];

    protected $guarded = [];

    protected static function booted(): void
    {
        $invalidate = fn (self $appointment) => app(SlotAvailabilityService::class)->invalidate($appointment->clinic_id);

        static::saved($invalidate);
        static::deleted($invalidate);
    }

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'requested_starts_at' => 'datetime',
            'requested_ends_at' => 'datetime',
            'consent_at' => 'datetime',
            'is_child' => 'boolean',
        ];
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

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function history(): HasMany
    {
        return $this->hasMany(AppointmentStatusChange::class)->orderBy('id');
    }

    /** @param  Builder<self>  $query */
    public function scopeActive(Builder $query): void
    {
        $query->whereIn('status', self::ACTIVE);
    }

    public function isActive(): bool
    {
        return in_array($this->status, self::ACTIVE, true);
    }

    public function canTransitionTo(string $status): bool
    {
        return in_array($status, self::TRANSITIONS[$this->status] ?? [], true);
    }

    public function canBeCancelledByPatient(): bool
    {
        return $this->isActive() && $this->starts_at->isFuture();
    }

    public function canBeRescheduledByPatient(): bool
    {
        return in_array($this->status, ['new', 'confirmed', 'rescheduled'], true) && $this->starts_at->isFuture();
    }

    public function statusLabel(): string
    {
        return self::STATUSES[$this->status] ?? $this->status;
    }
}
