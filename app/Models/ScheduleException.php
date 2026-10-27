<?php

namespace App\Models;

use App\Services\SlotAvailabilityService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ScheduleException extends Model
{
    use HasFactory;

    public const KINDS = [
        'day_off' => 'Выходной',
        'vacation' => 'Отпуск',
        'hours' => 'Другие часы',
    ];

    protected $guarded = [];

    protected static function booted(): void
    {
        $invalidate = fn (self $exception) => app(SlotAvailabilityService::class)->invalidate($exception->clinic_id);

        static::saved($invalidate);
        static::deleted($invalidate);
    }

    protected function casts(): array
    {
        return [
            'date_from' => 'date',
            'date_to' => 'date',
        ];
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }
}
