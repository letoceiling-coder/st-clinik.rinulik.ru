<?php

namespace App\Models;

use App\Services\SlotAvailabilityService;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoctorSchedule extends Model
{
    use HasFactory;

    public const SLOT_MINUTES = [15, 20, 30, 45, 60];

    protected $guarded = [];

    protected static function booted(): void
    {
        $invalidate = fn (self $schedule) => app(SlotAvailabilityService::class)->invalidate($schedule->clinic_id);

        static::saved($invalidate);
        static::deleted($invalidate);
    }

    protected function casts(): array
    {
        return [
            'weekday' => 'integer',
            'slot_minutes' => 'integer',
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
