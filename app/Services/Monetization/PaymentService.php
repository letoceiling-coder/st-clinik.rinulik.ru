<?php

namespace App\Services\Monetization;

use App\Models\AnalyticsEvent;
use App\Models\Clinic;
use App\Models\ClinicSubscription;
use App\Models\Payment;
use App\Models\PaymentRefund;
use App\Models\PromotionOrder;
use App\Models\Tariff;
use App\Models\User;
use App\Services\Analytics\AnalyticsTracker;
use App\Services\Audit;
use App\Services\Payments\TBankAcquiringService;
use App\Services\PromotionService;
use Illuminate\Support\Facades\DB;

class PaymentService
{
    public function __construct(
        private readonly TBankAcquiringService $tbank,
        private readonly ClinicSubscriptionService $subscriptions,
        private readonly MonetizationSettings $monetization,
    ) {}

    public function createTariffCheckout(Clinic $clinic, User $user, Tariff $tariff): Payment
    {
        abort_unless($tariff->is_active, 422, 'Тариф недоступен.');
        abort_if($tariff->price <= 0, 422, 'Бесплатный тариф подключается автоматически.');

        return Payment::query()->create([
            'organization_id' => $clinic->organization_id,
            'clinic_id' => $clinic->id,
            'user_id' => $user->id,
            'kind' => Payment::KIND_TARIFF,
            'tariff_id' => $tariff->id,
            'amount' => $tariff->price,
            'status' => Payment::STATUS_CREATED,
            'payment_provider' => 'tbank',
            'description' => 'Тариф «'.$tariff->name.'» для клиники #'.$clinic->id,
        ]);
    }

    public function initiate(Payment $payment, bool $saveRecurrent = false): Payment
    {
        abort_unless(in_array($payment->status, [Payment::STATUS_CREATED, Payment::STATUS_PENDING], true), 422, 'Платёж уже завершён.');

        $customerKey = $payment->clinic_id ? 'clinic-'.$payment->clinic_id : null;

        $init = $this->tbank->initPayment(
            amount: (int) $payment->amount,
            orderId: sprintf('pay-%d-%d', $payment->id, now()->timestamp),
            description: (string) ($payment->description ?? 'Оплата на МирКлиник'),
            metadata: ['payment_id' => (string) $payment->id],
            successUrl: route('cabinet.payments.return', ['payment' => $payment->id]),
            failUrl: route('cabinet.payments.index'),
            saveRecurrent: $saveRecurrent,
            customerKey: $customerKey,
        );

        $payment->update([
            'status' => Payment::STATUS_PENDING,
            'payment_id' => $init['payment_id'],
            'payment_url' => $init['payment_url'],
            'payment_meta' => array_merge($payment->payment_meta ?? [], $init['meta'], $saveRecurrent ? ['save_recurrent' => true] : []),
        ]);

        return $payment->fresh();
    }

    public function attemptAutoRenew(ClinicSubscription $subscription): bool
    {
        if (! $this->monetization->autorenewEnabled() || ! $subscription->auto_renew || ! $subscription->rebill_id) {
            return false;
        }

        $tariff = $subscription->tariff;
        $clinic = $subscription->clinic;
        if (! $tariff || ! $clinic || $tariff->price <= 0) {
            return false;
        }

        $owner = $clinic->organization?->owner;
        if (! $owner) {
            return false;
        }

        $payment = Payment::query()->create([
            'organization_id' => $clinic->organization_id,
            'clinic_id' => $clinic->id,
            'user_id' => $owner->id,
            'kind' => Payment::KIND_TARIFF,
            'tariff_id' => $tariff->id,
            'amount' => $tariff->price,
            'status' => Payment::STATUS_PENDING,
            'payment_provider' => 'tbank',
            'description' => 'Автопродление тарифа «'.$tariff->name.'»',
            'payment_meta' => ['autorenew' => true, 'subscription_id' => $subscription->id],
        ]);

        try {
            $charge = $this->tbank->chargeWithRebill(
                amount: (int) $tariff->price,
                orderId: sprintf('renew-%d-%d', $subscription->id, now()->timestamp),
                description: (string) $payment->description,
                rebillId: (string) $subscription->rebill_id,
                metadata: ['payment_id' => (string) $payment->id],
            );
        } catch (\Throwable) {
            $payment->update(['status' => Payment::STATUS_FAILED]);

            return false;
        }

        $payment->update([
            'payment_id' => $charge['payment_id'],
            'payment_meta' => $charge['meta'],
            'parent_payment_id' => $subscription->payment_id,
        ]);

        $this->syncRemotePayment($payment->fresh(), $charge['payment_id']);

        return $payment->fresh()->isPaid();
    }

