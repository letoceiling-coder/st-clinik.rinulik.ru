<?php

namespace Database\Seeders;

use App\Models\Clinic;
use App\Models\ClinicPost;
use Illuminate\Database\Seeder;

/** Демо-акции для карточек, если в ЛК ещё не заведены публикации типа «Акция». */
class ClinicCardPromoBackfillSeeder extends Seeder
{
    /** @var list<array{title: string, slug: string}> */
    private const TEMPLATES = [
        ['title' => 'Бесплатная консультация', 'slug' => 'besplatnaya-konsultaciya'],
        ['title' => 'Кешбэк при первой оплате', 'slug' => 'keshbek-pervaya-oplata'],
        ['title' => 'Скидка на лечение', 'slug' => 'skidka-na-lechenie'],
    ];

    public function run(): void
    {
        Clinic::query()->published()->orderBy('id')->each(function (Clinic $clinic): void {
            $hasActivePromo = ClinicPost::query()
                ->where('clinic_id', $clinic->id)
                ->where('type', 'promo')
                ->published()
                ->active()
                ->exists();

            if ($hasActivePromo) {
                return;
            }

            $count = 1 + ($clinic->id % 3);

            foreach (array_slice(self::TEMPLATES, 0, $count) as $i => $template) {
                ClinicPost::query()->firstOrCreate(
                    ['clinic_id' => $clinic->id, 'slug' => $template['slug']],
                    [
                        'type' => 'promo',
                        'title' => $template['title'],
                        'excerpt' => 'Акция для пациентов клиники. Подробности у администратора.',
                        'body' => 'Условия акции уточняйте при записи. Информация на сайте не является публичной офертой.',
                        'starts_at' => now()->subWeek(),
                        'ends_at' => now()->addMonths(6),
                        'is_pinned' => $i === 0,
                        'status' => 'published',
                        'sort' => ($i + 1) * 10,
                    ],
                );
            }
        });
    }
}
