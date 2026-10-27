<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CardBonusType extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'triggers_premium' => 'boolean',
            'requires_calendar' => 'boolean',
        ];
    }

    public function clinicBonuses(): HasMany
    {
        return $this->hasMany(ClinicCardBonus::class);
    }
}
