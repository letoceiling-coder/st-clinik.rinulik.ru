<?php

namespace App\Services\Assistant;

use App\Models\SiteSetting;
use Illuminate\Support\Facades\Cache;

/** Публичные настройки AI-ассистента (фаза 9, пока mock без OpenRouter). */
class AssistantSettings
{
    public const KEY = 'assistant.public';

    private const CACHE_KEY = 'assistant.public.settings';

    /** @return array{enabled: bool, greeting: string, disclaimer: string, mock_mode: bool, system_prompt: string, stream_responses: bool, max_messages_per_conversation: int, max_messages_per_ip_per_day: int, assistant_lead_broadcast_count: int, assistant_lead_exclusive_first: bool} */
    public function get(): array
    {
        $stored = Cache::rememberForever(self::CACHE_KEY, fn () => SiteSetting::query()->where('key', self::KEY)->value('value'));
        $decoded = is_string($stored) ? json_decode($stored, true) : null;
        if (! is_array($decoded)) {
            return $this->defaults();
        }

        return [
            'enabled' => (bool) ($decoded['enabled'] ?? true),
            'greeting' => (string) ($decoded['greeting'] ?? $this->defaults()['greeting']),
            'disclaimer' => (string) ($decoded['disclaimer'] ?? $this->defaults()['disclaimer']),
            'mock_mode' => (bool) ($decoded['mock_mode'] ?? true),
            'system_prompt' => (string) ($decoded['system_prompt'] ?? ''),
            'stream_responses' => (bool) ($decoded['stream_responses'] ?? true),
            'max_messages_per_conversation' => (int) ($decoded['max_messages_per_conversation'] ?? 40),
            'max_messages_per_ip_per_day' => (int) ($decoded['max_messages_per_ip_per_day'] ?? 80),
            'assistant_lead_broadcast_count' => (int) ($decoded['assistant_lead_broadcast_count'] ?? 3),
            'assistant_lead_exclusive_first' => (bool) ($decoded['assistant_lead_exclusive_first'] ?? true),
        ];
    }

    /** @param  array{enabled?: bool, greeting?: string, disclaimer?: string, mock_mode?: bool, system_prompt?: string, stream_responses?: bool, max_messages_per_conversation?: int, max_messages_per_ip_per_day?: int, assistant_lead_broadcast_count?: int, assistant_lead_exclusive_first?: bool}  $patch */
    public function save(array $patch): void
    {
        $next = array_merge($this->get(), $patch);
        SiteSetting::query()->updateOrCreate(
            ['key' => self::KEY],
            ['value' => json_encode($next, JSON_UNESCAPED_UNICODE)],
        );
        Cache::forget(self::CACHE_KEY);
    }

    /** @return array{enabled: bool, greeting: string, disclaimer: string} */
    public function publicProps(): array
    {
        $settings = $this->get();
        if (! $settings['enabled']) {
            return ['enabled' => false, 'greeting' => '', 'disclaimer' => ''];
        }

        return [
            'enabled' => true,
            'greeting' => $settings['greeting'],
            'disclaimer' => $settings['disclaimer'],
            'stream_responses' => $settings['stream_responses'],
        ];
    }

    /** @return array{enabled: bool, greeting: string, disclaimer: string, mock_mode: bool, system_prompt: string, stream_responses: bool, max_messages_per_conversation: int, max_messages_per_ip_per_day: int} */
    private function defaults(): array
    {
        return [
            'enabled' => true,
            'greeting' => 'Здравствуйте! Я помощник '.config('app.name').'. Помогу найти клинику или подсказать, как записаться. Задайте вопрос своими словами.',
            'disclaimer' => 'Ассистент не ставит диагнозы и не назначает лечение. При острой боли или кровотечении звоните 103 или 112.',
            'mock_mode' => true,
            'system_prompt' => '',
            'stream_responses' => true,
            'max_messages_per_conversation' => 40,
            'max_messages_per_ip_per_day' => 80,
            'assistant_lead_broadcast_count' => 3,
            'assistant_lead_exclusive_first' => true,
        ];
    }
}
