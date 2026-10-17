<?php

namespace Tests\Feature;

use App\Http\Resources\ClinicResource;
use App\Models\City;
use App\Models\Clinic;
use App\Models\ClinicPost;
use App\Models\ClinicService;
use App\Models\Organization;
use App\Models\Service;
use App\Models\User;
use App\Repositories\Contracts\ClinicRepository;
use App\Repositories\Filters\ClinicFilters;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClinicCardPromoOffersTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(FoundationSeeder::class);
    }

    public function test_clinic_card_includes_only_active_published_promos(): void
    {
        $city = City::query()->firstOrFail();
        $clinic = $this->makeClinic($city, 'promo-clinic');

        ClinicPost::create([
            'clinic_id' => $clinic->id,
            'type' => 'promo',
            'title' => 'Бесплатная консультация',
            'slug' => 'besplatnaya-konsultaciya',
            'excerpt' => null,
            'body' => 'Текст акции.',
            'status' => 'published',
            'sort' => 10,
        ]);
        ClinicPost::create([
            'clinic_id' => $clinic->id,
            'type' => 'promo',
            'title' => 'Черновик',
            'slug' => 'draft-promo',
            'excerpt' => null,
            'body' => 'Не показываем.',
            'status' => 'draft',
            'sort' => 20,
        ]);
        ClinicPost::create([
            'clinic_id' => $clinic->id,
            'type' => 'news',
            'title' => 'Новость',
            'slug' => 'news-item',
            'excerpt' => null,
            'body' => 'Не акция.',
            'status' => 'published',
            'sort' => 30,
        ]);
        ClinicPost::create([
            'clinic_id' => $clinic->id,
            'type' => 'promo',
            'title' => 'Истекшая акция',
            'slug' => 'expired-promo',
            'excerpt' => null,
            'body' => 'Просрочена.',
            'status' => 'published',
            'ends_at' => now()->subDay(),
            'sort' => 40,
        ]);

        $page = app(ClinicRepository::class)->paginate(ClinicFilters::fromArray([], $city->id), 50);
        $model = $page->getCollection()->firstWhere('id', $clinic->id);
        $this->assertNotNull($model);

        $card = ClinicResource::make($model)->resolve();

        $this->assertCount(1, $card['promo_offers']);
        $this->assertSame('Бесплатная консультация', $card['promo_offers'][0]['title']);
        $this->assertSame('besplatnaya-konsultaciya', $card['promo_offers'][0]['slug']);
    }

    public function test_clinic_card_derives_promos_from_price_list_and_flags(): void
    {
        $city = City::query()->firstOrFail();
        $clinic = $this->makeClinic($city, 'derived-promo-clinic', ['has_partial_payment' => true]);
        $consult = Service::query()->where('slug', 'konsultaciya-stomatologa')->firstOrFail();

        ClinicService::create([
            'clinic_id' => $clinic->id,
            'service_id' => $consult->id,
            'price_from' => 0,
            'price_to' => null,
            'is_promo' => false,
        ]);

        $page = app(ClinicRepository::class)->paginate(ClinicFilters::fromArray([], $city->id), 50);
        $model = $page->getCollection()->firstWhere('id', $clinic->id);
        $card = ClinicResource::make($model)->resolve();

        $titles = array_column($card['promo_offers'], 'title');
        $this->assertContains('Бесплатная консультация', $titles);
        $this->assertContains('Кешбэк при первой оплате', $titles);
    }

    /** @param array<string, mixed> $attrs */
    private function makeClinic(City $city, string $slug, array $attrs = []): Clinic
    {
        $owner = User::factory()->create();
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Org '.$slug]);

        return Clinic::create(array_merge([
            'organization_id' => $org->id,
            'city_id' => $city->id,
            'name' => 'Clinic '.$slug,
            'slug' => $slug,
            'address' => 'Test address',
            'status' => 'published',
            'has_partial_payment' => false,
        ], $attrs));
    }
}
