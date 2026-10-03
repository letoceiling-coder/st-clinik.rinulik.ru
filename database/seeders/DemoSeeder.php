<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\Clinic;
use App\Models\ClinicDocument;
use App\Models\ClinicPhoto;
use App\Models\Concern;
use App\Models\Doctor;
use App\Models\HistoryEntry;
use App\Models\Lead;
use App\Models\Organization;
use App\Models\Review;
use App\Models\ReviewComplaint;
use App\Models\Service;
use App\Models\Specialty;
use App\Models\User;
use App\Models\UserCollection;
use App\Models\UserNotification;
use App\Services\ProfileMetrics;
use App\Support\Text;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Демонстрационные данные: все клиники, врачи, цены и отзывы вымышленные.
 */
class DemoSeeder extends Seeder
{
    /** @var array<string,mixed> */
    private array $pools;

    /** @var array<string,User> */
    private array $users = [];

    /** @var \Illuminate\Support\Collection<string,int> */
    private $specialtyIds;

    /** @var \Illuminate\Support\Collection<int,Service> */
    private $services;

    /** @var array<string,int> */
    private array $usedSlugs = [];

    /** @var array<string,Organization> */
    private array $orgByBrand = [];

    public function run(): void
    {
        mt_srand(20261003);
        $this->pools = require database_path('seeders/data/demo_pools.php');
        $this->specialtyIds = Specialty::pluck('id', 'slug');
        $this->services = Service::with('specialty')->get();

        DB::transaction(function () {
            $this->accounts();
            $this->catalog();
            $this->moderationDemo();
            $this->duplicatesDemo();
            $this->engagement();
            $this->metrics();
        });
    }

    private function password(string $key): string
    {
        return (string) env('SEED_PASSWORD_'.strtoupper($key), 'password');
    }

    private function accounts(): void
    {
        $defs = [
            ['superadmin', 'superadmin@st-clinik.test', 'Суперадмин Демо', 'superadmin'],
            ['moderator', 'moderator@st-clinik.test', 'Модератор Демо', 'moderator'],
            ['content', 'content@st-clinik.test', 'Контент-менеджер Демо', 'content_manager'],
            ['owner', 'owner@st-clinik.test', 'Представитель «Белый кедр»', 'clinic_owner'],
            ['owner2', 'owner2@st-clinik.test', 'Представитель новой клиники', 'clinic_owner'],
            ['user', 'user@st-clinik.test', 'Анна Пользователь', 'user'],
        ];
        $moscow = City::where('slug', 'moskva')->value('id');

        foreach ($defs as [$key, $email, $name, $role]) {
            $user = new User([
                'name' => $name,
                'email' => $email,
                'phone' => '+7 (999) 000-'.sprintf('%02d-%02d', mt_rand(10, 99), mt_rand(10, 99)),
                'password' => $this->password($key),
                'city_id' => $moscow,
                'consent_at' => now(),
                'consent_version' => '2026-10',
            ]);
            $user->forceFill(['role' => $role, 'status' => 'active', 'email_verified_at' => now()])->save();
            $this->users[$key] = $user;
        }
    }

    // ------------------------------------------------------------------ catalog

    private function catalog(): void
    {
        $plan = ['moskva' => [8, 14], 'sankt-peterburg' => [6, 10]];
        $brands = $this->pools['brands'];
        $cityIndex = 0;

        foreach (City::orderBy('sort')->get() as $city) {
            [$brandCount, $points] = $plan[$city->slug] ?? [3, 5];
            $offset = ($cityIndex * 7) % count($brands);
            $cityBrands = [];
            for ($i = 0; $i < $brandCount; $i++) {
                $cityBrands[] = $brands[($offset + $i) % count($brands)];
            }
            if ($city->slug === 'moskva') {
                $cityBrands[0] = 'Белый кедр';
            }
            if ($city->slug === 'sankt-peterburg') {
                $cityBrands[0] = 'Белый кедр';
            }

            $branchesPerBrand = array_fill(0, $brandCount, 1);
            for ($extra = $points - $brandCount; $extra > 0; $extra--) {
                $branchesPerBrand[mt_rand(0, $brandCount - 1)]++;
            }
            if ($city->slug === 'moskva') {
                $branchesPerBrand[0] = 3;
            }

            foreach ($cityBrands as $i => $brand) {
                $org = $this->organization($brand, $city);
                $tier = $this->tier();
                for ($b = 0; $b < $branchesPerBrand[$i]; $b++) {
                    $this->makeClinic($org, $city, $brand, $tier, $b);
                }
            }
            $cityIndex++;
        }
    }

