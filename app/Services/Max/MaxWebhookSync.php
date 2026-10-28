<?php

namespace App\Services\Max;

use Illuminate\Support\Facades\Cache;

/**
 * Держит webhook бота MAX в соответствии с настройками: текущий домен сайта, токен и секрет.
 * Вызывается при сохранении интеграции, при деплое и по расписанию — смена токена или домена
 * не оставляет бота «писать в пустоту».
 */
class MaxWebhookSync
{
    /** Отпечаток последней успешной установки: токен + адрес + секрет. */
    private const FINGERPRINT_KEY = 'max_bot.webhook_fingerprint';

    /** Путь webhook этого сайта: по нему узнаём свои подписки на старых доменах и не трогаем чужие. */
    private const OWN_PATH = '/webhooks/max';

    /** @var list<string> */
    public const UPDATE_TYPES = ['bot_started', 'message_created', 'message_callback', 'bot_stopped', 'dialog_removed'];

    public function __construct(private readonly MaxBotClient $client) {}

    /**
     * @param  string|null  $previousToken  Токен до изменения: у прежнего бота снимаем подписки этого сайта.
     * @param  bool  $force  false — ничего не делать, если токен, адрес и секрет не менялись с прошлой установки.
     * @return array{ok: bool, changed: bool, message: string, url: string, removed: list<string>}
     */
    public function sync(?string $previousToken = null, bool $force = false): array
    {
        $token = (string) config('services.max_bot.token');
        $secret = config('services.max_bot.webhook_secret');
        $url = route('webhooks.max', absolute: true);
        $removed = [];

        if (filled($previousToken) && $previousToken !== $token) {
            $removed = $this->removeOwnSubscriptions((string) $previousToken, keep: null);
        }

        if ($token === '') {
            Cache::forget(self::FINGERPRINT_KEY);

            return ['ok' => false, 'changed' => $removed !== [], 'message' => 'Токен бота не задан — webhook не установлен.', 'url' => $url, 'removed' => $removed];
        }

        $fingerprint = hash('sha256', $token.'|'.$url.'|'.(string) $secret);
        if (! $force && Cache::get(self::FINGERPRINT_KEY) === $fingerprint) {
            return ['ok' => true, 'changed' => false, 'message' => 'Webhook MAX актуален.', 'url' => $url, 'removed' => $removed];
        }

        $result = $this->client->subscribe($token, $url, self::UPDATE_TYPES, filled($secret) ? (string) $secret : null);
        if (! $result['ok']) {
            return ['ok' => false, 'changed' => false, 'message' => 'Не удалось установить webhook MAX: '.($result['message'] ?? 'ошибка API'), 'url' => $url, 'removed' => $removed];
        }

        $removed = array_merge($removed, $this->removeOwnSubscriptions($token, keep: $url));
        Cache::forever(self::FINGERPRINT_KEY, $fingerprint);

        return [
            'ok' => true,
            'changed' => true,
            'message' => 'Webhook MAX установлен на '.$url.($removed !== [] ? '. Сняты устаревшие адреса: '.implode(', ', $removed) : '').'.',
            'url' => $url,
            'removed' => $removed,
        ];
    }

    /**
     * Снимает подписки этого сайта (путь /webhooks/max на любом домене), кроме $keep. Чужие сервисы бота не трогаем.
     *
     * @return list<string>
     */
    private function removeOwnSubscriptions(string $token, ?string $keep): array
    {
        $removed = [];
        foreach ($this->client->subscriptions($token) ?? [] as $subscription) {
            $subscriptionUrl = $subscription['url'];
            $path = rtrim((string) parse_url($subscriptionUrl, PHP_URL_PATH), '/');
            if ($subscriptionUrl === $keep || $path !== self::OWN_PATH) {
                continue;
            }
            if ($this->client->unsubscribe($token, $subscriptionUrl)) {
                $removed[] = $subscriptionUrl;
            }
        }

        return $removed;
    }
}
