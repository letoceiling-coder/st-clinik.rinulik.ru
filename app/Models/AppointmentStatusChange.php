<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppointmentStatusChange extends Model
{
    public const ACTORS = [
        'patient' => 'Пациент',
        'clinic' => 'Клиника',
        'system' => 'Система',
    ];

    public const UPDATED_AT = null;

    protected $table = 'appointment_status_history';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'created_at' => 'datetime',
        ];
    }

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