    public function refund(Payment $payment, User $admin, ?int $amount = null): PaymentRefund
    {
        abort_unless($payment->isPaid(), 422, 'Возврат возможен только для оплаченных платежей.');
        abort_unless($payment->payment_id, 422, 'У платежа нет идентификатора Т‑Банка.');

        $amount = $amount ?? $payment->refundableAmount();
        abort_if($amount <= 0, 422, 'Сумма возврата должна быть больше нуля.');
        abort_if($amount > $payment->refundableAmount(), 422, 'Сумма возврата превышает доступный остаток.');

        $response = $this->tbank->refundPayment((string) $payment->payment_id, $amount);

        return DB::transaction(function () use ($payment, $admin, $amount, $response): PaymentRefund {
            $refund = PaymentRefund::query()->create([
                'payment_id' => $payment->id,
                'admin_user_id' => $admin->id,
                'amount' => $amount,
                'status' => ($response['Success'] ?? false) ? 'completed' : 'failed',
                'provider_response' => $response,
            ]);

            if ($response['Success'] ?? false) {
                $totalRefunded = (int) $payment->refunded_amount + $amount;
                $payment->update([
                    'refunded_amount' => $totalRefunded,
                    'status' => $totalRefunded >= (int) $payment->amount ? Payment::STATUS_REFUNDED : Payment::STATUS_PAID,
                    'refunded_at' => now(),
                ]);
            }

            Audit::log('payment.refunded', $payment, ['amount' => $amount, 'admin_id' => $admin->id]);

            return $refund;
        });
    }

