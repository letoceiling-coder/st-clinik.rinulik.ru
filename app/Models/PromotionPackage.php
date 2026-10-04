<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class PromotionPackage extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(PromotionProduct::class, 'promotion_package_product', 'package_id', 'product_id');
    }

    public function prices(): MorphMany
    {
        return $this->morphMany(PromotionPrice::class, 'priceable');
    }

    public function hasBanner(): bool
    {
        return $this->products->contains(fn (PromotionProduct $p) => $p->isBanner());
    }
}
