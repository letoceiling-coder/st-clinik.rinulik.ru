<?php

namespace App\Services\Assistant;

use App\Models\AssistantConversation;
use Illuminate\Support\Facades\Cache;

class AssistantUsageLimiter
{
    public function __construct(private readonly AssistantSettings $settings) {}

    public function assertAllowed(AssistantConversation $conversation, ?string $ipHash): void
    {
        $limits = $this->settings->get();
        $maxPerConversation = max(1, min(200, (int) ($limits['max_messages_per_conversation'] ?? 40)));
        $maxPerIpDay = max(5, min(500, (int) ($limits['max_messages_per_ip_per_day'] ?? 80)));

        $messageCount = $conversation->messages()->where('role', 'user')->count();
        if ($messageCount >= $maxPerConversation) {
            throw new AssistantLimitExceeded('Достигнут лимит сообщений в этом диалоге. Начните новый чат или оставьте заявку клинике.');
        }

        if ($ipHash === null || $ipHash === '') {
            return;
        }

        $key = 'assistant:ip:'.$ipHash.':'.now()->toDateString();
        $count = (int) Cache::get($key, 0);
        if ($count >= $maxPerIpDay) {
            throw new AssistantLimitExceeded('Слишком много обращений к ассистенту сегодня. Попробуйте завтра или воспользуйтесь каталогом клиник.');
        }

        Cache::put($key, $count + 1, now()->endOfDay());
    }
}
