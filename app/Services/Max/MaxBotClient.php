<?php

namespace App\Services\Max;

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
        $token = config('services.max_bot.token');
        if (! filled($token)) {
            return ['ok' => false, 'message' => 'Токен бота не задан.'];
        }

        $url = route('webhooks.max', absolute: true);
        $types = ['bot_started', 'message_created', 'message_callback', 'bot_stopped', 'dialog_removed'];

        foreach ($this->apiBases() as $base) {
            try {
                $response = Http::withHeaders(['Authorization' => (string) $token])
                    ->timeout(15)
                    ->acceptJson()
                    ->post("{$base}/subscriptions", [
                        'url' => $url,
                        'update_types' => $types,
                    ]);

                if ($response->successful()) {
                    return ['ok' => true];
                }

                $message = (string) ($response->json('message') ?? $response->body());
            } catch (\Throwable $e) {
                $message = $e->getMessage();
            }
        }

        return ['ok' => false, 'message' => $message ?? 'Не удалось зарегистрировать webhook.'];
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
