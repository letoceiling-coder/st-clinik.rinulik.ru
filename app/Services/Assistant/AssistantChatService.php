<?php

namespace App\Services\Assistant;

use App\Models\AssistantConversation;
use App\Models\AssistantMessage;
use App\Models\City;
use App\Models\User;
use Illuminate\Support\Str;
use Throwable;

class AssistantChatService
{
    private const HISTORY_LIMIT = 12;

    public function __construct(
        private readonly AssistantSettings $settings,
        private readonly AssistantMockService $mock,
        private readonly OpenRouterChatClient $openRouter,
        private readonly AssistantToolExecutor $tools,
        private readonly AssistantUsageLimiter $usageLimiter,
    ) {}

    /**
     * @return array{
     *     reply: string,
     *     suggestions: list<string>,
     *     links: list<array{label: string, url: string}>,
     *     conversation_id: string,
     *     mock: bool
     * }
     */
    public function chat(
        string $message,
        City $city,
        ?User $user = null,
        ?string $publicConversationId = null,
        string $channel = 'web',
        ?string $maxUserId = null,
        ?string $ipHash = null,
    ): array {
        $conversation = $this->resolveConversation(
            $publicConversationId,
            $city,
            $user,
            $channel,
            $maxUserId,
            $ipHash,
        );

        try {
            $this->usageLimiter->assertAllowed($conversation, $ipHash);
        } catch (AssistantLimitExceeded $e) {
            return $this->limitResponse($conversation, $city, $message, $e->getMessage());
        }

        try {
            app(OpenRouterBudgetGuard::class)->assertWithinBudget();
        } catch (AssistantBudgetExceeded $e) {
            return $this->limitResponse($conversation, $city, $message, $e->getMessage());
        }

        $useMock = $this->shouldUseMock();
        $mockPayload = $this->mock->reply($message, $city);

        if ($useMock) {
            $reply = $mockPayload['reply'];
            $this->storeMessage($conversation, 'user', $message);
            $this->storeMessage($conversation, 'assistant', $reply, ['engine' => 'mock']);

            return [
                'reply' => $reply,
                'suggestions' => $mockPayload['suggestions'],
                'links' => $mockPayload['links'],
                'conversation_id' => $conversation->public_id,
                'mock' => true,
            ];
        }

        try {
            $toolDefs = AssistantToolDefinitions::all();
            $reply = $this->openRouter->completeWithTools(
                $this->buildMessages($conversation, $city, $message),
                $toolDefs,
                fn (string $name, array $args) => $this->tools->run($name, $args, $city, $conversation),
            );
            $links = $this->mergeLinks($this->tools->consumeLinks(), $mockPayload['links']);

            $this->storeMessage($conversation, 'user', $message);
            $this->storeMessage($conversation, 'assistant', $reply, ['engine' => 'openrouter']);

            return [
                'reply' => $reply,
                'suggestions' => $mockPayload['suggestions'],
                'links' => $links,
                'conversation_id' => $conversation->public_id,
                'mock' => false,
            ];
        } catch (Throwable $e) {
            $reply = $mockPayload['reply']."\n\n(Ответ сгенерирован локально: модель временно недоступна.)";
            $this->storeMessage($conversation, 'user', $message);
            $this->storeMessage($conversation, 'assistant', $reply, ['engine' => 'mock_fallback', 'error' => $e->getMessage()]);

            return [
                'reply' => $reply,
                'suggestions' => $mockPayload['suggestions'],
                'links' => $mockPayload['links'],
                'conversation_id' => $conversation->public_id,
                'mock' => true,
            ];
        }
    }

    /**
     * @param  callable(string): void  $onDelta
     * @return array{
     *     reply: string,
     *     suggestions: list<string>,
     *     links: list<array{label: string, url: string}>,
     *     conversation_id: string,
     *     mock: bool
     * }
     */
    public function chatStreaming(
        string $message,
        City $city,
        callable $onDelta,
        ?User $user = null,
        ?string $publicConversationId = null,
        string $channel = 'web',
        ?string $maxUserId = null,
        ?string $ipHash = null,
    ): array {
        $conversation = $this->resolveConversation(
            $publicConversationId,
            $city,
            $user,
            $channel,
            $maxUserId,
            $ipHash,
        );

        try {
            $this->usageLimiter->assertAllowed($conversation, $ipHash);
        } catch (AssistantLimitExceeded $e) {
            return $this->limitResponse($conversation, $city, $message, $e->getMessage());
        }

        try {
            app(OpenRouterBudgetGuard::class)->assertWithinBudget();
        } catch (AssistantBudgetExceeded $e) {
            return $this->limitResponse($conversation, $city, $message, $e->getMessage());
        }

        $useMock = $this->shouldUseMock();
        $mockPayload = $this->mock->reply($message, $city);

        if ($useMock) {
            $reply = $mockPayload['reply'];
            foreach (AssistantSseStream::chunkText($reply) as $piece) {
                $onDelta($piece);
            }
            $this->storeMessage($conversation, 'user', $message);
            $this->storeMessage($conversation, 'assistant', $reply, ['engine' => 'mock']);

            return [
                'reply' => $reply,
                'suggestions' => $mockPayload['suggestions'],
                'links' => $mockPayload['links'],
                'conversation_id' => $conversation->public_id,
                'mock' => true,
            ];
        }

        try {
            $toolDefs = AssistantToolDefinitions::all();
            $this->storeMessage($conversation, 'user', $message);
            $reply = $this->openRouter->completeWithToolsStreaming(
                $this->buildMessages($conversation, $city, $message, excludeLatestUser: true),
                $toolDefs,
                fn (string $name, array $args) => $this->tools->run($name, $args, $city, $conversation),
                $onDelta,
            );
            $links = $this->mergeLinks($this->tools->consumeLinks(), $mockPayload['links']);
            $this->storeMessage($conversation, 'assistant', $reply, ['engine' => 'openrouter', 'stream' => true]);

            return [
                'reply' => $reply,
                'suggestions' => $mockPayload['suggestions'],
                'links' => $links,
                'conversation_id' => $conversation->public_id,
                'mock' => false,
            ];
        } catch (Throwable $e) {
            $reply = $mockPayload['reply']."\n\n(Ответ сгенерирован локально: модель временно недоступна.)";
            foreach (AssistantSseStream::chunkText($reply) as $piece) {
                $onDelta($piece);
            }
            $this->storeMessage($conversation, 'assistant', $reply, ['engine' => 'mock_fallback', 'error' => $e->getMessage()]);

            return [
                'reply' => $reply,
                'suggestions' => $mockPayload['suggestions'],
                'links' => $mockPayload['links'],
                'conversation_id' => $conversation->public_id,
                'mock' => true,
            ];
        }
    }

