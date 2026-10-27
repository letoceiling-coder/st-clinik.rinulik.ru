<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\User;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaymentRefundTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
        config(['tbank.terminal_key' => 'TBankTest', 'tbank.password' => 'test-secret']);
    }

    public function test_admin_can_refund_paid_payment(): void
    {
        Http::fake([
            '*/Cancel' => Http::response(['Success' => true, 'Status' => 'REFUNDED'], 200),
        ]);

        $admin = User::factory()->create(['role' => 'superadmin', 'status' => 'active']);
        $payment = $this->paidPayment();

        $this->actingAs($admin)
            ->post("/admin/finance/payments/{$payment->id}/refund")
            ->assertRedirect()
            ->assertSessionHas('success');

        $this->assertDatabaseHas('payment_refunds', ['payment_id' => $payment->id, 'amount' => $payment->amount]);
        $this->assertSame(Payment::STATUS_REFUNDED, $payment->fresh()->status);
    }

    public function test_admin_can_partially_refund_paid_payment(): void
    {
        Http::fake([
            '*/Cancel' => Http::response(['Success' => true, 'Status' => 'REFUNDED'], 200),
        ]);

        $admin = User::factory()->create(['role' => 'superadmin', 'status' => 'active']);
        $payment = $this->paidPayment();

        $this->actingAs($admin)
            ->post("/admin/finance/payments/{$payment->id}/refund", ['amount' => 40000])
            ->assertRedirect()
            ->assertSessionHas('success');

        $payment->refresh();
        $this->assertSame(40000, (int) $payment->refunded_amount);
        $this->assertSame(Payment::STATUS_PAID, $payment->status);
        $this->assertSame(60000, $payment->refundableAmount());
    }

    private function paidPayment(): Payment
    {
        $owner = User::factory()->create();
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Refund org']);
        $city = City::query()->firstOrFail();
        $clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => $city->id,
            'name' => 'Refund clinic',
            'slug' => 'refund-'.uniqid(),
            'address' => 'Test',
            'status' => 'draft',
            'is_24_7' => false,
        ]);

        return Payment::query()->create([
            'organization_id' => $org->id,
            'clinic_id' => $clinic->id,
            'user_id' => $owner->id,
            'kind' => Payment::KIND_TARIFF,
            'amount' => 100000,
            'status' => Payment::STATUS_PAID,
            'payment_provider' => 'tbank',
            'payment_id' => '555777',
            'paid_at' => now(),
        ]);
    }
}
