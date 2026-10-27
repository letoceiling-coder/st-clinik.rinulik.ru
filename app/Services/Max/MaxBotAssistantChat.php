<?php

namespace App\Services\Max;

use App\Models\City;
use App\Services\Assistant\AssistantChatService;
use App\Services\Assistant\AssistantSettings;
use Illuminate\Support\Facades\Cache;

class MaxBotAssistantChat
{
    private const TTL_SECONDS = 1800;

    public function __construct(
        private readonly MaxBotClient $client,
        private readonly AssistantSettings $settings,
        private readonly AssistantChatService $chat,
    ) {}

    public function isActive(string $maxUserId): bool
    {
        return (bool) Cache::get($this->modeKey($maxUserId), false);
    }

    public function activate(string $maxUserId): void
    {
        Cache::put($this->modeKey($maxUserId), true, self::TTL_SECONDS);
    }

    public function deactivate(string $maxUserId): void
    {
        Cache::forget($this->modeKey($maxUserId));
    }

    public function start(int $maxUserId): void
    {
        if (! $this->settings->get()['enabled']) {
            $this->client->sendToUser($maxUserId, 'Ассистент временно недоступен. Откройте каталог клиник на сайте или в мини-приложении.');

            return;
        }

        $this->activate((string) $maxUserId);
        $greeting = $this->settings->get()['greeting'];
        $disclaimer = $this->settings->get()['disclaimer'];

        $this->client->sendToUser(
            $maxUserId,
            $greeting."\n\n".$disclaimer."\n\nНапишите вопрос одним сообщением. Чтобы выйти — /start",
        );
    }

    public function handleMessage(int $maxUserId, string $text, City $city): void
    {
        if (! $this->isActive((string) $maxUserId)) {
            return;
        }

        if (! $this->settings->get()['enabled']) {
            $this->deactivate((string) $maxUserId);

            return;
        }

        $conversationId = Cache::get($this->conversationKey($maxUserId));
        $result = $this->chat->chat(
            message: $text,
            city: $city,
            publicConversationId: is_string($conversationId) ? $conversationId : null,
            channel: 'max',
            maxUserId: (string) $maxUserId,
        );

        Cache::put($this->conversationKey($maxUserId), $result['conversation_id'], self::TTL_SECONDS);

        $body = $result['reply'];
        if ($result['links'] !== []) {
            $body .= "\n\n";
            foreach (array_slice($result['links'], 0, 4) as $link) {
                $body .= $link['label'].': '.$link['url']."\n";
            }
        }

        $rows = [];
        if ($result['suggestions'] !== []) {
            $row = [];
            foreach (array_slice($result['suggestions'], 0, 2) as $suggestion) {
                $row[] = [
                    'type' => 'callback',
                    'text' => mb_substr($suggestion, 0, 40),
                    'payload' => 'assistant:hint:'.mb_substr($suggestion, 0, 80),
                ];
            }
            if ($row !== []) {
                $rows[] = $row;
            }
        }

        $this->client->sendToUser($maxUserId, trim($body), $rows);
    }

    public function handleHint(int $maxUserId, string $hint, City $city): void
    {
        $this->activate((string) $maxUserId);
        $this->handleMessage($maxUserId, $hint, $city);
    }

    private function modeKey(string $maxUserId): string
    {
        return 'max_assistant_mode:'.$maxUserId;
    }

    private function conversationKey(int|string $maxUserId): string
    {
        return 'max_assistant_conv:'.$maxUserId;
    }
}
