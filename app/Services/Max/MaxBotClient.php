<?php

namespace App\Services\Max;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/** HTTP-клиент MAX Bot API (platform-api2.max.ru). */
class MaxBotClient
{
    /** @param  array<int, array<int, array<string, mixed>>>  $buttonRows */
    public function sendToUser(int|string $userId, string $text, array $buttonRows = []): bool
    {
        $token = config('services.max_bot.token');
        if (! filled($token)) {
            return false;
        }

        $payload = ['text' => $text];
        if ($buttonRows !== []) {
            $payload['attachments'] = [[
                'type' => 'inline_keyboard',
                'payload' => ['buttons' => $buttonRows],
            ]];
        }

        foreach ($this->apiBases() as $base) {
            try {
                $response = Http::withHeaders(['Authorization' => (string) $token])
                    ->timeout(12)
                    ->acceptJson()
                    ->post("{$base}/messages?user_id=".urlencode((string) $userId), $payload);

                if ($response->successful()) {
                    return true;
                }
            } catch (\Throwable $e) {
                Log::warning('max_bot.send_failed', ['error' => $e->getMessage(), 'base' => $base]);
            }
        }

        return false;
    }

    /** @return array{ok: bool, message?: string} */
    public function registerWebhook(): array
    {
        $result = app(MaxWebhookSync::class)->sync(force: true);

        return $result['ok'] ? ['ok' => true] : ['ok' => false, 'message' => $result['message']];
    }

    /**
     * Подписки бота на webhook. null — API недоступен или токен отклонён.
     *
     * @return list<array{url: string, update_types: list<string>}>|null
     */
    public function subscriptions(string $token): ?array
    {
        $response = $this->call($token, 'get', '/subscriptions');
        if ($response === null) {
            return null;
        }

        return array_values(array_filter(array_map(
            fn ($s) => is_array($s) && isset($s['url']) ? ['url' => (string) $s['url'], 'update_types' => array_values((array) ($s['update_types'] ?? []))] : null,
            (array) $response->json('subscriptions', []),
        )));
    }

    /**
     * @param  list<string>  $updateTypes
     * @return array{ok: bool, message?: string}
     */
    public function subscribe(string $token, string $url, array $updateTypes, ?string $secret = null): array
    {
        $payload = ['url' => $url, 'update_types' => $updateTypes];
        if (filled($secret)) {
            $payload['secret'] = (string) $secret;
        }

        $error = null;
        $response = $this->call($token, 'post', '/subscriptions', $payload, $error);

        return $response !== null ? ['ok' => true] : ['ok' => false, 'message' => $error ?? 'Не удалось зарегистрировать webhook.'];
    }

    public function unsubscribe(string $token, string $url): bool
    {
        return $this->call($token, 'delete', '/subscriptions?url='.urlencode($url)) !== null;
    }

    /**
     * Запрос к Bot API с перебором адресов: у platform-api2 сертификат российского УЦ, которому контейнер может не доверять.
     *
     * @param  array<string, mixed>  $payload
     */
    private function call(string $token, string $method, string $path, array $payload = [], ?string &$error = null): ?Response
    {
        foreach ($this->apiBases() as $base) {
            try {
                $request = Http::withHeaders(['Authorization' => $token])->timeout(15)->acceptJson();
                $response = match ($method) {
                    'get' => $request->get($base.$path),
                    'delete' => $request->delete($base.$path),
                    default => $request->post($base.$path, $payload),
                };

                if ($response->successful()) {
                    return $response;
                }

                $error = (string) ($response->json('message') ?? $response->body());
                if (in_array($response->status(), [401, 403], true)) {
                    return null;
                }
            } catch (\Throwable $e) {
                $error = $e->getMessage();
            }
        }

        return null;
    }

    /** @return list<string> */
    private function apiBases(): array
    {
        $configured = rtrim((string) config('services.max_bot.api_url', 'https://platform-api2.max.ru'), '/');
        $bases = [$configured];
        if ($configured !== 'https://platform-api2.max.ru') {
            $bases[] = 'https://platform-api2.max.ru';
        }
        if ($configured !== 'https://platform-api.max.ru') {
            $bases[] = 'https://platform-api.max.ru';
        }

        return array_values(array_unique($bases));
    }
}
