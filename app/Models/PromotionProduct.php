<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class PromotionProduct extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'requires_moderation' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function packages(): BelongsToMany
    {
        return $this->belongsToMany(PromotionPackage::class, 'promotion_package_product', 'product_id', 'package_id');
    }

    public function prices(): MorphMany
    {
        return $this->morphMany(PromotionPrice::class, 'priceable');
    }

    public function isBanner(): bool
    {
        return str_starts_with($this->code, 'banner_');
    }
}
