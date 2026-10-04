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
            'name' => 'Подъём в каталоге «Рекомендуем»',
            'description' => 'Блок «Рекомендуем» вверху каталога и приоритет в списке. Покупается отдельно при активном пакете публикации.',
            'duration_days' => 30,
            'requires_moderation' => false,
            'is_active' => true,
            'sort' => 10,
        ]);

        $bannerHome = PromotionProduct::updateOrCreate(['code' => 'banner_home'], [
            'name' => 'Рекламный баннер на главной',
            'description' => 'Баннер на главной странице города. Покупается отдельно при активном пакете публикации.',
            'duration_days' => 30,
            'requires_moderation' => true,
            'is_active' => true,
            'sort' => 20,
        ]);

        $bannerCatalog = PromotionProduct::updateOrCreate(['code' => 'banner_catalog'], [
            'name' => 'Рекламный баннер в каталоге',
            'description' => 'Баннер над списком клиник. Покупается отдельно при активном пакете публикации.',
            'duration_days' => 30,
            'requires_moderation' => true,
            'is_active' => true,
            'sort' => 30,
        ]);

        PromotionPackage::query()->whereIn('code', ['start', 'growth', 'max'])->each(function (PromotionPackage $legacy) {
            $legacy->products()->detach();
            $legacy->update(['is_active' => false]);
        });

        $publish1m = PromotionPackage::updateOrCreate(['code' => 'publish_1m'], [
            'name' => 'Публикация 1 месяц',
            'description' => 'Право на размещение клиники в каталоге на 30 дней.',
            'duration_days' => 30,
            'is_active' => true,
            'sort' => 10,
        ]);
        $publish1m->products()->detach();

        $publish6m = PromotionPackage::updateOrCreate(['code' => 'publish_6m'], [
            'name' => 'Публикация 6 месяцев',
            'description' => 'Право на размещение клиники в каталоге на 180 дней.',
            'duration_days' => 180,
            'is_active' => true,
            'sort' => 20,
        ]);
        $publish6m->products()->detach();

        $publish12m = PromotionPackage::updateOrCreate(['code' => 'publish_12m'], [
            'name' => 'Публикация 12 месяцев',
            'description' => 'Право на размещение клиники в каталоге на 365 дней.',
            'duration_days' => 365,
            'is_active' => true,
            'sort' => 30,
        ]);
        $publish12m->products()->detach();

        PromotionSetting::updateOrCreate(['city_id' => null], [
            'max_boost' => 3,
            'max_banner_home' => 1,
            'max_banner_catalog' => 2,
        ]);

        $defaultPrices = [
            ['product', $boost->id, 490000],
            ['product', $bannerHome->id, 990000],
            ['product', $bannerCatalog->id, 790000],
            ['package', $publish1m->id, 299000],
            ['package', $publish6m->id, 1490000],
            ['package', $publish12m->id, 2490000],
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
                ['package', $publish1m->id, 499000],
                ['package', $publish6m->id, 2490000],
                ['package', $publish12m->id, 4490000],
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
