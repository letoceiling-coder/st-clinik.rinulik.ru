<?php

namespace App\Services\Monetization;

use App\Models\SiteSetting;
use Illuminate\Support\Facades\Cache;

class MonetizationSettings
{
    private const KEY = 'monetization.settings';

    private const CACHE_KEY = 'site_setting:monetization';

    public function autorenewEnabled(): bool
    {
        return (bool) $this->all()['autorenew_enabled'];
    }

    public function autorenewChargeDaysBefore(): int
    {
        return max(0, (int) $this->all()['autorenew_charge_days_before']);
    }

    /** @return array<string, mixed> */
    public function all(): array
    {
        $stored = Cache::rememberForever(self::CACHE_KEY, fn () => SiteSetting::query()->where('key', self::KEY)->value('value'));
        $decoded = is_string($stored) ? json_decode($stored, true) : null;

        return array_merge($this->defaults(), is_array($decoded) ? $decoded : []);
    }

    /** @param array<string, mixed> $payload */
    public function save(array $payload): void
    {
        $next = array_merge($this->all(), $payload);
        SiteSetting::query()->updateOrCreate(
            ['key' => self::KEY],
            ['value' => json_encode($next, JSON_UNESCAPED_UNICODE)],
        );
        Cache::forget(self::CACHE_KEY);
    }

    public function requireActiveTariffForCatalog(): bool
    {
        return (bool) $this->all()['require_active_tariff_for_catalog'];
    }

    public function autoAssignDefaultTariff(): bool
    {
        return (bool) $this->all()['auto_assign_default_tariff'];
    }

    public function expireAction(): string
    {
        return (string) $this->all()['expire_action'];
    }

    public function trialEnabled(): bool
    {
        return (bool) $this->all()['trial_enabled'] && $this->trialDays() > 0;
    }

    public function trialDays(): int
    {
        return max(0, min(365, (int) $this->all()['trial_days']));
    }

    /** Тариф пробного периода; null — самый дорогой активный тариф. */
    public function trialTariffId(): ?int
    {
        $id = $this->all()['trial_tariff_id'];

        return $id ? (int) $id : null;
    }

    /** @return array<string, mixed> */
    private function defaults(): array
    {
        return [
            'require_active_tariff_for_catalog' => false,
            'auto_assign_default_tariff' => true,
            'expire_action' => 'downgrade',
            'autorenew_enabled' => true,
            'autorenew_charge_days_before' => 1,
            'trial_enabled' => true,
            'trial_days' => 30,
            'trial_tariff_id' => null,
        ];
    }
}
