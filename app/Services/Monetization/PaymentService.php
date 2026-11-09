<?php

namespace App\Services\Monetization;

use App\Models\AnalyticsEvent;
use App\Models\Clinic;
use App\Models\ClinicSubscription;
use App\Models\Organization;
use App\Models\Payment;
use App\Models\PaymentRefund;
use App\Models\PromotionOrder;
use App\Models\Tariff;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\Analytics\AnalyticsTracker;
use App\Services\Audit;
use App\Services\Payments\TBankAcquiringService;
use App\Services\Payments\TBankReceipt;
use App\Services\PlatformStaffNotifier;
use App\Services\PromotionService;
use Illuminate\Support\Facades\DB;
use Throwable;

class PaymentService
{
    /** Неоплаченный платёж за тот же тариф открывается снова, а не создаётся второй — защита от двойной оплаты. */
    private const REUSE_PENDING_MINUTES = 30;

    /** Пока автосписание в обработке у банка, повторно не списываем. */
    private const RENEWAL_PENDING_DAYS = 3;

    public function __construct(
        private readonly TBankAcquiringService $tbank,
        private readonly ClinicSubscriptionService $subscriptions,
        private readonly MonetizationSettings $monetization,
        private readonly TBankReceipt $receipts,
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

    /** Недавний неоплаченный платёж за этот тариф с готовой ссылкой на оплату — его и открываем повторно. */
    public function reusablePendingCheckout(Clinic $clinic, Tariff $tariff, bool $autoRenew): ?Payment
    {
        return Payment::query()
            ->where('clinic_id', $clinic->id)
            ->where('kind', Payment::KIND_TARIFF)
            ->where('tariff_id', $tariff->id)
            ->where('amount', $tariff->price)
            ->where('status', Payment::STATUS_PENDING)
            ->whereNotNull('payment_url')
            ->where('created_at', '>=', now()->subMinutes(self::REUSE_PENDING_MINUTES))
            ->latest('id')
            ->get()
            ->first(fn (Payment $p) => (bool) data_get($p->payment_meta, 'save_recurrent', false) === $autoRenew
                && data_get($p->payment_meta, 'autorenew') === null);
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
            receipt: $this->receiptFor($payment, (int) $payment->amount),
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

        // Предыдущее списание ещё обрабатывается банком — второе не делаем.
        $inFlight = Payment::query()
            ->where('clinic_id', $clinic->id)
            ->where('kind', Payment::KIND_TARIFF)
            ->where('status', Payment::STATUS_PENDING)
            ->where('created_at', '>=', now()->subDays(self::RENEWAL_PENDING_DAYS))
            ->get(['id', 'payment_meta'])
            ->contains(fn (Payment $p) => (int) data_get($p->payment_meta, 'subscription_id') === (int) $subscription->id);
        if ($inFlight) {
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
                receipt: $this->receiptFor($payment, (int) $tariff->price),
            );
        } catch (Throwable) {
            $payment->update(['status' => Payment::STATUS_FAILED]);
            $this->notifyRenewalFailed($owner, $clinic, $tariff);

            return false;
        }

        $payment->update([
            'payment_id' => $charge['payment_id'],
            'payment_meta' => array_merge($payment->payment_meta ?? [], $charge['meta']),
            'parent_payment_id' => $subscription->payment_id,
        ]);

        $this->syncRemotePayment($payment->fresh(), $charge['payment_id']);
        $payment = $payment->fresh();
        if ($payment->status === Payment::STATUS_FAILED) {
            $this->notifyRenewalFailed($owner, $clinic, $tariff);
        }

        return $payment->isPaid();
    }

