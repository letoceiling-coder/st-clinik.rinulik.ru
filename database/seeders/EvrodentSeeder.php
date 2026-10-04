<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\Clinic;
use App\Models\ClinicDocument;
use App\Models\ClinicPhoto;
use App\Models\ClinicPost;
use App\Models\ClinicService;
use App\Models\District;
use App\Models\Doctor;
use App\Models\Service;
use App\Models\Specialty;
use App\Services\ProfileMetrics;
use App\Support\Text;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Заполнение профиля клиники «Евродент» (production: slug evrodent-moskva).
 */
class EvrodentSeeder extends Seeder
{
    public function run(): void
    {
        $clinic = Clinic::query()->where('slug', 'evrodent-moskva')->first()
            ?? Clinic::query()->whereHas('organization', fn ($q) => $q->where('name', 'Евродент'))->first();

        if (! $clinic) {
            $this->command?->error('Клиника «Евродент» не найдена (slug: evrodent-moskva).');

            return;
        }

        DB::transaction(function () use ($clinic) {
            $this->fillMainClinic($clinic);
            $this->fillDoctors($clinic);
            $this->fillPrices($clinic);
            $this->fillPhotos($clinic);
            $this->fillDocuments($clinic);
            $this->fillPosts($clinic);
            $this->fillBranch($clinic);
            app(ProfileMetrics::class)->recalcClinic($clinic->fresh());
        });

        $this->command?->info("Профиль «{$clinic->name}» заполнен (id {$clinic->id}).");
    }

    private function fillMainClinic(Clinic $clinic): void
    {
        $city = $clinic->city ?? City::where('slug', 'moskva')->firstOrFail();
        $district = District::where('city_id', $city->id)->where('slug', 'tverskoy')->first()
            ?? District::where('city_id', $city->id)->firstOrFail();

        $clinic->organization?->update([
            'name' => 'Евродент',
            'legal_name' => 'ООО «Евродент»',
        ]);

        $clinic->update([
            'name' => 'Стоматология «Евродент»',
            'slug' => 'evrodent-moskva',
            'tagline' => 'Современная стоматология для всей семьи в центре Москвы',
            'description' => <<<'TEXT'
Стоматология «Евродент» — многопрофильная клиника в Москве, где можно пройти полный цикл лечения: от профилактики и терапии до имплантации, ортодонтии и эстетической реставрации.

Мы работаем по прозрачному принципу: врач составляет план лечения и заранее называет ориентировочную стоимость «от». Итоговую цену пациент узнаёт после осмотра и диагностики, до начала процедур.

В клинике установлено цифровое КТ, микроскоп для эндодонтии, современные установки и система стерилизации. Принимаем взрослых и детей с 3 лет. Доступна рассрочка и приём по полису ДМС.
TEXT,
            'district_id' => $district->id,
            'address' => 'Москва, ул. Тверская, 12, стр. 1',
            'metro' => 'Тверская',
            'lat' => 55.760106,
            'lng' => 37.609597,
            'phone' => '+7 (495) 123-45-67',
            'email' => 'info@evrodent.ru',
            'website' => 'https://evrodent.ru',
            'founded_year' => 2012,
            'license_number' => 'ЛО-77-01-019876',
            'license_issuer' => 'Департамент здравоохранения города Москвы',
            'license_date' => '2018-03-15',
            'schedule' => [
                'mon' => ['open' => '09:00', 'close' => '21:00'],
                'tue' => ['open' => '09:00', 'close' => '21:00'],
                'wed' => ['open' => '09:00', 'close' => '21:00'],
                'thu' => ['open' => '09:00', 'close' => '21:00'],
                'fri' => ['open' => '09:00', 'close' => '21:00'],
                'sat' => ['open' => '10:00', 'close' => '18:00'],
                'sun' => ['open' => '10:00', 'close' => '16:00'],
            ],
            'payment_methods' => ['Наличные', 'Банковская карта', 'СБП', 'Рассрочка', 'ДМС', 'Справка для налогового вычета'],
            'achievements' => [
                'Сертифицированный партнёр Straumann и Osstem',
                'Рейтинг 4,8 на независимых площадках (2025)',
                'Собственная зуботехническая лаборатория',
            ],
            'restrictions' => 'Принимаем детей с 3 лет. Беременным — приём после консультации врача, рентген только по показаниям. Имплантация — после КТ и оценки противопоказаний.',
            'is_verified' => true,
            'is_24_7' => false,
            'accepts_children' => true,
            'children_age_from' => 3,
            'same_day' => true,
            'has_installment' => true,
            'installment_months' => 12,
            'accepts_dms' => true,
            'has_sedation' => true,
            'has_anesthesia' => false,
            'has_microscope' => true,
            'has_ct' => true,
            'art_seed' => 7,
            'status' => 'published',
        ]);
    }

