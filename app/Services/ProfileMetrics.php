<?php

namespace App\Services;

use App\Models\Clinic;
use App\Models\Doctor;

/**
 * Пересчёт кешируемых показателей: рейтинг, число отзывов, минимальная цена,
 * стаж и «полнота профиля» клиники.
 */
class ProfileMetrics
{
    public function recalcDoctor(Doctor $doctor): void
    {
        $stats = $doctor->reviews()->where('status', 'published')
            ->selectRaw('count(*) as c, avg(rating) as r')->first();

        $doctor->forceFill([
            'reviews_count' => (int) ($stats->c ?? 0),
            'rating' => $stats?->c ? round((float) $stats->r, 2) : 0,
        ])->save();
    }

    public function recalcClinic(Clinic $clinic): void
    {
        $stats = $clinic->reviews()->where('status', 'published')
            ->selectRaw('count(*) as c, avg(rating) as r')->first();

        $doctors = $clinic->doctors()->where('status', 'published');
        $minPrice = $clinic->clinicServices()->where('price_from', '>', 0)->min('price_from');

        $clinic->forceFill([
            'reviews_count' => (int) ($stats->c ?? 0),
            'rating' => $stats?->c ? round((float) $stats->r, 2) : 0,
            'doctors_count' => (clone $doctors)->count(),
            'max_experience' => (int) ((clone $doctors)->max('experience_years') ?? 0),
            'min_price' => $minPrice,
        ])->save();

        $clinic->forceFill(['completeness' => $this->completeness($clinic)['percent']])->save();
    }

    /**
     * @return array{percent:int, items:list<array{key:string,label:string,done:bool,weight:int}>}
     */
    public function completeness(Clinic $clinic): array
    {
        $approvedLicense = $clinic->documents()->where('type', 'license')->where('status', 'approved')->exists();

        $items = [
            ['key' => 'description', 'label' => 'Описание клиники (от 200 знаков)', 'done' => mb_strlen((string) $clinic->description) >= 200, 'weight' => 10],
            ['key' => 'contacts', 'label' => 'Телефон и адрес', 'done' => filled($clinic->phone) && filled($clinic->address), 'weight' => 8],
            ['key' => 'geo', 'label' => 'Координаты на карте', 'done' => $clinic->lat !== null && $clinic->lng !== null, 'weight' => 4],
            ['key' => 'schedule', 'label' => 'График работы', 'done' => ! empty($clinic->schedule), 'weight' => 10],
            ['key' => 'photos', 'label' => 'Минимум 3 фото', 'done' => $clinic->photos()->where('status', 'approved')->count() >= 3, 'weight' => 15],
            ['key' => 'license', 'label' => 'Подтверждённая лицензия', 'done' => $approvedLicense, 'weight' => 15],
            ['key' => 'services', 'label' => 'Не менее 5 услуг с ценами', 'done' => $clinic->clinicServices()->count() >= 5, 'weight' => 15],
            ['key' => 'doctors', 'label' => 'Не менее 2 врачей', 'done' => $clinic->doctors()->where('status', '!=', 'rejected')->count() >= 2, 'weight' => 10],
            ['key' => 'payment', 'label' => 'Способы оплаты', 'done' => ! empty($clinic->payment_methods), 'weight' => 4],
            ['key' => 'restrictions', 'label' => 'Ограничения приёма', 'done' => filled($clinic->restrictions), 'weight' => 5],
            ['key' => 'achievements', 'label' => 'Достижения и награды', 'done' => ! empty($clinic->achievements), 'weight' => 4],
        ];

        $percent = (int) array_sum(array_map(fn ($i) => $i['done'] ? $i['weight'] : 0, $items));

        return ['percent' => $percent, 'items' => $items];
    }
}