    /**
     * Возврат через Т‑Банк (сумма в копейках). Платёж блокируется, возврат сначала записывается «в обработке» —
     * повторный клик или второй админ не вернут деньги дважды. Полный возврат отключает купленную услугу;
     * частичный по умолчанию считается компенсацией, если админ явно не решил иначе.
     */
    public function refund(Payment $payment, User $admin, ?int $amount = null, ?bool $revokeService = null): PaymentRefund
    {
        $refund = DB::transaction(function () use ($payment, $admin, $amount): PaymentRefund {
            $locked = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            abort_unless($locked->isPaid(), 422, 'Возврат возможен только для оплаченных платежей.');
            abort_unless($locked->payment_id, 422, 'У платежа нет идентификатора Т‑Банка.');

            $available = $this->refundableNow($locked);
            $amount ??= $available;
            abort_if($amount <= 0, 422, 'Сумма возврата должна быть больше нуля.');
            abort_if($amount > $available, 422, 'Сумма возврата превышает доступный остаток (или предыдущий возврат ещё обрабатывается).');

            return PaymentRefund::query()->create([
                'payment_id' => $locked->id,
                'admin_user_id' => $admin->id,
                'amount' => $amount,
                'status' => 'processing',
                'source' => 'admin',
            ]);
        });

        try {
            $response = $this->tbank->refundPayment((string) $payment->payment_id, (int) $refund->amount, $this->receiptFor($payment, (int) $refund->amount));
        } catch (Throwable $e) {
            $refund->update(['status' => 'failed', 'provider_response' => ['error' => $e->getMessage()]]);
            Audit::log('payment.refund_failed', $payment, ['amount' => $refund->amount, 'admin_id' => $admin->id]);

            return $refund;
        }

        if (! ($response['Success'] ?? false)) {
            $refund->update(['status' => 'failed', 'provider_response' => $response]);
            Audit::log('payment.refund_failed', $payment, ['amount' => $refund->amount, 'admin_id' => $admin->id]);

            return $refund;
        }

        $this->applyRefund($payment, $refund, $response, $revokeService);
        Audit::log('payment.refunded', $payment, ['amount' => $refund->amount, 'admin_id' => $admin->id, 'service_revoked' => $refund->fresh()->service_revoked]);

        return $refund->fresh();
    }

    /** Что ещё можно вернуть: остаток минус возвраты, которые банк ещё обрабатывает. */
    public function refundableNow(Payment $payment): int
    {
        $processing = (int) PaymentRefund::query()->where('payment_id', $payment->id)->where('status', 'processing')->sum('amount');

        return max(0, $payment->refundableAmount() - $processing);
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
        if ($payment === null) {
            app(PromotionService::class)->handleTBankWebhook($payload);

            return;
        }

        if (in_array($payment->status, [Payment::STATUS_CREATED, Payment::STATUS_PENDING], true)) {
            $this->syncRemotePayment($payment, $paymentId);

            return;
        }

        if ($payment->isPaid()) {
            $this->syncBankRefund($payment);
        }
    }

