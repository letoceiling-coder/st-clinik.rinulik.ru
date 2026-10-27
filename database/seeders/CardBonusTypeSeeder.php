<?php

namespace Database\Seeders;

use App\Models\CardBonusType;
use Illuminate\Database\Seeder;

class CardBonusTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            [
                'code' => 'free_consult',
                'name' => 'Бесплатная консультация',
                'default_short_label' => 'Бесплатная консультация',
                'icon' => 'user',
                'placement' => 'strip',
                'triggers_premium' => false,
                'requires_calendar' => false,
                'sort' => 10,
            ],
            [
                'code' => 'treatment_discount',
                'name' => 'Скидка на лечение',
                'default_short_label' => 'Скидка на лечение',
                'icon' => 'percent',
                'placement' => 'strip',
                'triggers_premium' => true,
                'requires_calendar' => false,
                'sort' => 20,
            ],
            [
                'code' => 'cashback',
                'name' => 'Кешбэк',
                'default_short_label' => 'Кешбэк при первой оплате',
                'icon' => 'card',
                'placement' => 'strip',
                'triggers_premium' => true,
                'requires_calendar' => false,
                'sort' => 30,
            ],
            [
                'code' => 'same_day',
                'name' => 'Запись на сегодня',
                'default_short_label' => 'Запись на сегодня',
                'icon' => 'flash',
                'placement' => 'features',
                'triggers_premium' => false,
                'requires_calendar' => true,
                'sort' => 40,
            ],
        ];

        foreach ($types as $row) {
            CardBonusType::query()->updateOrCreate(
                ['code' => $row['code']],
                array_merge($row, ['is_active' => true]),
            );
        }
    }
}
