<?php

namespace App\Services\Vk;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/** Клиент VK API от имени сообщества (messages.send). Писать можно только тем, кто разрешил сообщения. */
class VkCommunityClient
{
    public function isConfigured(): bool
    {
        return filled(config('services.vk_community.access_token'));
    }

    /**
     * @throws VkSendException если VK отклонил отправку (например, пользователь запретил сообщения — код 900–902)
     */
    public function sendToUser(int|string $vkUserId, string $text): void
    {
        $token = config('services.vk_community.access_token');
        if (! filled($token)) {
            throw new VkSendException('Ключ сообщества VK не настроен.', 0);
        }

        $response = Http::asForm()->timeout(12)->post('https://api.vk.com/method/messages.send', [
            'user_id' => (int) $vkUserId,
            'random_id' => random_int(1, PHP_INT_MAX),
            'message' => mb_substr($text, 0, 4000),
            'access_token' => $token,
            'v' => config('services.vk_community.api_version', '5.199'),
        ]);

        $error = $response->json('error');
        if (is_array($error)) {
            Log::warning('vk_community.send_failed', ['code' => $error['error_code'] ?? null, 'message' => $error['error_msg'] ?? null]);

            throw new VkSendException((string) ($error['error_msg'] ?? 'VK API error'), (int) ($error['error_code'] ?? 0));
        }

        if (! $response->successful()) {
            throw new VkSendException('VK API ответил '.$response->status(), $response->status());
        }
    }
}
