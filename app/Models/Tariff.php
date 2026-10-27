<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tariff extends Model
{
    public const FEATURE_ONLINE_BOOKING = 'online_booking';

    public const FEATURE_STATISTICS = 'statistics';

    public const FEATURE_PROMOTIONS = 'promotions';

    public const FEATURE_ASSISTANT_LEADS = 'assistant_leads';

    public const FEATURE_ADVERTISING = 'advertising';

    /** @var array<string, string> */
    public const FEATURE_LABELS = [
        self::FEATURE_ONLINE_BOOKING => 'Онлайн-запись',
        self::FEATURE_STATISTICS => 'Статистика',
        self::FEATURE_PROMOTIONS => 'Продвижение',
        self::FEATURE_ASSISTANT_LEADS => 'Лиды ассистента',
        self::FEATURE_ADVERTISING => 'Реклама',
    ];

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'features' => 'array',
            'is_active' => 'boolean',
            'is_default' => 'boolean',
        ];
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(ClinicSubscription::class);
    }

    public function hasFeature(string $key): bool
    {
        $features = $this->features ?? [];

        return in_array($key, $features, true);
    }

    public function priceRubles(): float
    {
        return round($this->price / 100, 2);
    }
}