    public function syncRemotePayment(Payment $payment, ?string $paymentId = null): Payment
    {
        $paymentId ??= (string) $payment->payment_id;
        // Только платежи в ожидании: оплаченный или возвращённый статус по банку не «откатываем» в неуспешный.
        if ($paymentId === '' || ! in_array($payment->status, [Payment::STATUS_CREATED, Payment::STATUS_PENDING], true)) {
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

        // Банк может прислать несколько уведомлений одновременно: блокируем строку и перепроверяем статус,
        // чтобы тариф или продвижение не продлились дважды.
        $activated = DB::transaction(function () use (&$payment, $remote): bool {
            $payment = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            if ($payment->isPaid()) {
                return false;
            }

            $payment->update([
                'status' => Payment::STATUS_PAID,
                'paid_at' => now(),
                'payment_meta' => $remote ? array_merge($payment->payment_meta ?? [], $remote) : $payment->payment_meta,
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

            return true;
        });

        if ($activated) {
            $this->recordPurchaseAnalytics($payment->fresh(['clinic.city:id,slug']));
        }
    }

    /**
     * Возврат, оформленный в личном кабинете Т‑Банка: банк присылает уведомление по уже оплаченному платежу.
     * Полный возврат учитываем и отключаем услугу; сумму частичного банк в статусе не сообщает — просим финансы сверить.
     */
    private function syncBankRefund(Payment $payment): void
    {
        $remote = $this->tbank->fetchPayment((string) $payment->payment_id);
        $status = (string) ($remote['Status'] ?? '');
        if ($remote === null || ! in_array($status, ['REFUNDED', 'REVERSED', 'PARTIAL_REFUNDED', 'PARTIAL_REVERSED'], true)) {
            return;
        }
        // Наш собственный возврат ещё в обработке — уведомление про него, оно учтётся по ответу банка.
        if (PaymentRefund::query()->where('payment_id', $payment->id)->where('status', 'processing')->exists()) {
            return;
        }

        if (in_array($status, ['REFUNDED', 'REVERSED'], true)) {
            $refund = DB::transaction(function () use ($payment, $remote): ?PaymentRefund {
                $locked = Payment::query()->lockForUpdate()->findOrFail($payment->id);
                $remaining = $locked->refundableAmount();
                if (! $locked->isPaid() || $remaining <= 0) {
                    return null;
                }

                return PaymentRefund::query()->create([
                    'payment_id' => $locked->id,
                    'amount' => $remaining,
                    'status' => 'processing',
                    'source' => 'bank',
                    'provider_response' => $remote,
                ]);
            });
            if ($refund !== null) {
                $this->applyRefund($payment, $refund, $remote, true);
                Audit::log('payment.refunded_by_bank', $payment, ['amount' => $refund->amount]);
            }

            return;
        }

        $recentAdminRefund = PaymentRefund::query()->where('payment_id', $payment->id)->where('source', 'admin')
            ->where('status', 'completed')->where('updated_at', '>=', now()->subMinutes(30))->exists();
        if ($recentAdminRefund) {
            return;
        }
        app(PlatformStaffNotifier::class)->notify(
            'admin.finance',
            'payment_bank_refund',
            'Частичный возврат в Т‑Банке',
            "По платежу №{$payment->id} в личном кабинете банка оформлен частичный возврат. Сверьте сумму и отметьте решение по услуге.",
            '/admin/finance',
        );
        Audit::log('payment.partial_refund_by_bank', $payment);
    }

    /** Возврат подтверждён банком: учитываем сумму и при необходимости отключаем услугу. */
    private function applyRefund(Payment $payment, PaymentRefund $refund, array $response, ?bool $revokeService): void
    {
        DB::transaction(function () use ($payment, $refund, $response, $revokeService): void {
            $locked = Payment::query()->lockForUpdate()->findOrFail($payment->id);
            $totalRefunded = (int) $locked->refunded_amount + (int) $refund->amount;
            $full = $totalRefunded >= (int) $locked->amount;

            $locked->update([
                'refunded_amount' => $totalRefunded,
                'status' => $full ? Payment::STATUS_REFUNDED : Payment::STATUS_PAID,
                'refunded_at' => now(),
            ]);

            $revoked = ($revokeService ?? $full) && $this->revokeService($locked);
            $refund->update(['status' => 'completed', 'provider_response' => $response, 'service_revoked' => $revoked]);
        });
    }

    /** Отключает то, что было куплено этим платежом: тариф или продвижение. */
    private function revokeService(Payment $payment): bool
    {
        if ($payment->kind === Payment::KIND_TARIFF) {
            return $this->subscriptions->revokeForRefund($payment);
        }
        if ($payment->kind === Payment::KIND_PROMOTION && $payment->promotion_order_id) {
            $order = PromotionOrder::query()->find($payment->promotion_order_id);
            if ($order !== null) {
                app(PromotionService::class)->revokeForRefund($order);

                return true;
            }
        }

        return false;
    }

    /** Чек 54-ФЗ на сумму платежа или возврата; null — чеки выключены или некуда отправить. */
    private function receiptFor(Payment $payment, int $amount): ?array
    {
        return $this->receipts->make(
            (string) ($payment->description ?: 'Услуги размещения на сайте'),
            $amount,
            $payment->user_id ? User::query()->find($payment->user_id) : null,
            $payment->organization_id ? Organization::query()->find($payment->organization_id) : null,
        );
    }

    private function notifyRenewalFailed(User $owner, Clinic $clinic, Tariff $tariff): void
    {
        UserNotification::query()->create([
            'user_id' => $owner->id,
            'type' => 'tariff_renewal_failed',
            'title' => 'Не удалось продлить тариф',
            'body' => "Банк не списал оплату за тариф «{$tariff->name}» для «{$clinic->name}». Проверьте карту или оплатите тариф вручную, чтобы не потерять возможности.",
            'url' => '/clinic-cabinet/payments',
        ]);
        Audit::log('payment.autorenew_failed', $clinic, ['tariff_id' => $tariff->id]);
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
