<?php

namespace App\Services;

use App\Models\SiteSetting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class ClinicCardDisplaySettings
{
    private const CACHE_KEY = 'site_settings.premium_clinic_card_variant';

    private const SETTING_KEY = 'premium_clinic_card_variant';

    /** @return array<string, array{label: string, description: string, class: string}> */
    public function premiumVariants(): array
    {
        /** @var array<string, array{label: string, description: string, class: string}> $variants */
        $variants = config('clinic_cards.premium_variants', []);

        return $variants;
    }

    public function premiumVariant(): string
    {
        $variants = $this->premiumVariants();
        $keys = array_keys($variants);

        if ($keys === []) {
            return 'ivory_gold';
        }

        $stored = $this->storedVariant();
        if ($stored === 'champagne_gold') {
            $stored = 'avito_blue';
        }
        if ($stored !== null && in_array($stored, $keys, true)) {
            return $stored;
        }

        $fallback = (string) config('clinic_cards.premium_variant', $keys[0]);

        return in_array($fallback, $keys, true) ? $fallback : $keys[0];
    }

    public function premiumVariantClass(): string
    {
        $variants = $this->premiumVariants();
        $id = $this->premiumVariant();

        return $variants[$id]['class'] ?? 'clinic-card--premium-ivory';
    }

    public function setPremiumVariant(string $variant): void
    {
        $keys = array_keys($this->premiumVariants());
        if (! in_array($variant, $keys, true)) {
            abort(422, 'Unknown premium card variant.');
        }

        SiteSetting::query()->updateOrCreate(
            ['key' => self::SETTING_KEY],
            ['value' => $variant],
        );

        Cache::forget(self::CACHE_KEY);
    }

    private function storedVariant(): ?string
    {
        if (! Schema::hasTable('site_settings')) {
            return null;
        }

        $value = Cache::rememberForever(self::CACHE_KEY, function () {
            return SiteSetting::query()->where('key', self::SETTING_KEY)->value('value');
        });

        return is_string($value) && $value !== '' ? $value : null;
    }
}