    private function organization(string $brand, City $city): Organization
    {
        if ($brand === 'Белый кедр' && isset($this->orgByBrand[$brand])) {
            return $this->orgByBrand[$brand];
        }

        $org = Organization::create([
            'owner_id' => $brand === 'Белый кедр' ? $this->users['owner']->id : null,
            'name' => $brand,
            'legal_name' => 'ООО «'.$brand.'»',
            'inn' => (string) mt_rand(7700000000, 7799999999),
        ]);
        if ($brand === 'Белый кедр') {
            $this->orgByBrand[$brand] = $org;
        }

        return $org;
    }

    private function tier(): string
    {
        $r = mt_rand(1, 100);

        return $r <= 22 ? 'premium' : ($r <= 75 ? 'mid' : 'budget');
    }

    private function chance(float $p): bool
    {
        return mt_rand(0, 9999) / 10000 < $p;
    }

    private function pick(array $items): mixed
    {
        return $items[mt_rand(0, count($items) - 1)];
    }

    private function uniqueSlug(string $base): string
    {
        $slug = Text::slug($base);
        $this->usedSlugs[$slug] = ($this->usedSlugs[$slug] ?? 0) + 1;

        return $this->usedSlugs[$slug] > 1 ? $slug.'-'.$this->usedSlugs[$slug] : $slug;
    }

