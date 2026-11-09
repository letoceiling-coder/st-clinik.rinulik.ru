<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Clinic;
use App\Models\ClinicPromotion;
use App\Models\ClinicSubscription;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\PaymentRefund;
use App\Models\PromotionOrder;
use App\Models\Tariff;
use App\Models\User;
use App\Services\Monetization\ClinicSubscriptionService;
use App\Services\Monetization\MonetizationSettings;
use App\Services\Monetization\PaymentService;
use App\Services\Payments\TBankAcquiringService;
use Database\Seeders\FoundationSeeder;
use Database\Seeders\TariffSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as HttpRequest;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PaymentLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private User $admin;

    private Clinic $clinic;

    private Tariff $tariff;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
        $this->seed(TariffSeeder::class);
        config(['tbank.terminal_key' => 'TBankTest', 'tbank.password' => 'test-secret']);

        $this->owner = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active', 'email' => 'owner@clinic.test']);
        $this->admin = User::factory()->create(['role' => 'superadmin', 'status' => 'active']);
        $org = Organization::create(['owner_id' => $this->owner->id, 'name' => 'Платная клиника']);
        $this->clinic = Clinic::create([
            'organization_id' => $org->id, 'city_id' => City::query()->value('id'), 'name' => 'Платная клиника',
            'slug' => 'paid-clinic', 'address' => 'ул. Тест, 1', 'status' => 'published',
        ]);
        $this->tariff = Tariff::query()->where('slug', 'standard')->firstOrFail();
    }

    public function test_full_refund_cancels_current_tariff(): void
    {
        Http::fake(['*/Cancel' => Http::response(['Success' => true, 'Status' => 'REFUNDED'])]);
        $payment = $this->paidTariff('700001');

        $this->actingAs($this->admin)->post("/admin/finance/payments/{$payment->id}/refund")->assertSessionHas('success');

        $this->assertSame(Payment::STATUS_REFUNDED, $payment->fresh()->status);
        $this->assertSame(ClinicSubscription::STATUS_CANCELLED, ClinicSubscription::query()->where('payment_id', $payment->id)->value('status'));
        $active = app(ClinicSubscriptionService::class)->activeSubscription($this->clinic);
        $this->assertNotSame($this->tariff->id, $active?->tariff_id);
        $this->assertTrue((bool) PaymentRefund::query()->sole()->service_revoked);
    }

    public function test_partial_refund_keeps_tariff_unless_admin_revokes(): void
    {
        Http::fake(['*/Cancel' => Http::response(['Success' => true, 'Status' => 'PARTIAL_REFUNDED'])]);
        $payment = $this->paidTariff('700002');

        $this->actingAs($this->admin)->post("/admin/finance/payments/{$payment->id}/refund", ['amount' => 1000])->assertSessionHas('success');
        $this->assertSame($this->tariff->id, app(ClinicSubscriptionService::class)->activeSubscription($this->clinic)?->tariff_id);

        $this->actingAs($this->admin)->post("/admin/finance/payments/{$payment->id}/refund", ['amount' => 1000, 'revoke_service' => true])->assertSessionHas('success');
        $this->assertNotSame($this->tariff->id, app(ClinicSubscriptionService::class)->activeSubscription($this->clinic)?->tariff_id);
        $this->assertSame(Payment::STATUS_PAID, $payment->fresh()->status);
    }

    public function test_bank_failure_leaves_payment_and_service_untouched(): void
    {
        Http::fake(['*/Cancel' => Http::response(['Success' => false, 'Message' => 'Недостаточно средств'])]);
        $payment = $this->paidTariff('700003');

        $this->actingAs($this->admin)->post("/admin/finance/payments/{$payment->id}/refund")->assertSessionHas('error');

        $this->assertSame(Payment::STATUS_PAID, $payment->fresh()->status);
        $this->assertSame('failed', PaymentRefund::query()->sole()->status);
        $this->assertSame($this->tariff->id, app(ClinicSubscriptionService::class)->activeSubscription($this->clinic)?->tariff_id);
    }

    public function test_refund_in_progress_blocks_second_refund(): void
    {
        Http::fake();
        $payment = $this->paidTariff('700004');
        PaymentRefund::query()->create(['payment_id' => $payment->id, 'amount' => $payment->amount, 'status' => 'processing']);

        $this->actingAs($this->admin)->post("/admin/finance/payments/{$payment->id}/refund", ['amount' => 100])->assertSessionHasErrors('amount');
        Http::assertNothingSent();
    }

    public function test_receipt_is_sent_with_payment_and_refund_only_when_configured(): void
    {
        Http::fake([
            '*/Init' => Http::response(['Success' => true, 'PaymentId' => '800001', 'PaymentURL' => 'https://pay.example/1']),
            '*/Cancel' => Http::response(['Success' => true, 'Status' => 'REFUNDED']),
        ]);

        $this->actingAs($this->owner)->post("/clinic-cabinet/payments/tariffs/{$this->tariff->id}/checkout?branch={$this->clinic->id}");
        Http::assertSent(fn (HttpRequest $r) => str_ends_with($r->url(), '/Init') && ! isset($r['Receipt']));

        app(MonetizationSettings::class)->save(['receipt_enabled' => true, 'receipt_taxation' => 'usn_income', 'receipt_vat' => 'none']);
        Payment::query()->update(['created_at' => now()->subHour()]);
        $this->actingAs($this->owner)->post("/clinic-cabinet/payments/tariffs/{$this->tariff->id}/checkout?branch={$this->clinic->id}");
        Http::assertSent(fn (HttpRequest $r) => str_ends_with($r->url(), '/Init')
            && ($r['Receipt']['Email'] ?? null) === 'owner@clinic.test'
            && ($r['Receipt']['Taxation'] ?? null) === 'usn_income'
            && ($r['Receipt']['Items'][0]['Amount'] ?? null) === $this->tariff->price
            && ($r['Receipt']['Items'][0]['PaymentObject'] ?? null) === 'service');

        $payment = $this->paidTariff('700005');
        $this->actingAs($this->admin)->post("/admin/finance/payments/{$payment->id}/refund", ['amount' => 5000]);
        Http::assertSent(fn (HttpRequest $r) => str_ends_with($r->url(), '/Cancel') && ($r['Receipt']['Items'][0]['Amount'] ?? null) === 5000);
    }

    public function test_receipts_cannot_be_enabled_without_taxation(): void
    {
        $this->actingAs($this->admin)->put('/admin/finance/settings', ['expire_action' => 'downgrade', 'receipt_enabled' => true])
            ->assertSessionHasErrors('receipt_taxation');
        $this->assertFalse(app(MonetizationSettings::class)->receiptsEnabled());
    }

    public function test_repeated_checkout_reuses_pending_payment(): void
    {
        Http::fake(['*/Init' => Http::response(['Success' => true, 'PaymentId' => '800002', 'PaymentURL' => 'https://pay.example/2'])]);

        $this->actingAs($this->owner)->post("/clinic-cabinet/payments/tariffs/{$this->tariff->id}/checkout?branch={$this->clinic->id}")->assertRedirect('https://pay.example/2');
        $this->actingAs($this->owner)->post("/clinic-cabinet/payments/tariffs/{$this->tariff->id}/checkout?branch={$this->clinic->id}")->assertRedirect('https://pay.example/2');

        $this->assertSame(1, Payment::query()->count());
        Http::assertSentCount(1);
    }

    public function test_refund_made_in_bank_dashboard_is_applied_from_webhook(): void
    {
        Http::fake(['*/GetState' => Http::response(['Success' => true, 'Status' => 'REFUNDED', 'PaymentId' => '700006'])]);
        $payment = $this->paidTariff('700006');

        $this->post('/payments/tbank/webhook', $this->signed(['PaymentId' => '700006', 'Status' => 'REFUNDED']))->assertOk();

        $this->assertSame(Payment::STATUS_REFUNDED, $payment->fresh()->status);
        $this->assertSame('bank', PaymentRefund::query()->sole()->source);
        $this->assertSame(ClinicSubscription::STATUS_CANCELLED, ClinicSubscription::query()->where('payment_id', $payment->id)->value('status'));

        // Повторное уведомление ничего не меняет и не превращает возврат в «неуспешный» платёж.
        $this->post('/payments/tbank/webhook', $this->signed(['PaymentId' => '700006', 'Status' => 'REFUNDED']))->assertOk();
        $this->assertSame(Payment::STATUS_REFUNDED, $payment->fresh()->status);
        $this->assertSame(1, PaymentRefund::query()->count());
    }

    public function test_full_refund_of_promotion_removes_placement(): void
    {
        Http::fake(['*/Cancel' => Http::response(['Success' => true, 'Status' => 'REFUNDED'])]);
        $order = PromotionOrder::create([
            'organization_id' => $this->clinic->organization_id, 'clinic_id' => $this->clinic->id, 'city_id' => $this->clinic->city_id,
            'user_id' => $this->owner->id, 'priceable_type' => 'product', 'priceable_id' => 1, 'amount' => 50000,
            'status' => 'paid', 'paid_at' => now(), 'payment_id' => '700007',
        ]);
        $placement = ClinicPromotion::create([
            'order_id' => $order->id, 'clinic_id' => $this->clinic->id, 'city_id' => $this->clinic->city_id,
            'product_code' => 'boost', 'status' => 'active', 'starts_at' => now(), 'ends_at' => now()->addDays(30),
        ]);
        $payment = Payment::query()->create([
            'organization_id' => $this->clinic->organization_id, 'clinic_id' => $this->clinic->id, 'user_id' => $this->owner->id,
            'kind' => Payment::KIND_PROMOTION, 'promotion_order_id' => $order->id, 'amount' => 50000,
            'status' => Payment::STATUS_PAID, 'payment_provider' => 'tbank', 'payment_id' => '700007', 'paid_at' => now(),
        ]);

        $this->actingAs($this->admin)->post("/admin/finance/payments/{$payment->id}/refund")->assertSessionHas('success');

        $this->assertSame('refunded', $placement->fresh()->status);
        $this->assertSame('refunded', $order->fresh()->status);
    }

    public function test_autorenew_skips_while_previous_charge_is_pending_and_notifies_on_failure(): void
    {
        app(MonetizationSettings::class)->save(['autorenew_enabled' => true]);
        $payment = $this->paidTariff('700008');
        $subscription = ClinicSubscription::query()->where('payment_id', $payment->id)->sole();
        $subscription->update(['auto_renew' => true, 'rebill_id' => 'RB-1']);

        Payment::query()->create([
            'organization_id' => $this->clinic->organization_id, 'clinic_id' => $this->clinic->id, 'user_id' => $this->owner->id,
            'kind' => Payment::KIND_TARIFF, 'tariff_id' => $this->tariff->id, 'amount' => $this->tariff->price,
            'status' => Payment::STATUS_PENDING, 'payment_provider' => 'tbank', 'payment_meta' => ['autorenew' => true, 'subscription_id' => $subscription->id],
        ]);
        Http::fake();
        $this->assertFalse(app(PaymentService::class)->attemptAutoRenew($subscription->fresh()));
        Http::assertNothingSent();

        Payment::query()->where('status', Payment::STATUS_PENDING)->update(['status' => Payment::STATUS_FAILED]);
        Http::fake(['*/Init' => Http::response(['Success' => false, 'Message' => 'Карта заблокирована'])]);
        $this->assertFalse(app(PaymentService::class)->attemptAutoRenew($subscription->fresh()));
        $this->assertDatabaseHas('user_notifications', ['user_id' => $this->owner->id, 'type' => 'tariff_renewal_failed']);
    }

    private function paidTariff(string $bankId): Payment
    {
        $payment = Payment::query()->create([
            'organization_id' => $this->clinic->organization_id, 'clinic_id' => $this->clinic->id, 'user_id' => $this->owner->id,
            'kind' => Payment::KIND_TARIFF, 'tariff_id' => $this->tariff->id, 'amount' => $this->tariff->price,
            'status' => Payment::STATUS_PENDING, 'payment_provider' => 'tbank', 'payment_id' => $bankId,
        ]);
        app(PaymentService::class)->markPaid($payment);

        return $payment->fresh();
    }

    /**
     * @param  array<string, string>  $payload
     * @return array<string, string>
     */
    private function signed(array $payload): array
    {
        $payload['TerminalKey'] = 'TBankTest';
        $payload['Token'] = app(TBankAcquiringService::class)->sign($payload);

        return $payload;
    }
}