    private function fillDoctors(Clinic $clinic): void
    {
        $specs = Specialty::pluck('id', 'slug');
        $clinic->doctors()->delete();

        $defs = [
            [
                'name' => 'Козлова Анна Сергеевна',
                'position' => 'Главный врач, стоматолог-терапевт',
                'specs' => ['terapiya', 'endodontiya'],
                'experience' => 14,
                'bio' => 'Ведёт терапевтический и эндодонтический приём. Работает под микроскопом, объясняет план лечения простым языком.',
                'consult' => 0,
                'children' => true,
            ],
            [
                'name' => 'Морозов Дмитрий Игоревич',
                'position' => 'Стоматолог-имплантолог, хирург',
                'specs' => ['implantaciya', 'hirurgiya'],
                'experience' => 11,
                'bio' => 'Проводит имплантацию, костную пластику и хирургические вмешательства. Использует 3D-планирование по КТ.',
                'consult' => 0,
                'children' => false,
            ],
            [
                'name' => 'Сидорова Елена Владимировна',
                'position' => 'Стоматолог-ортodont',
                'specs' => ['ortodontiya'],
                'experience' => 9,
                'bio' => 'Исправление прикуса брекетами и элайнерами. Составляет цифровой план лечения с прогнозом сроков.',
                'consult' => 1500,
                'children' => true,
            ],
            [
                'name' => 'Петрова Мария Александровна',
                'position' => 'Детский стоматолог',
                'specs' => ['detskaya', 'terapiya'],
                'experience' => 7,
                'bio' => 'Адаптационные приёмы, лечение кариеса у детей, герметизация фиссур. Мягкий подход и игровая форма общения.',
                'consult' => 800,
                'children' => true,
            ],
        ];

        $clinicSpecIds = [];
        foreach ($defs as $i => $def) {
            $ids = array_values(array_filter(array_map(fn ($s) => $specs[$s] ?? null, $def['specs'])));
            $clinicSpecIds = array_merge($clinicSpecIds, $ids);

            $doctor = Doctor::create([
                'clinic_id' => $clinic->id,
                'name' => $def['name'],
                'slug' => Text::slug($def['name'].'-'.$clinic->id),
                'position' => $def['position'],
                'experience_years' => $def['experience'],
                'bio' => $def['bio'],
                'education' => [
                    'Первый МГМУ им. Сеченова, стоматологический факультет',
                    'Ординатура по профилю «Стоматология»',
                    'Повышение квалификации, 2024',
                ],
                'achievements' => $i === 0 ? ['Член Стоматологической ассоциации России'] : [],
                'schedule_days' => ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'],
                'is_verified' => true,
                'accepts_children' => $def['children'],
                'children_age_from' => $def['children'] ? 3 : null,
                'consult_price' => $def['consult'],
                'art_seed' => $i + 3,
                'status' => 'published',
                'rating' => 4.7 + ($i * 0.05),
                'reviews_count' => 0,
            ]);
            $doctor->specialties()->sync($ids);
        }

        $clinic->specialties()->sync(array_values(array_unique($clinicSpecIds)));
    }

    private function fillPrices(Clinic $clinic): void
    {
        $services = Service::whereIn('slug', [
            'konsultaciya-stomatologa',
            'lechenie-kariesa',
            'lechenie-pulpita',
            'udalenie-zuba-prostoe',
            'implant-standart',
            'sinus-lifting',
            'bregety-metall',
            'elaynery',
            'koronka-cirkoniy',
            'professionalnaya-chistka',
            'otbelivanie-ofisnoe',
            'lechenie-molochnogo-zuba',
        ])->pluck('id', 'slug');

        $rows = [
            'konsultaciya-stomatologa' => [0, null, false],
            'lechenie-kariesa' => [4500, 6500, false],
            'lechenie-pulpita' => [8500, 12000, false],
            'udalenie-zuba-prostoe' => [3500, null, false],
            'implant-standart' => [32000, 45000, true],
            'sinus-lifting' => [38000, null, false],
            'bregety-metall' => [52000, null, false],
            'elaynery' => [180000, null, false],
            'koronka-cirkoniy' => [28000, 35000, false],
            'professionalnaya-chistka' => [6500, null, true],
            'otbelivanie-ofisnoe' => [18000, null, true],
            'lechenie-molochnogo-zuba' => [3200, null, false],
        ];

        ClinicService::where('clinic_id', $clinic->id)->delete();

        foreach ($rows as $slug => [$from, $to, $promo]) {
            $serviceId = $services[$slug] ?? null;
            if (! $serviceId) {
                continue;
            }
            ClinicService::create([
                'clinic_id' => $clinic->id,
                'service_id' => $serviceId,
                'price_from' => $from,
                'price_to' => $to,
                'is_promo' => $promo,
            ]);
        }
    }

