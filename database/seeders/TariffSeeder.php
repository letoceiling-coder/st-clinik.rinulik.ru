<?php

namespace Database\Seeders;

use App\Models\Tariff;
use Illuminate\Database\Seeder;

class TariffSeeder extends Seeder
{
    public function run(): void
    {
        $baseFeatures = [Tariff::FEATURE_ONLINE_BOOKING];

        Tariff::updateOrCreate(['slug' => 'base'], [
            'name' => 'Базовый',
            'description' => 'Бесплатный тариф для черновика и ограниченного размещения.',
            'price' => 0,
            'duration_days' => 3650,
            'max_branches' => 1,
            'max_doctors' => 3,
            'max_photos' => 10,
            'features' => $baseFeatures,
            'is_active' => true,
            'is_default' => true,
            'sort' => 10,
        ]);

        Tariff::updateOrCreate(['slug' => 'standard'], [
            'name' => 'Стандарт',
            'description' => 'Публикация в каталоге, онлайн-запись и статистика на 30 дней.',
            'price' => 299000,
            'duration_days' => 30,
            'max_branches' => 3,
            'max_doctors' => 15,
            'max_photos' => 50,
            'features' => array_merge($baseFeatures, [
                Tariff::FEATURE_STATISTICS,
                Tariff::FEATURE_PROMOTIONS,
            ]),
            'is_active' => true,
            'is_default' => false,
            'sort' => 20,
        ]);

        Tariff::updateOrCreate(['slug' => 'business'], [
            'name' => 'Бизнес',
            'description' => 'Расширенные лимиты, лиды ассистента и реклама на 180 дней.',
            'price' => 1490000,
            'duration_days' => 180,
            'max_branches' => 10,
            'max_doctors' => 50,
            'max_photos' => 200,
            'features' => array_merge($baseFeatures, [
                Tariff::FEATURE_STATISTICS,
                Tariff::FEATURE_PROMOTIONS,
                Tariff::FEATURE_ASSISTANT_LEADS,
                Tariff::FEATURE_ADVERTISING,
            ]),
            'is_active' => true,
            'is_default' => false,
            'sort' => 30,
        ]);

        Tariff::updateOrCreate(['slug' => 'premium'], [
            'name' => 'Премиум',
            'description' => 'Максимальные лимиты и все функции на 365 дней.',
            'price' => 2490000,
            'duration_days' => 365,
            'max_branches' => null,
            'max_doctors' => null,
            'max_photos' => null,
            'features' => array_merge($baseFeatures, [
                Tariff::FEATURE_STATISTICS,
                Tariff::FEATURE_PROMOTIONS,
                Tariff::FEATURE_ASSISTANT_LEADS,
                Tariff::FEATURE_ADVERTISING,
            ]),
            'is_active' => true,
            'is_default' => false,
            'sort' => 40,
        ]);
    }
}
