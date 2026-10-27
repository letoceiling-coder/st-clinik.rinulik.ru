<?php

namespace App\Services;

use App\Models\Clinic;
use App\Models\ClinicPromotion;
use App\Models\Payment;
use App\Models\PromotionOrder;
use App\Models\PromotionPackage;
use App\Models\PromotionPrice;
use App\Models\PromotionProduct;
use App\Models\PromotionSetting;
use App\Models\Tariff;
use App\Models\User;
use App\Services\Monetization\ClinicSubscriptionService;
use App\Services\Monetization\PaymentService;
use App\Services\Payments\TBankAcquiringService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PromotionService
{
    public function __construct(
        private readonly TBankAcquiringService $tbank,
        private readonly PaymentService $payments,
        private readonly ClinicSubscriptionService $subscriptions,
    ) {}

    public function settings(?int $cityId): PromotionSetting
    {
        if ($cityId) {
            $city = PromotionSetting::query()->where('city_id', $cityId)->first();
            if ($city) {
                return $city;
            }
        }

        return PromotionSetting::query()->whereNull('city_id')->first()
            ?? new PromotionSetting(['max_boost' => 3, 'max_banner_home' => 1, 'max_banner_catalog' => 2]);
    }

    public function resolvePrice(string $type, int $id, int $cityId): ?PromotionPrice
    {
        $modelClass = $type === 'package' ? PromotionPackage::class : PromotionProduct::class;

        /** @var PromotionPrice|null $cityPrice */
        $cityPrice = PromotionPrice::query()
            ->where('priceable_type', $type)
            ->where('priceable_id', $id)
            ->where('city_id', $cityId)
            ->where('is_active', true)
            ->first();

        if ($cityPrice) {
            return $cityPrice;
        }

        return PromotionPrice::query()
            ->where('priceable_type', $type)
            ->where('priceable_id', $id)
            ->whereNull('city_id')
            ->where('is_active', true)
            ->first();
    }

    public function hasActivePublication(Clinic $clinic): bool
    {
        if ($this->subscriptions->activeSubscription($clinic)) {
            return true;
        }

        return ClinicPromotion::query()
            ->active()
            ->where('clinic_id', $clinic->id)
            ->where('product_code', 'publication')
            ->exists();
    }

    /** @return array{ok: bool, message: string|null} */
    public function canPurchase(Clinic $clinic, string $type, int $id): array
    {
        $item = $this->priceable($type, $id);
        if (! $item || ! ($item->is_active ?? true)) {
            return ['ok' => false, 'message' => 'Тариф недоступен.'];
        }

        if ($type === 'product' && ! $this->hasActivePublication($clinic)) {
            return ['ok' => false, 'message' => 'Сначала оформите пакет публикации на сервисе.'];
        }

        $price = $this->resolvePrice($type, $id, (int) $clinic->city_id);
        if (! $price) {
            return ['ok' => false, 'message' => 'Цена для вашего города не задана.'];
        }

        foreach ($this->productCodes($type, $id) as $code) {
            if ($code === 'publication') {
                continue;
            }

            if ($this->availableSlots((int) $clinic->city_id, $code) <= 0) {
                return ['ok' => false, 'message' => 'Достигнут лимит размещений для «'.$this->productLabel($code).'».'];
            }
        }

        return ['ok' => true, 'message' => null];
    }

    /** @param array<string,mixed> $banner */
    public function createOrder(Clinic $clinic, User $user, string $type, int $id, array $banner = []): PromotionOrder
    {
        $check = $this->canPurchase($clinic, $type, $id);
        abort_unless($check['ok'], 422, $check['message']);

        $price = $this->resolvePrice($type, $id, (int) $clinic->city_id);
        abort_unless($price, 422, 'Цена не найдена.');

        $needsModeration = $this->needsModeration($type, $id);

        return PromotionOrder::create([
            'organization_id' => $clinic->organization_id,
            'clinic_id' => $clinic->id,
            'city_id' => $clinic->city_id,
            'user_id' => $user->id,
            'priceable_type' => $type,
            'priceable_id' => $id,
            'amount' => $price->price,
            'status' => 'pending_payment',
            'payment_provider' => 'tbank',
            'banner_image_path' => $banner['image_path'] ?? null,
            'banner_url' => $banner['url'] ?? null,
            'banner_title' => $banner['title'] ?? null,
            'moderation_status' => $needsModeration ? 'pending' : null,
        ]);
    }

    public function initiatePayment(PromotionOrder $order): PromotionOrder
    {
        abort_unless($order->status === 'pending_payment', 422, 'Заказ уже оплачен или отменён.');

        $payment = $this->tbank->createPayment($order);

        $order->update([
            'payment_id' => $payment['payment_id'],
            'payment_url' => $payment['payment_url'],
            'payment_meta' => $payment['meta'],
        ]);

        $ledger = $this->payments->syncFromPromotionOrder($order->fresh());
        $ledger->update([
            'payment_id' => $payment['payment_id'],
            'payment_url' => $payment['payment_url'],
            'payment_meta' => $payment['meta'],
            'status' => Payment::STATUS_PENDING,
        ]);

        return $order->fresh();
    }

    public function syncPayment(PromotionOrder $order): PromotionOrder
    {
        if (! $order->payment_id || $order->isPaid()) {
            return $order;
        }

        $remote = $this->tbank->fetchPayment($order->payment_id);
        if ($remote !== null && $this->remoteMatchesOrder($remote, $order) && $this->remoteIsPaid($remote)) {
            $this->markPaid($order);
        }

        return $order->fresh();
    }

    /**
     * Тело уведомления не считается источником истины: статус платежа всегда перечитывается через GetState Т‑Банка.
     *
     * @param  array<string,mixed>  $payload
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

        $order = PromotionOrder::query()->where('payment_id', $paymentId)->first();
        if (! $order || $order->isPaid()) {
            return;
        }

        $remote = $this->tbank->fetchPayment($paymentId);
        if ($remote === null || ! $this->remoteMatchesOrder($remote, $order)) {
            return;
        }

        if ($this->remoteIsPaid($remote)) {
            $this->markPaid($order);

            return;
        }

        $status = (string) ($remote['Status'] ?? '');
        if (in_array($status, ['REJECTED', 'REVERSED', 'REFUNDED', 'CANCELED'], true)) {
            $order->update(['status' => 'canceled', 'payment_meta' => $remote]);
        }
    }

    /** @param array<string,mixed> $remote */
    private function remoteIsPaid(array $remote): bool
    {
        return ($remote['Success'] ?? false) === true
            && ($remote['Status'] ?? null) === 'CONFIRMED';
    }

    /** @param array<string,mixed> $remote */
    private function remoteMatchesOrder(array $remote, PromotionOrder $order): bool
    {
        $paymentId = (string) ($remote['PaymentId'] ?? $remote['id'] ?? '');
        $amount = (int) ($remote['Amount'] ?? 0);
        $metadataOrderId = (string) ($remote['DATA']['order_id'] ?? $remote['metadata']['order_id'] ?? '');

        return $paymentId === (string) $order->payment_id
            && $amount === (int) $order->amount
            && ($metadataOrderId === '' || $metadataOrderId === (string) $order->id);
    }

    public function markPaid(PromotionOrder $order): void
    {
        if ($order->isPaid()) {
            return;
        }

        DB::transaction(function () use ($order) {
            $order->update(['status' => 'paid', 'paid_at' => now()]);
            $ledger = $this->payments->syncFromPromotionOrder($order);
            $ledger->update(['status' => Payment::STATUS_PAID, 'paid_at' => now()]);
            $this->fulfillOrder($order);
        });
    }

    public function fulfillOrder(PromotionOrder $order): void
    {
        $duration = $this->durationDays($order->priceable_type, $order->priceable_id);
        $startsAt = now();
        $endsAt = now()->addDays($duration);

        $codes = $this->productCodes($order->priceable_type, $order->priceable_id);
        if (in_array('publication', $codes, true)) {
            $tariff = Tariff::query()
                ->where('is_active', true)
                ->where('duration_days', $duration)
                ->orderBy('sort')
                ->first()
                ?? Tariff::query()->where('slug', 'standard')->where('is_active', true)->first();

            if ($tariff) {
                $clinic = Clinic::query()->find($order->clinic_id);
                if ($clinic) {
                    $this->subscriptions->activate($clinic, $tariff, null, $startsAt, $endsAt);
                }
            }
        }

        foreach ($codes as $code) {
            $needsModeration = $this->promotionItemNeedsModeration($order->priceable_type, $order->priceable_id, $code);

            ClinicPromotion::create([
                'order_id' => $order->id,
                'clinic_id' => $order->clinic_id,
                'city_id' => $order->city_id,
                'product_code' => $code,
                'status' => $needsModeration ? 'pending_moderation' : 'active',
                'starts_at' => $needsModeration ? null : $startsAt,
                'ends_at' => $needsModeration ? null : $endsAt,
                'banner_image_path' => $order->banner_image_path,
                'banner_url' => $order->banner_url,
                'banner_title' => $order->banner_title,
            ]);
        }

        if ($order->moderation_status === 'pending') {
            return;
        }

        $order->update(['moderation_status' => null]);
    }

    public function approveOrder(PromotionOrder $order, ?string $note = null): void
    {
        DB::transaction(function () use ($order, $note) {
            $duration = $this->durationDays($order->priceable_type, $order->priceable_id);
            $startsAt = now();
            $endsAt = now()->addDays($duration);

            $order->promotions()
                ->where('status', 'pending_moderation')
                ->update([
                    'status' => 'active',
                    'starts_at' => $startsAt,
                    'ends_at' => $endsAt,
                ]);

            $order->update([
                'moderation_status' => 'approved',
                'moderation_note' => $note,
            ]);
        });
    }

    public function rejectOrder(PromotionOrder $order, string $note): void
    {
        DB::transaction(function () use ($order, $note) {
            $order->promotions()->where('status', 'pending_moderation')->update(['status' => 'rejected']);
            $order->update(['moderation_status' => 'rejected', 'moderation_note' => $note]);
        });
    }

    /** @return list<int> */
    public function boostedClinicIds(int $cityId): array
    {
        return ClinicPromotion::query()
            ->active()
            ->where('city_id', $cityId)
            ->where('product_code', 'boost')
            ->pluck('clinic_id')
            ->unique()
            ->values()
            ->all();
    }

    /** @return Collection<int, ClinicPromotion> */
    public function activeBanners(int $cityId, string $slot): Collection
    {
        return ClinicPromotion::query()
            ->active()
            ->where('city_id', $cityId)
            ->where('product_code', $slot)
            ->with(['clinic:id,slug,name'])
            ->orderByDesc('starts_at')
            ->get();
    }

    public function recordImpression(int $promotionId): void
    {
        ClinicPromotion::query()->whereKey($promotionId)->increment('impressions');
    }

    public function recordClick(int $promotionId): void
    {
        ClinicPromotion::query()->whereKey($promotionId)->increment('clicks');
    }

    public function availableSlots(int $cityId, string $productCode): int
    {
        $settings = $this->settings($cityId);
        $limit = match ($productCode) {
            'boost' => (int) $settings->max_boost,
            'banner_home' => (int) $settings->max_banner_home,
            'banner_catalog' => (int) $settings->max_banner_catalog,
            default => 0,
        };

        $used = ClinicPromotion::query()
            ->active()
            ->where('city_id', $cityId)
            ->where('product_code', $productCode)
            ->count();

        return max(0, $limit - $used);
    }

    /** @return list<string> */
    public function productCodes(string $type, int $id): array
    {
        if ($type === 'product') {
            $product = PromotionProduct::query()->find($id);

            return $product ? [$product->code] : [];
        }

        return PromotionPackage::query()->find($id) ? ['publication'] : [];
    }

    public function durationDays(string $type, int $id): int
    {
        if ($type === 'product') {
            return (int) (PromotionProduct::query()->find($id)?->duration_days ?? 30);
        }

        return (int) (PromotionPackage::query()->find($id)?->duration_days ?? 30);
    }

    public function needsModeration(string $type, int $id): bool
    {
        if ($type === 'package') {
            return false;
        }

        if (app(ContentModerationSettings::class)->moderatePromotions()) {
            return true;
        }

        if ($type === 'product') {
            return (bool) PromotionProduct::query()->find($id)?->requires_moderation;
        }

        return false;
    }

    public function promotionItemNeedsModeration(string $type, int $id, string $code): bool
    {
        if ($code === 'publication') {
            return false;
        }

        if ($this->needsModeration($type, $id)) {
            return true;
        }

        return str_starts_with($code, 'banner_');
    }

    private function priceable(string $type, int $id): ?Model
    {
        return $type === 'package'
            ? PromotionPackage::query()->find($id)
            : PromotionProduct::query()->find($id);
    }

    private function productLabel(string $code): string
    {
        return match ($code) {
            'publication' => 'Публикация на сервисе',
            'boost' => 'Буст',
            'banner_home' => 'Баннер на главной',
            'banner_catalog' => 'Баннер в каталоге',
            default => $code,
        };
    }
}
