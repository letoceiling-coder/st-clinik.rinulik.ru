<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Заявка «Подключиться» со страницы КП. */
class OfferApplication extends Model
{
    public const STATUSES = [
        'new' => 'Новая',
        'in_progress' => 'В работе',
        'connected' => 'Подключена',
        'rejected' => 'Отказ',
    ];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['consent_at' => 'datetime', 'processed_at' => 'datetime'];
    }

    public function offer(): BelongsTo
    {
        return $this->belongsTo(Offer::class);
    }

    public function processor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}