    private function fillPhotos(Clinic $clinic): void
    {
        $clinic->photos()->delete();

        $photos = [
            ['t1.jpg', 'exterior', 'Фасад клиники на Тверской', 10],
            ['t2.jpg', 'reception', 'Зона ресепшн', 20],
            ['t3.jpg', 'interior', 'Кабинет врача', 30],
            ['t4.jpg', 'equipment', 'Цифровое КТ и диагностика', 40],
            ['t5.jpg', 'team', 'Команда «Евродент»', 50],
            ['t6.jpg', 'interior', 'Зона ожидания', 60],
        ];

        foreach ($photos as [$file, $kind, $caption, $sort]) {
            $path = $this->copyDemoImage($clinic->id, $file);
            ClinicPhoto::create([
                'clinic_id' => $clinic->id,
                'kind' => $kind,
                'caption' => $caption,
                'path' => $path,
                'art_seed' => $sort,
                'status' => 'approved',
                'sort' => $sort,
            ]);
        }
    }

    private function fillDocuments(Clinic $clinic): void
    {
        $clinic->documents()->delete();

        ClinicDocument::create([
            'clinic_id' => $clinic->id,
            'type' => 'license',
            'title' => 'Лицензия на медицинскую деятельность',
            'number' => $clinic->license_number,
            'issued_at' => $clinic->license_date,
            'status' => 'approved',
        ]);

        ClinicDocument::create([
            'clinic_id' => $clinic->id,
            'type' => 'certificate',
            'title' => 'Сертификат соответствия стерилизации',
            'number' => 'СТ-77-2024-0042',
            'issued_at' => '2024-01-20',
            'status' => 'approved',
        ]);
    }

    private function fillPosts(Clinic $clinic): void
    {
        ClinicPost::where('clinic_id', $clinic->id)->delete();

        $posts = [
            [
                'type' => 'promo',
                'title' => 'Скидка 20% на профессиональную гигиену',
                'slug' => 'skidka-20-gigiena',
                'excerpt' => 'Комплексная чистка Air Flow + ультразвук со скидкой до конца месяца.',
                'body' => "Акция для новых и постоянных пациентов: скидка 20% на профессиональную гигиену полости рта.\n\nВ стоимость входят осмотр, удаление мягкого налёта и зубного камня, полировка и рекомендации по домашнему уходу. Запись по телефону или через форму на сайте.",
                'starts_at' => now()->startOfMonth(),
                'ends_at' => now()->endOfMonth(),
                'is_pinned' => true,
                'image' => 't4.jpg',
            ],
            [
                'type' => 'news',
                'title' => 'Открыли новый кабинет с цифровым КТ',
                'slug' => 'novyj-kabinet-kt',
                'excerpt' => 'Диагностика стала быстрее — снимок и 3D-модель за один визит.',
                'body' => "В клинике заработал обновлённый диагностический кабинет с цифровым КТ последнего поколения.\n\nСнимок нужен для планирования имплантации, удаления зубов мудрости и сложного лечения. Врач покажет 3D-модель и объяснит план лечения на экране.",
                'starts_at' => null,
                'ends_at' => null,
                'is_pinned' => false,
                'image' => 't3.jpg',
            ],
            [
                'type' => 'promo',
                'title' => 'Бесплатная консультация имплантолога',
                'slug' => 'besplatnaya-konsultaciya-implantologa',
                'excerpt' => 'Осмотр, оценка объёма лечения и ориентировочная смета — без оплаты.',
                'body' => "Запишитесь на бесплатную консультацию имплантолога до конца квартала.\n\nНа приёме врач оценит состояние костной ткани, расскажет о вариантах имплантации и назовёт ориентировочную стоимость. КТ оплачивается отдельно при необходимости.",
                'starts_at' => now(),
                'ends_at' => now()->addMonths(3)->endOfMonth(),
                'is_pinned' => false,
                'image' => 't2.jpg',
            ],
            [
                'type' => 'news',
                'title' => 'Расширенный график по субботам',
                'slug' => 'grafik-subbota',
                'excerpt' => 'Теперь принимаем до 18:00 — удобно для занятых пациентов.',
                'body' => "С сентября клиника работает по субботам с 10:00 до 18:00.\n\nЗапись доступна на терапию, гигиену, консультации ортодонта и детского стоматолога. Воскресенье — с 10:00 до 16:00.",
                'starts_at' => null,
                'ends_at' => null,
                'is_pinned' => false,
                'image' => null,
            ],
        ];

        foreach ($posts as $i => $post) {
            $imagePath = $post['image'] ? $this->copyDemoImage($clinic->id, $post['image'], 'posts') : null;
            ClinicPost::create([
                'clinic_id' => $clinic->id,
                'type' => $post['type'],
                'title' => $post['title'],
                'slug' => $post['slug'],
                'excerpt' => $post['excerpt'],
                'body' => $post['body'],
                'image_path' => $imagePath,
                'starts_at' => $post['starts_at'],
                'ends_at' => $post['ends_at'],
                'is_pinned' => $post['is_pinned'],
                'status' => 'published',
                'sort' => ($i + 1) * 10,
            ]);
        }
    }

