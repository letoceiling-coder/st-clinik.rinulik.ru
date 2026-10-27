<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\Tariff;
use App\Models\User;
use App\Services\Monetization\ClinicSubscriptionService;
use App\Services\Monetization\PaymentService;
use Database\Seeders\FoundationSeeder;
use Database\Seeders\TariffSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class TariffSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
        $this->seed(TariffSeeder::class);
    }

    public function test_assign_default_tariff_on_new_branch(): void
    {
        $owner = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Org tariff']);
        $city = City::query()->firstOrFail();

        $this->actingAs($owner)->post('/clinic-cabinet/branches', [
            'name' => 'Филиал тариф',
            'city_id' => $city->id,
            'address' => 'ул. Тест 1',
            'phone' => '+79001234567',
            'specialty_ids' => [],
        ])->assertRedirect()->assertSessionHasNoErrors();

        $clinic = Clinic::query()->where('organization_id', $org->id)->firstOrFail();

        $this->assertDatabaseHas('clinic_subscriptions', [
            'clinic_id' => $clinic->id,
            'status' => 'active',
        ]);
    }

    public function test_tariff_checkout_creates_pending_payment(): void
    {
        config(['tbank.terminal_key' => 'TBankTest', 'tbank.password' => 'test-secret']);

        $owner = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Pay org']);
        $city = City::query()->firstOrFail();
        $clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => $city->id,
            'name' => 'Pay clinic',
            'slug' => 'pay-clinic-'.uniqid(),
            'address' => 'Test',
            'status' => 'draft',
            'is_24_7' => false,
        ]);

        $tariff = Tariff::query()->where('slug', 'standard')->firstOrFail();

        Http::fake([
            '*/Init' => Http::response([
                'Success' => true,
                'PaymentId' => '123456',
                'PaymentURL' => 'https://pay.example/123',
            ], 200),
        ]);

        $this->actingAs($owner)
            ->post("/clinic-cabinet/payments/tariffs/{$tariff->id}/checkout?branch={$clinic->id}")
            ->assertRedirect('https://pay.example/123');

        $this->assertDatabaseHas('payments', [
            'clinic_id' => $clinic->id,
            'kind' => Payment::KIND_TARIFF,
            'tariff_id' => $tariff->id,
            'status' => Payment::STATUS_PENDING,
        ]);
    }

    public function test_mark_paid_activates_subscription(): void
    {
        $owner = User::factory()->create();
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Sub org']);
        $city = City::query()->firstOrFail();
        $clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => $city->id,
            'name' => 'Sub clinic',
            'slug' => 'sub-clinic-'.uniqid(),
            'address' => 'Test',
            'status' => 'draft',
            'is_24_7' => false,
        ]);
        $tariff = Tariff::query()->where('slug', 'standard')->firstOrFail();

        $payment = Payment::query()->create([
            'organization_id' => $org->id,
            'clinic_id' => $clinic->id,
            'user_id' => $owner->id,
            'kind' => Payment::KIND_TARIFF,
            'tariff_id' => $tariff->id,
            'amount' => $tariff->price,
            'status' => Payment::STATUS_PENDING,
            'payment_provider' => 'tbank',
            'payment_id' => '999001',
        ]);

        app(PaymentService::class)->markPaid($payment);

        $this->assertSame(Payment::STATUS_PAID, $payment->fresh()->status);
        $this->assertNotNull(app(ClinicSubscriptionService::class)->activeSubscription($clinic));
    }
}