    private function shouldUseMock(): bool
    {
        $settings = $this->settings->get();
        if ($settings['mock_mode']) {
            return true;
        }

        return ! filled(config('services.openrouter.api_key'));
    }

    /** @return list<array{role: string, content: string}> */
    private function buildMessages(
        AssistantConversation $conversation,
        City $city,
        string $latestUserMessage,
        bool $excludeLatestUser = false,
    ): array {
        $settings = $this->settings->get();
        $system = trim($settings['system_prompt'] ?? '');
        if ($system === '') {
            $system = $this->defaultSystemPrompt($city, $settings['disclaimer']);
        }

        $messages = [['role' => 'system', 'content' => $system]];

        $history = $conversation->messages()
            ->orderByDesc('id')
            ->limit(self::HISTORY_LIMIT)
            ->get()
            ->reverse()
            ->filter(fn (AssistantMessage $m) => in_array($m->role, ['user', 'assistant'], true));

        foreach ($history as $row) {
            $messages[] = ['role' => $row->role, 'content' => $row->content];
        }

        if (! $excludeLatestUser) {
            $messages[] = ['role' => 'user', 'content' => $latestUserMessage];
        }

        return $messages;
    }

    private function defaultSystemPrompt(City $city, string $disclaimer): string
    {
        return implode("\n", [
            'Ты помощник сервиса '.config('app.name').' для пациентов в городе '.$city->name.'.',
            'Помогай найти стоматологические клиники, записаться онлайн, понять услуги и цены.',
            'Не ставь диагнозы и не назначай лечение. При неотложных симптомах советуй звонить 103 или 112.',
            'Отвечай кратко, по-русски, дружелюбно.',
            'Для подбора клиник и врачей вызывай search_clinics, get_clinic, search_doctors; для слотов — get_available_days и get_slots; для правил сервиса — search_knowledge.',
            'Чтобы оформить заявку, уточни имя и телефон, получи явное согласие на ПД, затем вызови create_lead с consent=true (или предложи кнопку «Оставить заявку»).',
            $disclaimer,
        ]);
    }

    /**
     * @param  list<array{label: string, url: string}>  $primary
     * @param  list<array{label: string, url: string}>  $fallback
     * @return list<array{label: string, url: string}>
     */
    /** @return array{reply: string, suggestions: list<string>, links: list<array{label: string, url: string}>, conversation_id: string, mock: bool} */
    private function limitResponse(AssistantConversation $conversation, City $city, string $userMessage, string $reply): array
    {
        $this->storeMessage($conversation, 'user', $userMessage);
        $this->storeMessage($conversation, 'assistant', $reply, ['engine' => 'limit']);

        return [
            'reply' => $reply,
            'suggestions' => ['Каталог клиник', 'Как записаться онлайн'],
            'links' => [
                ['label' => 'Каталог', 'url' => route('city.clinics', $city->slug)],
            ],
            'conversation_id' => $conversation->public_id,
            'mock' => true,
        ];
    }

    /** @param  list<array{label: string, url: string}>  $primary */
    private function mergeLinks(array $primary, array $fallback): array
    {
        $seen = [];
        $merged = [];
        foreach (array_merge($primary, $fallback) as $link) {
            if (isset($seen[$link['url']])) {
                continue;
            }
            $seen[$link['url']] = true;
            $merged[] = $link;
        }

        return array_slice($merged, 0, 8);
    }

    private function resolveConversation(
        ?string $publicId,
        City $city,
        ?User $user,
        string $channel,
        ?string $maxUserId,
        ?string $ipHash,
    ): AssistantConversation {
        if ($publicId !== null && $publicId !== '') {
            $existing = AssistantConversation::query()->where('public_id', $publicId)->first();
            if ($existing !== null) {
                if ($user !== null && $existing->user_id === null) {
                    $existing->update(['user_id' => $user->id]);
                }

                return $existing;
            }
        }

        return AssistantConversation::query()->create([
            'public_id' => (string) Str::uuid(),
            'city_id' => $city->id,
            'user_id' => $user?->id,
            'channel' => $channel,
            'max_user_id' => $maxUserId,
            'ip_hash' => $ipHash,
            'last_message_at' => now(),
        ]);
    }

    /** @param  array<string, mixed>|null  $meta */
    private function storeMessage(AssistantConversation $conversation, string $role, string $content, ?array $meta = null): void
    {
        AssistantMessage::query()->create([
            'assistant_conversation_id' => $conversation->id,
            'role' => $role,
            'content' => $content,
            'meta' => $meta,
        ]);

        $conversation->update(['last_message_at' => now()]);
    }
}