    private function makeClinic(Organization $org, City $city, string $brand, string $tier, int $branchIndex, array $override = []): Clinic
    {
        $districts = $city->districts()->get();
        $district = $districts->random();
        $street = $this->pick($this->pools['streets']).', '.mt_rand(1, 120);
        $metroList = $this->pools['metro'][$city->slug] ?? null;

        $verifiedP = ['premium' => 0.92, 'mid' => 0.7, 'budget' => 0.45][$tier];
        $q = ['premium' => 0.9, 'mid' => 0.5, 'budget' => 0.2][$tier];
        $is247 = $this->chance($tier === 'premium' ? 0.18 : 0.04);
        $children = $this->chance(0.62);
        $installment = $this->chance(['premium' => 0.8, 'mid' => 0.6, 'budget' => 0.3][$tier]);
        $dms = $this->chance(['premium' => 0.7, 'mid' => 0.45, 'budget' => 0.2][$tier]);

        $payment = ['Наличные', 'Банковская карта', 'СБП'];
        if ($installment) {
            $payment[] = 'Рассрочка';
        }
        if ($dms) {
            $payment[] = 'ДМС';
        }
        if ($this->chance(0.6)) {
            $payment[] = 'Справка для налогового вычета';
        }

        $restrictions = [];
        if ($children) {
            $age = $this->pick([0, 3, 4, 5, 6]);
            $restrictions[] = $age === 0 ? 'Принимаем детей с рождения.' : "Детский приём — с {$age} лет.";
        } else {
            $restrictions[] = 'Детей не принимаем.';
        }
        $restrictions[] = 'Беременным — приём после консультации врача, рентген только по показаниям.';
        $restrictions[] = 'Имплантация — после КТ и оценки противопоказаний врачом.';

        $name = $override['name'] ?? 'Стоматология «'.$brand.'»';
        $slugBase = $brand.' '.$city->slug.' '.$district->slug;
        $address = $city->name.', '.$street;

        $attrs = array_merge([
            'organization_id' => $org->id,
            'city_id' => $city->id,
            'district_id' => $district->id,
            'name' => $name,
            'slug' => $this->uniqueSlug($slugBase),
            'tagline' => $this->pick([
                'Лечим без боли и спешки', 'Современная стоматология для всей семьи', 'Диагностика, лечение и протезирование в одном месте',
                'Прозрачные цены и план лечения до начала работ', 'Забота о здоровье улыбки с 2010 года',
            ]),
            'description' => $this->description($brand, $city, $district->name, $tier),
            'address' => $address,
            'metro' => $metroList ? $this->pick($metroList) : null,
            'lat' => round($city->lat + (mt_rand(-400, 400) / 10000), 6),
            'lng' => round($city->lng + (mt_rand(-600, 600) / 10000), 6),
            'phone' => sprintf('+7 (999) 000-%02d-%02d', mt_rand(10, 99), mt_rand(10, 99)),
            'email' => 'info@'.Text::slug($brand).'.example',
            'website' => 'https://'.Text::slug($brand).'.example',
            'founded_year' => mt_rand(2003, 2023),
            'license_number' => 'ЛО-'.mt_rand(10, 99).'-01-'.mt_rand(100000, 999999),
            'license_issuer' => 'Региональный орган здравоохранения (демо)',
            'license_date' => now()->subDays(mt_rand(200, 2500))->toDateString(),
            'schedule' => $this->schedule($is247, $tier),
            'payment_methods' => $payment,
            'achievements' => $this->chance(0.55) ? $this->sample($this->pools['clinic_achievements'], mt_rand(1, 3)) : [],
            'restrictions' => implode(' ', $restrictions),
            'is_verified' => $this->chance($verifiedP),
            'is_24_7' => $is247,
            'accepts_children' => $children,
            'children_age_from' => $children ? $this->pick([0, 3, 4, 5, 6]) : null,
            'same_day' => $this->chance(0.7),
            'has_installment' => $installment,
            'installment_months' => $installment ? $this->pick([6, 12, 18, 24]) : null,
            'accepts_dms' => $dms,
            'has_sedation' => $this->chance(0.15 + $q * 0.4),
            'has_anesthesia' => $this->chance(0.08 + $q * 0.3),
            'has_microscope' => $this->chance(0.1 + $q * 0.5),
            'has_ct' => $this->chance(0.15 + $q * 0.55),
            'art_seed' => mt_rand(1, 24),
            'status' => 'published',
            'views_count' => mt_rand(120, 9000),
            'created_at' => now()->subDays(mt_rand(60, 700)),
        ], $override);

        $clinic = Clinic::create($attrs);

        $this->makeDoctors($clinic, $tier);
        $this->makePrices($clinic, $tier, $city);
        $this->makePhotos($clinic);
        $this->makeDocuments($clinic);
        $this->makeReviews($clinic, $tier);

        return $clinic;
    }

    /** @return list<mixed> */
    private function sample(array $items, int $n): array
    {
        $keys = array_rand($items, min($n, count($items)));

        return array_values(array_map(fn ($k) => $items[$k], (array) $keys));
    }

    private function description(string $brand, City $city, string $district, string $tier): string
    {
        $level = ['premium' => 'клиника премиум-сегмента', 'mid' => 'многопрофильная клиника', 'budget' => 'доступная стоматология'][$tier];

        return "«{$brand}» — {$level} {$city->name_in}, район «{$district}». Мы принимаем взрослых пациентов, помогаем составить план лечения "
            ."и заранее называем ориентировочную стоимость «от». Итоговую цену врач озвучивает после осмотра и диагностики, до начала работ.\n\n"
            .'В клинике работают врачи нескольких специальностей, применяется современная диагностика и безболезненные методики обезболивания. '
            .'Стерилизация инструментов проводится по стандарту, а все материалы сертифицированы. Это демонстрационная карточка для прототипа.';
    }

