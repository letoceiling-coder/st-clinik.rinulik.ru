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

    /** Системы налогообложения в формате Т‑Банка. */
    public const TAXATIONS = [
        'osn' => 'ОСН',
        'usn_income' => 'УСН «доходы»',
        'usn_income_outcome' => 'УСН «доходы минус расходы»',
        'patent' => 'Патент (ПСН)',
    ];

    /** Ставки НДС в формате Т‑Банка. */
    public const VAT_RATES = [
        'none' => 'Без НДС',
        'vat0' => 'НДС 0%',
        'vat5' => 'НДС 5%',
        'vat7' => 'НДС 7%',
        'vat10' => 'НДС 10%',
        'vat20' => 'НДС 20%',
    ];

    /** Чеки включены и налогообложение указано — иначе банк получил бы неверный чек. */
    public function receiptsEnabled(): bool
    {
        $all = $this->all();

        return (bool) $all['receipt_enabled'] && isset(self::TAXATIONS[(string) $all['receipt_taxation']]);
    }

    public function receiptTaxation(): ?string
    {
        $taxation = (string) $this->all()['receipt_taxation'];

        return isset(self::TAXATIONS[$taxation]) ? $taxation : null;
    }

    public function receiptVat(): string
    {
        $vat = (string) $this->all()['receipt_vat'];

        return isset(self::VAT_RATES[$vat]) ? $vat : 'none';
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
            // Чеки 54-ФЗ через онлайн-кассу Т‑Банка. Налогообложение задаёт бухгалтерия; без него чеки не отправляются.
            'receipt_enabled' => false,
            'receipt_taxation' => null,
            'receipt_vat' => 'none',
        ];
    }
}
