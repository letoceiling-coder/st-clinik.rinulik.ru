<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\Specialty;
use App\Models\User;
use App\Repositories\Contracts\CatalogRepository;
use App\Services\Clinics\ClinicSeo;
use App\Support\Text;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminClinicManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_admin_creates_clinic_manually_without_phone_as_draft(): void
    {
        $city = $this->city();
        $specialty = Specialty::query()->firstOrFail();

        $response = $this->actingAs($this->superadmin())->post('/admin/clinics', [
            'name' => 'Новая Улыбка',
            'city_id' => $city->id,
            'address' => 'ул. Ленина, 1',
            'specialty_ids' => [$specialty->id],
            'payment_methods' => ['Наличные'],
            'achievements' => ['Работаем с 2010 года'],
            'accepts_children' => true,
            'children_age_from' => 3,
        ]);

        $clinic = Clinic::query()->where('name', 'Новая Улыбка')->firstOrFail();
        $response->assertRedirect(route('admin.clinics.show', $clinic));
        $this->assertSame('draft', $clinic->status);
        $this->assertNull($clinic->organization->owner_id);
        $this->assertSame(['Работаем с 2010 года'], $clinic->achievements);
        $this->assertTrue($clinic->specialties()->whereKey($specialty->id)->exists());
    }

    public function test_admin_can_create_and_publish_into_existing_organization(): void
    {
        $organization = Organization::create(['name' => 'Сеть Дент', 'status' => 'active']);

        $this->actingAs($this->superadmin())->post('/admin/clinics', [
            'name' => 'Сеть Дент на Мира',
            'city_id' => $this->city()->id,
            'address' => 'пр. Мира, 5',
            'phone' => '+7 (900) 111-22-33',
            'organization_id' => $organization->id,
            'publish' => true,
        ])->assertSessionHas('success');

        $clinic = Clinic::query()->where('name', 'Сеть Дент на Мира')->firstOrFail();
        $this->assertSame($organization->id, $clinic->organization_id);
        $this->assertSame('published', $clinic->status);
    }

    public function test_admin_edits_full_profile(): void
    {
        $clinic = $this->clinic();

        $this->actingAs($this->superadmin())->put("/admin/clinics/{$clinic->id}/profile", [
            'name' => 'Переименованная клиника',
            'city_id' => $clinic->city_id,
            'address' => 'ул. Новая, 10',
            'metro' => 'Пушкинская',
            'website' => 'https://example.ru',
            'lat' => 55.75,
            'lng' => 37.61,
            'description' => 'Новое описание',
        ])->assertSessionHas('success');

        $clinic->refresh();
        $this->assertSame('Переименованная клиника', $clinic->name);
        $this->assertSame('Пушкинская', $clinic->metro);
        $this->assertSame(55.75, $clinic->lat);
    }

    public function test_profile_with_payment_methods_from_yandex_maps_can_be_saved(): void
    {
        $clinic = $this->clinic();
        $clinic->update(['payment_methods' => ['Оплата картой', 'Справка для налогового вычета']]);
        $admin = $this->superadmin();

        $this->actingAs($admin)->get("/admin/clinics/{$clinic->id}")
            ->assertInertia(fn (Assert $page) => $page->where('payments', fn ($payments) => collect($payments)->contains('Оплата картой')));

        $this->actingAs($admin)->put("/admin/clinics/{$clinic->id}/profile", [
            'name' => $clinic->name,
            'city_id' => $clinic->city_id,
            'address' => $clinic->address,
            'payment_methods' => ['Оплата картой', 'Справка для налогового вычета', 'СБП'],
        ])->assertSessionHasNoErrors()->assertSessionHas('success');

        $this->assertSame(['Оплата картой', 'Справка для налогового вычета', 'СБП'], $clinic->refresh()->payment_methods);
    }

    public function test_show_page_contains_profile_stats_and_automatic_seo(): void
    {
        $clinic = $this->clinic();

        $this->actingAs($this->superadmin())->get("/admin/clinics/{$clinic->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/ClinicShow')
                ->where('branchForm.name', $clinic->name)
                ->has('clinic.stats.doctors')
                ->where('seoAuto.title', fn (string $title) => str_contains($title, $clinic->name))
                ->has('propertyTypes'));
    }

    public function test_manual_seo_overrides_template_on_public_page_and_empty_falls_back(): void
    {
        $clinic = $this->clinic();

        $this->get("/clinics/{$clinic->slug}")
            ->assertInertia(fn (Assert $page) => $page->where('seo.title', fn (string $title) => str_contains($title, $clinic->name)));

        $clinic->update(['seo_title' => 'Ручной заголовок клиники', 'seo_description' => 'Ручное описание']);

        $this->get("/clinics/{$clinic->slug}")
            ->assertInertia(fn (Assert $page) => $page
                ->where('seo.title', 'Ручной заголовок клиники')
                ->where('seo.description', 'Ручное описание'));
    }

    public function test_automatic_seo_does_not_repeat_city_from_address(): void
    {
        $seo = app(ClinicSeo::class);

        $this->assertSame('ул. Тверская, 12, стр. 1', $seo->addressWithoutCity('Москва, ул. Тверская, 12, стр. 1', 'Москва'));
        $this->assertSame('ул. Кирова, 116', $seo->addressWithoutCity('ул. Кирова, 116, Краснодар', 'Краснодар'));
        $this->assertSame('ул. Ленина, 1', $seo->addressWithoutCity('г. Сочи, ул. Ленина, 1', 'Сочи'));
        $this->assertSame('Москва', $seo->addressWithoutCity('Москва', 'Москва'));
        $this->assertSame('пр. Московский, 5', $seo->addressWithoutCity('пр. Московский, 5', 'Москва'));

        $clinic = $this->clinic();
        $clinic->update(['address' => $clinic->city->name.', ул. Тестовая, 1']);
        $title = $seo->auto($clinic->refresh())['title'];

        $this->assertSame(1, mb_substr_count($title, $clinic->city->name));
    }

    public function test_automatic_description_uses_natural_wording(): void
    {
        $this->assertSame('1 отзыв', Text::plural(1, 'отзыв', 'отзыва', 'отзывов'));
        $this->assertSame('3 отзыва', Text::plural(3, 'отзыв', 'отзыва', 'отзывов'));
        $this->assertSame('11 отзывов', Text::plural(11, 'отзыв', 'отзыва', 'отзывов'));
        $this->assertSame('21 отзыв', Text::plural(21, 'отзыв', 'отзыва', 'отзывов'));

        $seo = app(ClinicSeo::class);
        $clinic = $this->clinic();
        $clinic->update(['rating' => 5, 'reviews_count' => 3, 'min_price' => 3200]);
        $this->assertSame('Рейтинг 5,0 по 3 отзывам, цены от '.Text::money(3200), $seo->vars($clinic->refresh())['summary']);

        $clinic->update(['reviews_count' => 0, 'min_price' => null]);
        $vars = $seo->vars($clinic->refresh());
        $this->assertSame('Пока без отзывов', $vars['summary']);
        $this->assertSame('нет отзывов', $vars['reviews_text']);

        $description = $seo->auto($clinic)['description'];
        $this->assertStringNotContainsString('нет оценок', $description);
        $this->assertStringNotContainsString('(0 отзывов)', $description);
    }

    private function city(): City
    {
        return app(CatalogRepository::class)->defaultCity();
    }

    private function clinic(): Clinic
    {
        $organization = Organization::create(['name' => 'Org '.uniqid(), 'status' => 'active']);

        return Clinic::create([
            'organization_id' => $organization->id,
            'city_id' => $this->city()->id,
            'name' => 'Клиника Тест',
            'slug' => 'clinic-test-'.uniqid(),
            'address' => 'ул. Тестовая, 1',
            'phone' => '+7 (900) 000-00-00',
            'status' => 'published',
            'rating' => 4.5,
            'reviews_count' => 3,
        ]);
    }

    private function superadmin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['role' => 'superadmin', 'status' => 'active'])->save();

        return $admin;
    }
}
