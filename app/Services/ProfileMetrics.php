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

        $internalReviews = (int) ($stats->c ?? 0);
        if ($internalReviews > 0) {
            $reviewsCount = $internalReviews;
            $rating = round((float) $stats->r, 2);
        } else {
            $reviewsCount = (int) $clinic->reviews_count;
            $rating = (float) $clinic->rating;
        }

        $doctors = $clinic->doctors()->where('status', 'published');
        $minPrice = $clinic->clinicServices()->where('price_from', '>', 0)->min('price_from');

        $clinic->forceFill([
            'reviews_count' => $reviewsCount,
            'rating' => $rating,
            'doctors_count' => (clone $doctors)->count(),
            'max_experience' => (int) ((clone $doctors)->max('experience_years') ?? 0),
            'min_price' => $minPrice,
        ])->save();

        $clinic->forceFill(['completeness' => $this->completeness($clinic)['percent']])->save();
    }

    /**
     * @return array{percent:int, items:list<array{key:string,label:string,done:bool,weight:int}>}
     */
    /**
     * Чек-лист профиля: что сделано, что на проверке, где исправить и зачем это пациентам.
     * Веса не менять без пересчёта: процент влияет на порядок в каталоге.
     *
     * @return array{percent: int, items: list<array{key: string, label: string, done: bool, weight: int, progress: ?string, pending: bool, href: string, why: string}>}
     */
    public function completeness(Clinic $clinic): array
    {
        $approvedLicense = $clinic->documents()->where('type', 'license')->where('status', 'approved')->exists();
        $pendingLicense = ! $approvedLicense && $clinic->documents()->where('type', 'license')->where('status', 'pending')->exists();
        $approvedPhotos = $clinic->photos()->where('status', 'approved')->count();
        $pendingPhotos = $clinic->photos()->where('status', 'pending')->count();
        $services = $clinic->clinicServices()->count();
        $doctors = $clinic->doctors()->where('status', '!=', 'rejected')->count();
        $descriptionLength = mb_strlen((string) $clinic->description);
        $edit = '/clinic-cabinet/branches/'.$clinic->id.'/edit';

        $items = [
            ['key' => 'photos', 'label' => 'Минимум 3 фото', 'done' => $approvedPhotos >= 3, 'weight' => 15,
                'progress' => min($approvedPhotos, 3).' из 3', 'pending' => $approvedPhotos < 3 && $approvedPhotos + $pendingPhotos >= 3,
                'href' => '/clinic-cabinet/photos', 'why' => 'Фасад, ресепшен и кабинет — первое, что смотрит пациент. Карточки без фото открывают заметно реже.'],
            ['key' => 'license', 'label' => 'Подтверждённая лицензия', 'done' => $approvedLicense, 'weight' => 15,
                'progress' => null, 'pending' => $pendingLicense,
                'href' => '/clinic-cabinet/documents', 'why' => 'Отметка «Лицензия подтверждена» на карточке — главный сигнал доверия для пациента.'],
            ['key' => 'services', 'label' => 'Не менее 5 услуг с ценами', 'done' => $services >= 5, 'weight' => 15,
                'progress' => min($services, 5).' из 5', 'pending' => false,
                'href' => '/clinic-cabinet/prices', 'why' => 'По ценам клинику находят в поиске и в AI-ассистенте: без услуги её не покажут по запросу «имплантация».'],
            ['key' => 'description', 'label' => 'Описание клиники (от 200 знаков)', 'done' => $descriptionLength >= 200, 'weight' => 10,
                'progress' => min($descriptionLength, 200).' из 200 знаков', 'pending' => false,
                'href' => $edit, 'why' => 'Расскажите, чем вы сильны: направления, подход, оборудование. Это видят пациенты и поисковики.'],
            ['key' => 'schedule', 'label' => 'График работы', 'done' => ! empty($clinic->schedule), 'weight' => 10,
                'progress' => null, 'pending' => false,
                'href' => '/clinic-cabinet/schedule', 'why' => 'Без графика на сайте нельзя показать «Открыто сейчас» и свободное время для онлайн-записи.'],
            ['key' => 'doctors', 'label' => 'Не менее 2 врачей', 'done' => $doctors >= 2, 'weight' => 10,
                'progress' => min($doctors, 2).' из 2', 'pending' => false,
                'href' => '/clinic-cabinet/doctors', 'why' => 'Пациенты выбирают врача: стаж, специализация и фото повышают число записей.'],
            ['key' => 'contacts', 'label' => 'Телефон и адрес', 'done' => filled($clinic->phone) && filled($clinic->address), 'weight' => 8,
                'progress' => null, 'pending' => false,
                'href' => $edit, 'why' => 'Нужны, чтобы пациент мог позвонить и найти вход.'],
            ['key' => 'restrictions', 'label' => 'Ограничения приёма', 'done' => filled($clinic->restrictions), 'weight' => 5,
                'progress' => null, 'pending' => false,
                'href' => $edit, 'why' => 'Честно о том, кого вы не принимаете, — меньше лишних звонков и отказов.'],
            ['key' => 'geo', 'label' => 'Координаты на карте', 'done' => $clinic->lat !== null && $clinic->lng !== null, 'weight' => 4,
                'progress' => null, 'pending' => false,
                'href' => $edit, 'why' => 'Клиника появится на карте каталога и в подборе «рядом со мной».'],
            ['key' => 'payment', 'label' => 'Способы оплаты', 'done' => ! empty($clinic->payment_methods), 'weight' => 4,
                'progress' => null, 'pending' => false,
                'href' => $edit, 'why' => 'Рассрочка, ДМС и карты — частый вопрос пациентов перед записью.'],
            ['key' => 'achievements', 'label' => 'Достижения и награды', 'done' => ! empty($clinic->achievements), 'weight' => 4,
                'progress' => null, 'pending' => false,
                'href' => $edit, 'why' => 'Сертификаты и награды выделяют карточку среди соседей.'],
        ];

        $percent = (int) array_sum(array_map(fn ($i) => $i['done'] ? $i['weight'] : 0, $items));

        return ['percent' => $percent, 'items' => $items];
    }
}
