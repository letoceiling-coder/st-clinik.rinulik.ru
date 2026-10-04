<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\PromotionOrder;
use App\Models\PromotionPackage;
use App\Models\PromotionProduct;
use App\Models\User;
use App\Services\PromotionService;
use Database\Seeders\FoundationSeeder;
use Database\Seeders\PromotionSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PromotionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
        $this->seed(PromotionSeeder::class);
    }

    public function test_admin_promotions_page_requires_permission(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['role' => 'user', 'status' => 'active'])->save();

        $this->actingAs($user)->get('/admin/promotions')->assertForbidden();
    }

    public function test_cabinet_promotions_page_loads_for_clinic_owner(): void
    {
        [$owner, $clinic] = $this->clinicOwner();

        $this->actingAs($owner)->get('/clinic-cabinet/promotions?branch='.$clinic->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Cabinet/Promotions'));
    }

    public function test_publication_package_creates_active_entitlement(): void
    {
        [$owner, $clinic] = $this->clinicOwner();
        $package = PromotionPackage::query()->where('code', 'publish_1m')->firstOrFail();

        $order = app(PromotionService::class)->createOrder($clinic, $owner, 'package', $package->id);
        app(PromotionService::class)->markPaid($order);

        $this->assertDatabaseHas('clinic_promotions', [
            'clinic_id' => $clinic->id,
            'product_code' => 'publication',
            'status' => 'active',
        ]);
    }

    public function test_boost_requires_active_publication(): void
    {
        [$owner, $clinic] = $this->clinicOwner();
        $product = PromotionProduct::query()->where('code', 'boost')->firstOrFail();

        $check = app(PromotionService::class)->canPurchase($clinic, 'product', $product->id);

        $this->assertFalse($check['ok']);
        $this->assertStringContainsString('публикации', $check['message'] ?? '');
    }

    public function test_paid_boost_order_creates_active_promotion(): void
    {
        [$owner, $clinic] = $this->clinicOwner();
        $this->activatePublication($clinic, $owner);

        $product = PromotionProduct::query()->where('code', 'boost')->firstOrFail();
        $order = app(PromotionService::class)->createOrder($clinic, $owner, 'product', $product->id);
        app(PromotionService::class)->markPaid($order);

        $this->assertDatabaseHas('clinic_promotions', [
            'clinic_id' => $clinic->id,
            'product_code' => 'boost',
            'status' => 'active',
        ]);
    }

    public function test_banner_order_requires_moderation_before_active(): void
    {
        [$owner, $clinic] = $this->clinicOwner();
        $this->activatePublication($clinic, $owner);

        $product = PromotionProduct::query()->where('code', 'banner_home')->firstOrFail();

        $order = PromotionOrder::create([
            'organization_id' => $clinic->organization_id,
            'clinic_id' => $clinic->id,
            'city_id' => $clinic->city_id,
            'user_id' => $owner->id,
            'priceable_type' => 'product',
            'priceable_id' => $product->id,
            'amount' => 990000,
            'status' => 'paid',
            'moderation_status' => 'pending',
            'banner_title' => 'Test',
            'banner_url' => 'https://example.test',
            'paid_at' => now(),
        ]);

        app(PromotionService::class)->fulfillOrder($order);

        $this->assertDatabaseHas('clinic_promotions', [
            'order_id' => $order->id,
            'status' => 'pending_moderation',
        ]);

        app(PromotionService::class)->approveOrder($order);

        $this->assertDatabaseHas('clinic_promotions', [
            'order_id' => $order->id,
            'status' => 'active',
        ]);
    }

    public function test_catalog_includes_recommended_block_when_boosted(): void
    {
        [$owner, $clinic] = $this->clinicOwner();
        $this->activatePublication($clinic, $owner);

        $product = PromotionProduct::query()->where('code', 'boost')->firstOrFail();
        app(PromotionService::class)->createOrder($clinic, $owner, 'product', $product->id);
        app(PromotionService::class)->markPaid(PromotionOrder::query()->where('priceable_type', 'product')->first());

        $city = City::query()->findOrFail($clinic->city_id);

        $this->get(route('city.clinics', $city->slug))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->has('recommended_clinics', 1)
                ->where('recommended_clinics.0.id', $clinic->id));
    }

    /** @return array{0: User, 1: Clinic} */
    private function clinicOwner(): array
    {
        $owner = User::factory()->create();
        $owner->forceFill(['role' => 'clinic_owner', 'status' => 'active'])->save();
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Test Org']);
        $city = City::query()->firstOrFail();
        $clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => $city->id,
            'name' => 'Test Clinic',
            'slug' => 'test-clinic-'.uniqid(),
            'address' => 'Test address',
            'status' => 'published',
        ]);

        return [$owner, $clinic];
    }

    private function activatePublication(Clinic $clinic, User $owner): void
    {
        $package = PromotionPackage::query()->where('code', 'publish_1m')->firstOrFail();
        $order = app(PromotionService::class)->createOrder($clinic, $owner, 'package', $package->id);
        app(PromotionService::class)->markPaid($order);
    }
}
