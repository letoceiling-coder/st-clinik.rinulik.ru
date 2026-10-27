<?php

namespace App\Services\Offers;

use App\Models\DemoLink;
use App\Models\SiteSetting;
use Illuminate\Support\Facades\Cache;

/**
 * Глобальные настройки КП: ограничения демо-ссылок по умолчанию, правила рассылки, данные менеджера.
 *
 * @phpstan-type Settings array{
 *     offer_expires_days: int,
 *     demo: array{expires_days: int, max_opens: int|null, max_devices: int|null, sections: list<string>, show_tariffs: bool, notify_manager: bool, revoke_on_connect: bool},
 *     rules: array{min_days_between: int, daily_email: int, daily_sms: int, send_from_hour: int, send_to_hour: int},
 *     manager: array{name: string, phone: string, email: string}
 * }
 */
class OfferSettings
{
    private const KEY = 'offers.settings';

    private const CACHE_KEY = 'site_settings.offers.settings';

    /** @return Settings */
    public function defaults(): array
    {
        return [
            'offer_expires_days' => 60,
            'demo' => [
                'expires_days' => 14,
                'max_opens' => 30,
                'max_devices' => 3,
                'sections' => array_keys(DemoLink::SECTIONS),
                'show_tariffs' => true,
                'notify_manager' => true,
                'revoke_on_connect' => true,
            ],
            'rules' => [
                'min_days_between' => 30,
                'daily_email' => 100,
                'daily_sms' => 50,
                'send_from_hour' => 9,
                'send_to_hour' => 19,
            ],
            'manager' => ['name' => '', 'phone' => '', 'email' => ''],
            'ai' => ['model' => 'deepseek/deepseek-chat'],
        ];
    }

    /** Модель OpenRouter для улучшения текстов КП (уровень цен DeepSeek). */
    public function aiModel(): string
    {
        return (string) ($this->all()['ai']['model'] ?? 'deepseek/deepseek-chat') ?: 'deepseek/deepseek-chat';
    }

    /** @return Settings */
    public function all(): array
    {
        $stored = Cache::rememberForever(self::CACHE_KEY, fn () => SiteSetting::query()->where('key', self::KEY)->value('value'));
        $decoded = is_string($stored) ? json_decode($stored, true) : null;
        $decoded = is_array($decoded) ? $decoded : [];

        $settings = array_replace_recursive($this->defaults(), $decoded);
        if (isset($decoded['demo']['sections']) && is_array($decoded['demo']['sections'])) {
            $settings['demo']['sections'] = array_values($decoded['demo']['sections']);
        }

        return $settings;
    }

    /** @param Settings $settings */
    public function save(array $settings): void
    {
        $settings['demo']['sections'] = array_values(array_intersect($settings['demo']['sections'], array_keys(DemoLink::SECTIONS)));
        SiteSetting::query()->updateOrCreate(['key' => self::KEY], ['value' => json_encode($settings, JSON_UNESCAPED_UNICODE)]);
        Cache::forget(self::CACHE_KEY);
    }

    /** @return array{expires_days: int, max_opens: int|null, max_devices: int|null, sections: list<string>, show_tariffs: bool, notify_manager: bool, revoke_on_connect: bool} */
    public function demo(): array
    {
        return $this->all()['demo'];
    }

    /** @return array{min_days_between: int, daily_email: int, daily_sms: int, send_from_hour: int, send_to_hour: int} */
    public function rules(): array
    {
        return $this->all()['rules'];
    }

    /** @return array{name: string, phone: string, email: string} */
    public function manager(): array
    {
        return $this->all()['manager'];
    }
}
