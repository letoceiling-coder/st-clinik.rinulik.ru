<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PromotionOrder extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'payment_meta' => 'array',
            'paid_at' => 'datetime',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function promotions(): HasMany
    {
        return $this->hasMany(ClinicPromotion::class, 'order_id');
    }

    public function isPaid(): bool
    {
        return $this->status === 'paid';
    }

    public function needsModeration(): bool
    {
        return $this->moderation_status === 'pending';
    }
}
