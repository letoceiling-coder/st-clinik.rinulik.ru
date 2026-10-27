<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadDispatch extends Model
{
    public const STATUSES = [
        'sent' => 'Отправлен',
        'viewed' => 'Просмотрен',
        'accepted' => 'В работе',
        'declined' => 'Отклонён',
        'expired' => 'Истёк',
    ];

    /** @var list<string> */
    protected $fillable = [
        'lead_id',
        'clinic_id',
        'status',
        'viewed_at',
        'accepted_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'viewed_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }
}
