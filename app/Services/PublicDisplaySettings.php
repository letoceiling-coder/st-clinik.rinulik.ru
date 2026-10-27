<?php

namespace App\Services;

use App\Models\SiteSetting;
use Illuminate\Support\Facades\Cache;

/** Переключатели публичного интерфейса (главная и т.п.). */
class PublicDisplaySettings
{
    private const KEY = 'public_display.settings';

    private const CACHE_KEY = 'site_setting:public_display';

    public function homeMapEnabled(): bool
    {
        return (bool) $this->all()['home_map_enabled'];
    }

    public function adsEnabled(): bool
    {
        return (bool) $this->all()['ads_enabled'];
    }

    /** @return array{home_map_enabled: bool, ads_enabled: bool} */
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

    /** @return array{home_map_enabled: bool, ads_enabled: bool} */
    private function defaults(): array
    {
        return [
            'home_map_enabled' => true,
            'ads_enabled' => true,
        ];
    }
}