    private function schedule(bool $is247, string $tier): array
    {
        $days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        if ($is247) {
            return array_fill_keys($days, ['open' => '00:00', 'close' => '24:00']);
        }
        $open = $this->pick(['08:00', '09:00', '09:00', '10:00']);
        $close = $this->pick(['20:00', '21:00', '21:00']);
        $schedule = [];
        foreach ($days as $d) {
            $schedule[$d] = ['open' => $open, 'close' => $close];
        }
        $schedule['sat'] = ['open' => '10:00', 'close' => $tier === 'premium' ? '20:00' : '17:00'];
        $schedule['sun'] = $tier === 'premium' || $this->chance(0.3) ? ['open' => '10:00', 'close' => '16:00'] : null;

        return $schedule;
    }

    // ------------------------------------------------------------------ doctors

    private function makeDoctors(Clinic $clinic, string $tier): void
    {
        $count = mt_rand(3, 6);
        $specs = array_keys($this->pools['positions']);
        $clinicSpecs = [];
        $usedNames = [];

        for ($i = 0; $i < $count; $i++) {
            $female = $this->chance(0.5);
            do {
                $first = $this->pick($female ? $this->pools['female_first'] : $this->pools['male_first']);
                $idx = mt_rand(0, count($this->pools['male_patronymic']) - 1);
                $pat = $this->pools['male_patronymic'][$idx];
                $pat = $female ? preg_replace('/ич$/u', 'на', $pat) : $pat;
                $sur = $this->pick($this->pools['surnames']).($female ? 'а' : '');
                $name = "{$sur} {$first} {$pat}";
            } while (isset($usedNames[$name]));
            $usedNames[$name] = true;

            $primary = $i === 0 ? 'terapiya' : $this->pick($specs);
            $secondary = $this->chance(0.3) ? $this->pick($specs) : null;
            if ($primary === 'gigiena') {
                $female = true;
            }
            $ids = array_unique(array_filter([$this->specialtyIds[$primary], $secondary ? $this->specialtyIds[$secondary] : null]));
            $clinicSpecs = array_merge($clinicSpecs, $ids);

            $acceptsChildren = $clinic->accepts_children && ($primary === 'detskaya' || $this->chance(0.45));
            $experience = $tier === 'premium' ? mt_rand(5, 35) : mt_rand(1, 28);
            $grad = (int) now()->format('Y') - $experience - 5;

            $doctor = Doctor::create([
                'clinic_id' => $clinic->id,
                'name' => $name,
                'slug' => $this->uniqueSlug($name.' '.$clinic->id),
                'position' => $this->pools['positions'][$primary],
                'experience_years' => $experience,
                'bio' => $this->pools['positions'][$primary]." с опытом работы {$experience} лет. Ведёт приём".($acceptsChildren ? ' взрослых и детей' : ' взрослых пациентов')
                    .'. Объясняет план лечения простым языком и заранее обсуждает варианты и ориентировочную стоимость. Демонстрационная анкета.',
                'education' => [
                    "Медицинский университет, стоматологический факультет, {$grad}",
                    'Клиническая ординатура по специальности «Стоматология»',
                    'Повышение квалификации, '.mt_rand(2022, 2025),
                ],
                'achievements' => $this->chance(0.45) ? $this->sample($this->pools['doctor_achievements'], mt_rand(1, 2)) : [],
                'schedule_days' => $this->sample(['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'], mt_rand(3, 6)),
                'is_verified' => $clinic->is_verified ? $this->chance(0.85) : $this->chance(0.35),
                'accepts_children' => $acceptsChildren,
                'children_age_from' => $acceptsChildren ? $this->pick([0, 3, 4, 5]) : null,
                'consult_price' => $this->chance(0.4) ? 0 : $this->pick([500, 800, 1000, 1500, 2000]),
                'art_seed' => mt_rand(1, 24),
                'status' => 'published',
            ]);
            $doctor->specialties()->sync($ids);
            $doctor->save();
        }

        $clinic->specialties()->sync(array_values(array_unique($clinicSpecs)));
    }

