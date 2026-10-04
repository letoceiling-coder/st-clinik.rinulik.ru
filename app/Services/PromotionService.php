<?php

namespace App\Services;

use App\Models\Clinic;
use App\Models\ClinicPromotion;
use App\Models\PromotionOrder;
use App\Models\PromotionPackage;
use App\Models\PromotionPrice;
use App\Models\PromotionProduct;
use App\Models\PromotionSetting;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class PromotionService
{
    public function __construct(private readonly YooKassaService $yookassa) {}

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
            'payment_provider' => 'yookassa',
            'banner_image_path' => $banner['image_path'] ?? null,
            'banner_url' => $banner['url'] ?? null,
            'banner_title' => $banner['title'] ?? null,
            'moderation_status' => $needsModeration ? 'pending' : null,
        ]);
    }

    public function initiatePayment(PromotionOrder $order): PromotionOrder
    {
        abort_unless($order->status === 'pending_payment', 422, 'Заказ уже оплачен или отменён.');

        $payment = $this->yookassa->createPayment($order);

        $order->update([
            'payment_id' => $payment['payment_id'],
            'payment_url' => $payment['payment_url'],
            'payment_meta' => $payment['meta'],
        ]);

        return $order->fresh();
    }

    public function syncPayment(PromotionOrder $order): PromotionOrder
    {
        if (! $order->payment_id || $order->isPaid()) {
            return $order;
        }

        $remote = $this->yookassa->fetchPayment($order->payment_id);
        if (($remote['status'] ?? null) === 'succeeded') {
            $this->markPaid($order);
        }

        return $order->fresh();
    }

    /** @param array<string,mixed> $payload */
    public function handleWebhook(array $payload): void
    {
        $event = $payload['event'] ?? null;
        $object = $payload['object'] ?? [];
        $paymentId = $object['id'] ?? null;

        if (! $paymentId) {
            return;
        }

        $order = PromotionOrder::query()->where('payment_id', $paymentId)->first();
        if (! $order) {
            return;
        }

        if ($event === 'payment.succeeded' || ($object['status'] ?? null) === 'succeeded') {
            $this->markPaid($order);
        } elseif (in_array($event, ['payment.canceled', 'payment.waiting_for_capture'], true)) {
            $order->update(['status' => 'canceled', 'payment_meta' => $object]);
        }
    }

    public function markPaid(PromotionOrder $order): void
    {
        if ($order->isPaid()) {
            return;
        }

        DB::transaction(function () use ($order) {
            $order->update(['status' => 'paid', 'paid_at' => now()]);
            $this->fulfillOrder($order);
        });
    }

    public function fulfillOrder(PromotionOrder $order): void
    {
        $duration = $this->durationDays($order->priceable_type, $order->priceable_id);
        $startsAt = now();
        $endsAt = now()->addDays($duration);

        foreach ($this->productCodes($order->priceable_type, $order->priceable_id) as $code) {
            $needsModeration = str_starts_with($code, 'banner_');

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
        if ($type === 'product') {
            return (bool) PromotionProduct::query()->find($id)?->requires_moderation;
        }

        return false;
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