    public function syncFromPromotionOrder(PromotionOrder $order): Payment
    {
        $existing = Payment::query()->where('promotion_order_id', $order->id)->first();
        if ($existing) {
            return $existing;
        }

        return Payment::query()->create([
            'organization_id' => $order->organization_id,
            'clinic_id' => $order->clinic_id,
            'user_id' => $order->user_id,
            'kind' => Payment::KIND_PROMOTION,
            'promotion_order_id' => $order->id,
            'amount' => $order->amount,
            'status' => $order->isPaid() ? Payment::STATUS_PAID : Payment::STATUS_PENDING,
            'payment_provider' => $order->payment_provider,
            'payment_id' => $order->payment_id,
            'payment_url' => $order->payment_url,
            'payment_meta' => $order->payment_meta,
            'paid_at' => $order->paid_at,
            'description' => 'Продвижение, заказ #'.$order->id,
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function handleTBankWebhook(array $payload): void
    {
        if (! $this->tbank->verifyNotification($payload)) {
            return;
        }

        $paymentId = (string) ($payload['PaymentId'] ?? '');
        if ($paymentId === '') {
            return;
        }

        $payment = Payment::query()->where('payment_id', $paymentId)->first();
        if ($payment && ! $payment->isPaid()) {
            $this->syncRemotePayment($payment, $paymentId);

            return;
        }

        app(PromotionService::class)->handleTBankWebhook($payload);
    }

    public function syncRemotePayment(Payment $payment, ?string $paymentId = null): Payment
    {
        $paymentId ??= (string) $payment->payment_id;
        if ($paymentId === '' || $payment->isPaid()) {
            return $payment;
        }

        $remote = $this->tbank->fetchPayment($paymentId);
        if ($remote === null || ! $this->remoteMatchesPayment($remote, $payment)) {
            return $payment;
        }

        if ($this->remoteIsPaid($remote)) {
            $this->markPaid($payment, $remote);

            return $payment->fresh();
        }

        $status = (string) ($remote['Status'] ?? '');
        if (in_array($status, ['REJECTED', 'REVERSED', 'REFUNDED', 'CANCELED'], true)) {
            $payment->update(['status' => Payment::STATUS_FAILED, 'payment_meta' => $remote]);
        }

        return $payment->fresh();
    }

    /** @param array<string, mixed> $remote */
    public function markPaid(Payment $payment, array $remote = []): void
    {
        if ($payment->isPaid()) {
            return;
        }

        DB::transaction(function () use ($payment, $remote): void {
            $payment->update([
                'status' => Payment::STATUS_PAID,
                'paid_at' => now(),
                'payment_meta' => $remote ?: $payment->payment_meta,
            ]);

            $rebillId = (string) ($remote['RebillId'] ?? data_get($remote, 'rebillId') ?? '');
            if ($rebillId !== '') {
                $payment->update(['rebill_id' => $rebillId]);
            }

            if ($payment->kind === Payment::KIND_TARIFF && $payment->tariff_id) {
                $tariff = Tariff::query()->find($payment->tariff_id);
                $clinic = Clinic::query()->find($payment->clinic_id);
                if ($tariff && $clinic) {
                    $autoRenew = (bool) data_get($payment->payment_meta, 'save_recurrent', false)
                        || (bool) data_get($payment->payment_meta, 'autorenew', false);
                    $subscription = $this->subscriptions->extendFromTariffPurchase($clinic, $tariff, $payment, $autoRenew, $rebillId ?: null);
                    if ($rebillId !== '') {
                        $subscription->update(['rebill_id' => $rebillId]);
                    }
                }
            }

            if ($payment->kind === Payment::KIND_PROMOTION && $payment->promotion_order_id) {
                $order = PromotionOrder::query()->find($payment->promotion_order_id);
                if ($order && ! $order->isPaid()) {
                    app(PromotionService::class)->markPaid($order);
                }
            }
        });

        $this->recordPurchaseAnalytics($payment->fresh(['clinic.city:id,slug']));
    }

    private function recordPurchaseAnalytics(Payment $payment): void
    {
        if (! $payment->isPaid()) {
            return;
        }

        $citySlug = $payment->clinic?->city?->slug;
        $tracker = app(AnalyticsTracker::class);

        if ($payment->kind === Payment::KIND_TARIFF) {
            $tracker->track(AnalyticsEvent::EVENT_TARIFF_PURCHASE, [
                'payment_id' => $payment->id,
                'tariff_id' => $payment->tariff_id,
            ], $citySlug);
        }

        if ($payment->kind === Payment::KIND_PROMOTION) {
            $tracker->track(AnalyticsEvent::EVENT_AD_PURCHASE, [
                'payment_id' => $payment->id,
                'order_id' => $payment->promotion_order_id,
            ], $citySlug);
        }
    }

    /** @param array<string, mixed> $remote */
    private function remoteIsPaid(array $remote): bool
    {
        return ($remote['Success'] ?? false) === true
            && ($remote['Status'] ?? null) === 'CONFIRMED';
    }

    /** @param array<string, mixed> $remote */
    private function remoteMatchesPayment(array $remote, Payment $payment): bool
    {
        $paymentId = (string) ($remote['PaymentId'] ?? $remote['id'] ?? '');
        $amount = (int) ($remote['Amount'] ?? 0);
        $metadataPaymentId = (string) ($remote['DATA']['payment_id'] ?? $remote['metadata']['payment_id'] ?? '');

        return $paymentId === (string) $payment->payment_id
            && $amount === (int) $payment->amount
            && ($metadataPaymentId === '' || $metadataPaymentId === (string) $payment->id);
    }
}