    private function fillBranch(Clinic $clinic): void
    {
        $exists = Clinic::where('organization_id', $clinic->organization_id)
            ->where('slug', 'evrodent-arbat-moskva')
            ->exists();

        if ($exists) {
            return;
        }

        $city = $clinic->city ?? City::where('slug', 'moskva')->firstOrFail();
        $district = District::where('city_id', $city->id)->where('slug', 'arbat')->first()
            ?? $clinic->district;

        Clinic::create([
            'organization_id' => $clinic->organization_id,
            'city_id' => $city->id,
            'district_id' => $district->id,
            'name' => 'Стоматология «Евродент» на Арбате',
            'slug' => 'evrodent-arbat-moskva',
            'tagline' => 'Филиал сети «Евродент»',
            'description' => 'Филиал стоматологии «Евродент» на Старом Арбате. Терапия, гигиена, детский приём и ортодонтия.',
            'address' => 'Москва, ул. Арбат, 24',
            'metro' => 'Арбатская',
            'lat' => 55.752023,
            'lng' => 37.592423,
            'phone' => '+7 (495) 123-45-68',
            'email' => 'arbat@evrodent.ru',
            'website' => 'https://evrodent.ru/arbat',
            'founded_year' => 2016,
            'license_number' => 'ЛО-77-01-019877',
            'license_issuer' => 'Департамент здравоохранения города Москвы',
            'license_date' => '2019-06-01',
            'schedule' => [
                'mon' => ['open' => '10:00', 'close' => '20:00'],
                'tue' => ['open' => '10:00', 'close' => '20:00'],
                'wed' => ['open' => '10:00', 'close' => '20:00'],
                'thu' => ['open' => '10:00', 'close' => '20:00'],
                'fri' => ['open' => '10:00', 'close' => '20:00'],
                'sat' => ['open' => '11:00', 'close' => '17:00'],
                'sun' => null,
            ],
            'payment_methods' => ['Наличные', 'Банковская карта', 'СБП', 'ДМС'],
            'achievements' => ['Филиал сети «Евродент»'],
            'restrictions' => 'Принимаем детей с 4 лет.',
            'is_verified' => true,
            'accepts_children' => true,
            'children_age_from' => 4,
            'same_day' => true,
            'has_installment' => true,
            'installment_months' => 12,
            'accepts_dms' => true,
            'has_microscope' => false,
            'has_ct' => false,
            'art_seed' => 11,
            'status' => 'published',
        ]);
    }

    private function copyDemoImage(int $clinicId, string $file, string $subdir = 'photos'): ?string
    {
        $source = public_path('images/demo/'.$file);
        if (! is_file($source)) {
            return null;
        }

        $path = "clinic-{$subdir}/{$clinicId}/{$file}";
        Storage::disk('public')->makeDirectory("clinic-{$subdir}/{$clinicId}");
        if (! Storage::disk('public')->exists($path)) {
            Storage::disk('public')->put($path, (string) file_get_contents($source));
        }

        return $path;
    }
}
