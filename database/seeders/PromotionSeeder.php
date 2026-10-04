<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\PromotionPackage;
use App\Models\PromotionPrice;
use App\Models\PromotionProduct;
use App\Models\PromotionSetting;
use Illuminate\Database\Seeder;

class PromotionSeeder extends Seeder
{
    public function run(): void
    {
        $boost = PromotionProduct::updateOrCreate(['code' => 'boost'], [
            'name' => 'Буст «Рекомендуем»',
            'description' => 'Блок «Рекомендуем» вверху каталога и приоритет в списке.',
            'duration_days' => 30,
            'requires_moderation' => false,
            'is_active' => true,
            'sort' => 10,
        ]);

        $bannerHome = PromotionProduct::updateOrCreate(['code' => 'banner_home'], [
            'name' => 'Баннер на главной',
            'description' => 'Баннер на главной странице города.',
            'duration_days' => 30,
            'requires_moderation' => true,
            'is_active' => true,
            'sort' => 20,
        ]);

        $bannerCatalog = PromotionProduct::updateOrCreate(['code' => 'banner_catalog'], [
            'name' => 'Баннер в каталоге',
            'description' => 'Баннер над списком клиник.',
            'duration_days' => 30,
            'requires_moderation' => true,
            'is_active' => true,
            'sort' => 30,
        ]);

        $start = PromotionPackage::updateOrCreate(['code' => 'start'], [
            'name' => 'Старт',
            'description' => 'Базовое продвижение в каталоге.',
            'duration_days' => 30,
            'is_active' => true,
            'sort' => 10,
        ]);
        $start->products()->sync([$boost->id]);

        $growth = PromotionPackage::updateOrCreate(['code' => 'growth'], [
            'name' => 'Продвижение',
            'description' => 'Буст и баннер в каталоге.',
            'duration_days' => 30,
            'is_active' => true,
            'sort' => 20,
        ]);
        $growth->products()->sync([$boost->id, $bannerCatalog->id]);

        $max = PromotionPackage::updateOrCreate(['code' => 'max'], [
            'name' => 'Максимум',
            'description' => 'Полный набор: буст и баннеры на главной и в каталоге.',
            'duration_days' => 30,
            'is_active' => true,
            'sort' => 30,
        ]);
        $max->products()->sync([$boost->id, $bannerHome->id, $bannerCatalog->id]);

        PromotionSetting::updateOrCreate(['city_id' => null], [
            'max_boost' => 3,
            'max_banner_home' => 1,
            'max_banner_catalog' => 2,
        ]);

        $defaultPrices = [
            ['product', $boost->id, 490000],
            ['product', $bannerHome->id, 990000],
            ['product', $bannerCatalog->id, 790000],
            ['package', $start->id, 449000],
            ['package', $growth->id, 1090000],
            ['package', $max->id, 1790000],
        ];

        foreach ($defaultPrices as [$type, $id, $price]) {
            PromotionPrice::updateOrCreate(
                ['priceable_type' => $type, 'priceable_id' => $id, 'city_id' => null],
                ['price' => $price, 'is_active' => true],
            );
        }

        $moscow = City::query()->where('slug', 'moskva')->first();
        if ($moscow) {
            PromotionSetting::updateOrCreate(['city_id' => $moscow->id], [
                'max_boost' => 5,
                'max_banner_home' => 2,
                'max_banner_catalog' => 3,
            ]);

            $moscowPrices = [
                ['product', $boost->id, 690000],
                ['product', $bannerHome->id, 1490000],
                ['product', $bannerCatalog->id, 1190000],
                ['package', $start->id, 649000],
                ['package', $growth->id, 1590000],
                ['package', $max->id, 2490000],
            ];

            foreach ($moscowPrices as [$type, $id, $price]) {
                PromotionPrice::updateOrCreate(
                    ['priceable_type' => $type, 'priceable_id' => $id, 'city_id' => $moscow->id],
                    ['price' => $price, 'is_active' => true],
                );
            }
        }
    }
}
