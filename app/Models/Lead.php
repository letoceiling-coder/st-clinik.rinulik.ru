<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
        return ['preferred_date' => 'date', 'consent_at' => 'datetime', 'is_child' => 'boolean'];
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
}
