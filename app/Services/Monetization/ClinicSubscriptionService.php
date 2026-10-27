<?php

namespace App\Services\Monetization;

use App\Models\Clinic;
use App\Models\ClinicPhoto;
use App\Models\ClinicSubscription;
use App\Models\Doctor;
use App\Models\Payment;
use App\Models\Tariff;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ClinicSubscriptionService
{
    public function __construct(private readonly MonetizationSettings $settings) {}

    public function activeSubscription(Clinic $clinic): ?ClinicSubscription
    {
        return ClinicSubscription::query()
            ->where('clinic_id', $clinic->id)
            ->where('status', ClinicSubscription::STATUS_ACTIVE)
            ->where('ends_at', '>', now())
            ->with('tariff')
            ->orderByDesc('ends_at')
            ->first();
    }

    public function activeTariff(Clinic $clinic): ?Tariff
    {
        return $this->activeSubscription($clinic)?->tariff;
    }

    public function hasCatalogAccess(Clinic $clinic): bool
    {
        if (! $this->settings->requireActiveTariffForCatalog()) {
            return true;
        }

        $tariff = $this->activeTariff($clinic);

        return $tariff !== null && ($tariff->price > 0 || $tariff->is_default);
    }

    public function assignDefaultIfNeeded(Clinic $clinic): void
    {
        if (! $this->settings->autoAssignDefaultTariff()) {
            return;
        }

        if ($this->activeSubscription($clinic)) {
            return;
        }

        $default = Tariff::query()->where('is_default', true)->where('is_active', true)->first();
        if (! $default) {
            return;
        }

        $this->activate($clinic, $default, null, now(), now()->addDays((int) $default->duration_days));
    }

    public function activate(
        Clinic $clinic,
        Tariff $tariff,
        ?Payment $payment,
        \DateTimeInterface $startsAt,
        \DateTimeInterface $endsAt,
        bool $autoRenew = false,
        ?string $rebillId = null,
    ): ClinicSubscription {
        $previous = $this->activeSubscription($clinic);

        ClinicSubscription::query()
            ->where('clinic_id', $clinic->id)
            ->where('status', ClinicSubscription::STATUS_ACTIVE)
            ->update(['status' => ClinicSubscription::STATUS_EXPIRED]);

        return ClinicSubscription::query()->create([
            'clinic_id' => $clinic->id,
            'tariff_id' => $tariff->id,
            'payment_id' => $payment?->id,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'status' => ClinicSubscription::STATUS_ACTIVE,
            'auto_renew' => $autoRenew ?: (bool) ($previous?->auto_renew),
            'rebill_id' => $rebillId ?: $previous?->rebill_id,
        ]);
    }

    public function extendFromTariffPurchase(
        Clinic $clinic,
        Tariff $tariff,
        Payment $payment,
        bool $autoRenew = false,
        ?string $rebillId = null,
    ): ClinicSubscription {
        $current = $this->activeSubscription($clinic);
        $startsAt = now();
        $base = ($current && $current->ends_at->isFuture()) ? $current->ends_at : $startsAt;
        $endsAt = $base->copy()->addDays((int) $tariff->duration_days);

        return DB::transaction(function () use ($clinic, $tariff, $payment, $startsAt, $endsAt, $autoRenew, $rebillId): ClinicSubscription {
            $subscription = $this->activate($clinic, $tariff, $payment, $startsAt, $endsAt, $autoRenew, $rebillId);
            $payment->update([
                'service_starts_at' => $startsAt,
                'service_ends_at' => $endsAt,
            ]);

            return $subscription;
        });
    }

    public function setAutoRenew(Clinic $clinic, bool $enabled): void
    {
        $subscription = $this->activeSubscription($clinic);
        abort_unless($subscription, 422, 'Нет активной подписки.');
        abort_unless($subscription->rebill_id || ! $enabled, 422, 'Сначала оплатите тариф с сохранением карты для автопродления.');

        $subscription->update(['auto_renew' => $enabled]);
    }

    /** @return Collection<int, ClinicSubscription> */
    public function subscriptionsDueForAutoRenew(): Collection
    {
        if (! $this->settings->autorenewEnabled()) {
            return collect();
        }

        $days = $this->settings->autorenewChargeDaysBefore();
        $windowStart = now()->addDays($days)->startOfDay();
        $windowEnd = now()->addDays($days)->endOfDay();

        return ClinicSubscription::query()
            ->where('status', ClinicSubscription::STATUS_ACTIVE)
            ->where('auto_renew', true)
            ->whereNotNull('rebill_id')
            ->whereBetween('ends_at', [$windowStart, $windowEnd])
            ->with(['clinic.organization.owner', 'tariff'])
            ->get();
    }

    /** @return array{ok: bool, message: string|null} */
    public function canAddBranch(Clinic $clinic, int $organizationBranchCount): array
    {
        return $this->checkLimit($clinic, 'max_branches', $organizationBranchCount, 'филиалов');
    }

    /** @return array{ok: bool, message: string|null} */
    public function canAddDoctor(Clinic $clinic): array
    {
        $count = Doctor::query()->where('clinic_id', $clinic->id)->count();

        return $this->checkLimit($clinic, 'max_doctors', $count, 'врачей');
    }

    /** @return array{ok: bool, message: string|null} */
    public function canAddPhoto(Clinic $clinic): array
    {
        $count = ClinicPhoto::query()->where('clinic_id', $clinic->id)->count();

        return $this->checkLimit($clinic, 'max_photos', $count, 'фото');
    }

    public function featureEnabled(Clinic $clinic, string $feature): bool
    {
        $tariff = $this->activeTariff($clinic);
        if (! $tariff) {
            return false;
        }

        return $tariff->hasFeature($feature);
    }

    public function expireDueSubscriptions(): int
    {
        $expired = ClinicSubscription::query()
            ->where('status', ClinicSubscription::STATUS_ACTIVE)
            ->where('ends_at', '<=', now())
            ->get();

        foreach ($expired as $subscription) {
            $subscription->update(['status' => ClinicSubscription::STATUS_EXPIRED]);
            $this->afterExpire($subscription->clinic);
        }

        return $expired->count();
    }

    /** @return list<array{subscription: ClinicSubscription, days_left: int, owner: User|null}> */
    public function subscriptionsNeedingReminder(int $daysBefore): array
    {
        $target = now()->addDays($daysBefore)->startOfDay();
        $end = $target->copy()->endOfDay();

        return ClinicSubscription::query()
            ->where('status', ClinicSubscription::STATUS_ACTIVE)
            ->whereBetween('ends_at', [$target, $end])
            ->with(['clinic.organization.owner', 'tariff'])
            ->get()
            ->filter(function (ClinicSubscription $subscription) use ($daysBefore): bool {
                $sent = $subscription->reminder_days_sent ?? [];

                return ! in_array($daysBefore, $sent, true);
            })
            ->map(fn (ClinicSubscription $s) => [
                'subscription' => $s,
                'days_left' => $daysBefore,
                'owner' => $s->clinic?->organization?->owner,
            ])
            ->values()
            ->all();
    }

    public function markReminderSent(ClinicSubscription $subscription, int $daysBefore): void
    {
        $sent = $subscription->reminder_days_sent ?? [];
        $sent[] = $daysBefore;
        $subscription->update(['reminder_days_sent' => array_values(array_unique($sent))]);
    }

    /** @return array{ok: bool, message: string|null} */
    private function checkLimit(Clinic $clinic, string $field, int $currentCount, string $label): array
    {
        $tariff = $this->activeTariff($clinic);
        if (! $tariff) {
            return ['ok' => false, 'message' => 'Нет активного тарифа. Оформите подписку в разделе «Тариф и платежи».'];
        }

        $limit = $tariff->{$field};
        if ($limit === null) {
            return ['ok' => true, 'message' => null];
        }

        if ($currentCount >= $limit) {
            return ['ok' => false, 'message' => "Достигнут лимит тарифа «{$tariff->name}»: не более {$limit} {$label}."];
        }

        return ['ok' => true, 'message' => null];
    }

    private function afterExpire(Clinic $clinic): void
    {
        $action = $this->settings->expireAction();
        if ($action === 'none') {
            return;
        }

        if ($action === 'hide' && $clinic->status === 'published') {
            $clinic->update(['status' => 'hidden']);
        }

        if ($action === 'downgrade') {
            $default = Tariff::query()->where('is_default', true)->where('is_active', true)->first();
            if ($default) {
                $this->activate($clinic, $default, null, now(), now()->addDays((int) $default->duration_days));
            }
        }
    }
}