    // ------------------------------------------------------------------ prices

    private function makePrices(Clinic $clinic, string $tier, City $city): void
    {
        $tierFactor = ['premium' => 1.45, 'mid' => 1.0, 'budget' => 0.75][$tier];
        $cityFactor = $this->pools['city_price_factor'][$city->slug] ?? 1.0;
        $specIds = $clinic->specialties()->pluck('specialties.id')->all();

        $eligible = $this->services->filter(fn (Service $s) => in_array($s->specialty_id, $specIds, true) || $s->is_popular);
        $rows = [];
        foreach ($eligible as $service) {
            if (! $service->is_popular && $this->chance(0.25)) {
                continue;
            }
            $hint = (int) $service->price_hint_from;
            $price = $hint === 0 ? ($this->chance(0.55) ? 0 : 500) : (int) (round($hint * $tierFactor * $cityFactor * (mt_rand(88, 122) / 100) / 100) * 100);
            $range = $price > 0 && $this->chance(0.45) ? (int) (round($price * (mt_rand(140, 220) / 100) / 100) * 100) : null;
            $rows[] = [
                'clinic_id' => $clinic->id,
                'service_id' => $service->id,
                'price_from' => $price,
                'price_to' => $range,
                'is_promo' => $price > 0 && $this->chance(0.08),
                'note' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        DB::table('clinic_services')->insert($rows);
    }

    private function makePhotos(Clinic $clinic): void
    {
        $kinds = [
            ['exterior', 'Фасад и вход'], ['reception', 'Зона ресепшн'], ['interior', 'Кабинет врача'],
            ['equipment', 'Оборудование'], ['team', 'Команда клиники'], ['interior', 'Зона ожидания'],
        ];
        foreach (array_slice($kinds, 0, mt_rand(3, 6)) as $i => [$kind, $caption]) {
            ClinicPhoto::create([
                'clinic_id' => $clinic->id, 'kind' => $kind, 'caption' => $caption,
                'art_seed' => mt_rand(1, 24), 'status' => 'approved', 'sort' => ($i + 1) * 10,
            ]);
        }
    }

    private function makeDocuments(Clinic $clinic): void
    {
        ClinicDocument::create([
            'clinic_id' => $clinic->id, 'type' => 'license', 'title' => 'Лицензия на медицинскую деятельность',
            'number' => $clinic->license_number, 'issued_at' => $clinic->license_date,
            'status' => $clinic->is_verified ? 'approved' : 'pending',
        ]);
        if ($clinic->has_anesthesia || $clinic->has_sedation) {
            ClinicDocument::create([
                'clinic_id' => $clinic->id, 'type' => 'certificate', 'title' => 'Лицензия: анестезиология и реаниматология',
                'number' => 'ЛО-AN-'.mt_rand(1000, 9999), 'issued_at' => now()->subDays(mt_rand(100, 900)),
                'status' => $clinic->is_verified ? 'approved' : 'pending',
            ]);
        }
    }

    // ------------------------------------------------------------------ reviews

    private function makeReviews(Clinic $clinic, string $tier): void
    {
        $count = mt_rand(3, 9);
        $doctorIds = $clinic->doctors()->pluck('id')->all();
        $serviceIds = $this->services->pluck('id')->all();
        $base = ['premium' => 4.8, 'mid' => 4.45, 'budget' => 4.0][$tier];

        for ($i = 0; $i < $count; $i++) {
            $rating = (int) max(1, min(5, round($base + (mt_rand(-140, 70) / 100))));
            $r = mt_rand(1, 100);
            $status = $r <= 88 ? 'published' : ($r <= 94 ? 'pending' : ($r <= 97 ? 'rejected' : 'hidden'));
            $created = now()->subDays(mt_rand(2, 420));
            $reply = $status === 'published' && $this->chance(0.45);

            Review::create([
                'user_id' => null,
                'clinic_id' => $clinic->id,
                'doctor_id' => $this->chance(0.6) ? $this->pick($doctorIds) : null,
                'service_id' => $this->chance(0.5) ? $this->pick($serviceIds) : null,
                'rating' => $rating,
                'title' => $this->pick($this->pools['review_titles'][$rating]),
                'body' => $this->pick($this->pools['review_bodies'][$rating]),
                'visit_date' => $created->copy()->subDays(mt_rand(1, 14))->toDateString(),
                'is_verified_visit' => $this->chance(0.45),
                'author_name' => $this->pick($this->pools['first_names_short']).' '.$this->pick(['К.', 'М.', 'П.', 'С.', 'Л.', 'Т.', 'В.', 'Н.']),
                'status' => $status,
                'moderation_note' => $status === 'rejected' ? 'Содержит контактные данные (демо-причина).' : null,
                'reply_text' => $reply ? $this->pick($this->pools['replies']) : null,
                'reply_at' => $reply ? $created->copy()->addDays(mt_rand(1, 4)) : null,
                'helpful_count' => mt_rand(0, 14),
                'consent_at' => $created,
                'published_at' => $status === 'published' ? $created->copy()->addDay() : null,
                'created_at' => $created,
                'updated_at' => $created,
            ]);
        }
    }

    // ------------------------------------------------------------------ moderation / duplicates demo

    private function moderationDemo(): void
    {
        $kazan = City::where('slug', 'kazan')->first();
        $org = Organization::create([
            'owner_id' => $this->users['owner2']->id, 'name' => 'Новая клиника', 'legal_name' => 'ООО «Новая клиника»', 'inn' => '1655000000',
        ]);

        $clinic = Clinic::create([
            'organization_id' => $org->id, 'city_id' => $kazan->id, 'district_id' => $kazan->districts()->first()->id,
            'name' => 'Стоматология «Новая»', 'slug' => $this->uniqueSlug('novaya kazan'), 'address' => 'Казань, ул. Баумана, 10',
            'phone' => '+7 (999) 000-12-34', 'description' => 'Новая клиника ожидает модерации профиля.',
            'status' => 'pending', 'art_seed' => 7,
        ]);
        $doctor = Doctor::create([
            'clinic_id' => $clinic->id, 'name' => 'Тестов Тест Тестович', 'slug' => $this->uniqueSlug('testov-test-novaya'),
            'position' => 'Стоматолог-терапевт', 'experience_years' => 6, 'status' => 'pending', 'art_seed' => 3,
        ]);
        $doctor->specialties()->sync([$this->specialtyIds['terapiya']]);
        $doctor->save();
        ClinicDocument::create(['clinic_id' => $clinic->id, 'type' => 'license', 'title' => 'Лицензия (на проверке)', 'number' => 'ЛО-16-01-000001', 'status' => 'pending']);
        ClinicPhoto::create(['clinic_id' => $clinic->id, 'kind' => 'interior', 'caption' => 'Кабинет', 'art_seed' => 5, 'status' => 'pending']);

        Clinic::create([
            'organization_id' => $org->id, 'city_id' => $kazan->id, 'name' => 'Стоматология «Новая» (черновик)', 'slug' => $this->uniqueSlug('novaya-draft kazan'),
            'address' => 'Казань, ул. Пушкина, 3', 'status' => 'draft', 'art_seed' => 9,
        ]);
    }

    private function duplicatesDemo(): void
    {
        $sources = Clinic::published()->where('city_id', City::where('slug', 'moskva')->value('id'))->inRandomOrder()->limit(2)->get();
        foreach ($sources as $src) {
            $org = Organization::create(['name' => $src->organization->name.' (дубль)', 'status' => 'active']);
            Clinic::create([
                'organization_id' => $org->id, 'city_id' => $src->city_id, 'district_id' => $src->district_id,
                'name' => $src->name.' — центр', 'slug' => $this->uniqueSlug($src->slug.' dubl'),
                'address' => $src->address, 'phone' => $src->phone, 'status' => 'pending', 'art_seed' => $src->art_seed,
                'description' => 'Заявка на добавление клиники с тем же телефоном и адресом (демонстрация поиска дубликатов).',
            ]);
        }
    }

    // ------------------------------------------------------------------ engagement

    private function engagement(): void
    {
        $user = $this->users['user'];
        $owner = $this->users['owner'];
        $clinics = Clinic::published()->with('doctors')->get();
        $concerns = Concern::pluck('id')->all();
        $moscow = $clinics->where('city_id', City::where('slug', 'moskva')->value('id'));
        $statuses = array_keys(Lead::STATUSES);

        // Заявки на все клиники для статистики
        foreach ($clinics as $clinic) {
            for ($i = 0, $n = mt_rand(2, 5); $i < $n; $i++) {
                $created = now()->subDays(mt_rand(0, 60))->subMinutes(mt_rand(0, 900));
                $doctor = $clinic->doctors->isNotEmpty() && $this->chance(0.5) ? $clinic->doctors->random() : null;
                Lead::create([
                    'clinic_id' => $clinic->id,
                    'doctor_id' => $doctor?->id,
                    'service_id' => $this->services->random()->id,
                    'concern_id' => $this->chance(0.5) ? $this->pick($concerns) : null,
                    'name' => $this->pick($this->pools['first_names_short']),
                    'phone' => sprintf('+7 (900) 000-%02d-%02d', mt_rand(10, 99), mt_rand(10, 99)),
                    'preferred_date' => now()->addDays(mt_rand(0, 10))->toDateString(),
                    'preferred_time' => $this->pick(['утро', 'день', 'вечер']),
                    'status' => $this->pick($statuses),
                    'source' => $this->pick(['clinic_page', 'doctor_page', 'search', 'concern']),
                    'consent_at' => $created,
                    'consent_version' => '2026-10',
                    'created_at' => $created,
                    'updated_at' => $created,
                ]);
            }
        }

        // Данные демо-пользователя
        $favClinics = $clinics->random(4);
        foreach ($favClinics as $c) {
            UserCollection::create(['user_id' => $user->id, 'kind' => 'favorite', 'entity_type' => 'clinic', 'entity_id' => $c->id]);
        }
        foreach ($clinics->random(3)->flatMap->doctors->take(3) as $d) {
            UserCollection::create(['user_id' => $user->id, 'kind' => 'favorite', 'entity_type' => 'doctor', 'entity_id' => $d->id]);
        }
        foreach ($favClinics->take(2) as $c) {
            UserCollection::create(['user_id' => $user->id, 'kind' => 'compare', 'entity_type' => 'clinic', 'entity_id' => $c->id]);
        }
        foreach (['болит зуб', 'имплантация цена', 'детский стоматолог'] as $q) {
            HistoryEntry::create(['user_id' => $user->id, 'type' => 'search', 'query' => $q, 'created_at' => now()->subDays(mt_rand(0, 12))]);
        }
        foreach ($clinics->random(5) as $c) {
            HistoryEntry::create(['user_id' => $user->id, 'type' => 'view', 'entity_type' => 'clinic', 'entity_id' => $c->id, 'created_at' => now()->subDays(mt_rand(0, 12))]);
        }

        $myClinics = $moscow->take(3);
        foreach ($myClinics as $i => $c) {
            $lead = Lead::create([
                'user_id' => $user->id, 'clinic_id' => $c->id, 'service_id' => $this->services->random()->id,
                'name' => 'Анна', 'phone' => '+7 (999) 000-11-22', 'preferred_date' => now()->addDays($i + 1)->toDateString(),
                'preferred_time' => 'вечер', 'status' => ['new', 'confirmed', 'completed'][$i], 'source' => 'clinic_page',
                'consent_at' => now()->subDays(5 - $i), 'consent_version' => '2026-10', 'created_at' => now()->subDays(5 - $i),
            ]);
            if ($i === 2) {
                Review::create([
                    'user_id' => $user->id, 'clinic_id' => $c->id, 'lead_id' => $lead->id, 'rating' => 5, 'title' => 'Рекомендую',
                    'body' => 'Приём прошёл спокойно, врач заранее объяснил план и стоимость «от». Финальная цена совпала с озвученной после осмотра.',
                    'visit_date' => now()->subDays(3)->toDateString(), 'is_verified_visit' => true, 'author_name' => 'Анна П.',
                    'status' => 'published', 'consent_at' => now()->subDays(2), 'published_at' => now()->subDays(2),
                ]);
            }
        }
        Review::create([
            'user_id' => $user->id, 'clinic_id' => $moscow->last()->id, 'rating' => 4, 'title' => 'Хорошо, но ожидание',
            'body' => 'Врач внимательный, но пришлось подождать приёма около 20 минут. В целом остался доволен.',
            'visit_date' => now()->subDays(8)->toDateString(), 'author_name' => 'Анна П.', 'status' => 'pending', 'consent_at' => now()->subDay(),
        ]);

        foreach ([
            ['lead_status', 'Заявка подтверждена', 'Клиника подтвердила вашу запись. Приходите за 10 минут до приёма.', '/account/leads'],
            ['review_published', 'Ваш отзыв опубликован', 'Спасибо! Отзыв прошёл модерацию и виден всем пользователям.', '/account/reviews'],
            ['review_pending', 'Отзыв на проверке', 'Модератор проверит отзыв в течение 48 часов.', '/account/reviews'],
            ['system', 'Добро пожаловать в СтомКлиник', 'Сохраняйте клиники в избранное и сравнивайте цены «от».', '/favorites'],
        ] as $i => [$type, $title, $body, $url]) {
            UserNotification::create([
                'user_id' => $user->id, 'type' => $type, 'title' => $title, 'body' => $body, 'url' => $url,
                'read_at' => $i > 1 ? now() : null, 'created_at' => now()->subDays($i),
            ]);
        }

        $ownClinic = Clinic::where('organization_id', $this->orgByBrand['Белый кедр']->id)->first();
        UserNotification::create(['user_id' => $owner->id, 'type' => 'lead_new', 'title' => 'Новая заявка', 'body' => 'Поступила новая заявка в «'.$ownClinic->name.'».', 'url' => '/clinic-cabinet/leads']);
        UserNotification::create(['user_id' => $owner->id, 'type' => 'review_new', 'title' => 'Новый отзыв', 'body' => 'На клинику оставлен новый отзыв — ответьте на него.', 'url' => '/clinic-cabinet/reviews']);

        // Жалобы
        $targets = Review::published()->inRandomOrder()->limit(4)->get();
        foreach ($targets as $i => $review) {
            ReviewComplaint::create([
                'review_id' => $review->id, 'reporter_role' => $i % 2 ? 'clinic' : 'user', 'reason' => $this->pick(array_keys(ReviewComplaint::REASONS)),
                'comment' => 'Просим проверить отзыв на соответствие правилам (демо).', 'status' => $i === 3 ? 'resolved' : 'open',
                'resolution' => $i === 3 ? 'Нарушений не найдено, отзыв оставлен.' : null, 'resolved_at' => $i === 3 ? now() : null,
            ]);
        }
    }

    private function metrics(): void
    {
        $m = app(ProfileMetrics::class);
        foreach (Doctor::all() as $doctor) {
            $m->recalcDoctor($doctor);
        }
        foreach (Clinic::all() as $clinic) {
            $m->recalcClinic($clinic);
        }
    }
}
