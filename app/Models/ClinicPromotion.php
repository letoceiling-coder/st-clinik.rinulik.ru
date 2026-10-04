<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicPromotion extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(PromotionOrder::class, 'order_id');
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    /** @param Builder<self> $query */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active')
            ->where(fn (Builder $q) => $q->whereNull('ends_at')->orWhere('ends_at', '>', now()));
    }
}
