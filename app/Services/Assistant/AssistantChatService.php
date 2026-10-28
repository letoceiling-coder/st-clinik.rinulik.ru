<?php

namespace App\Services\Assistant;

use App\Models\AssistantConversation;
use App\Models\AssistantMessage;
use App\Models\City;
use App\Models\District;
use App\Models\Service;
use App\Models\User;
use Illuminate\Support\Str;
use Throwable;

class AssistantChatService
{
    private const HISTORY_LIMIT = 16;

    /** Сколько последних ответов просматриваем, чтобы вспомнить показанные клиники. */
    private const MEMORY_REPLIES = 8;

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
            $reply = $this->tidy($reply);
            $shown = $this->tools->consumeShownClinics();
            $leadCreated = $this->tools->consumeLeadCreated();
            $links = $this->mergeLinks($this->tools->consumeLinks(), []);

            $this->storeMessage($conversation, 'user', $message);
            $this->storeMessage($conversation, 'assistant', $reply, ['engine' => 'openrouter', 'clinics' => $shown, 'lead_created' => $leadCreated]);

            return [
                'reply' => $reply,
                'suggestions' => $this->suggestionsFor($shown, $leadCreated),
                'links' => $links,
                'conversation_id' => $conversation->public_id,
                'mock' => false,
            ];
        } catch (Throwable $e) {
            $reply = $mockPayload['reply'];
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
            $reply = $this->tidy($reply);
            $shown = $this->tools->consumeShownClinics();
            $leadCreated = $this->tools->consumeLeadCreated();
            $links = $this->mergeLinks($this->tools->consumeLinks(), []);
            $this->storeMessage($conversation, 'assistant', $reply, ['engine' => 'openrouter', 'stream' => true, 'clinics' => $shown, 'lead_created' => $leadCreated]);

            return [
                'reply' => $reply,
                'suggestions' => $this->suggestionsFor($shown, $leadCreated),
                'links' => $links,
                'conversation_id' => $conversation->public_id,
                'mock' => false,
            ];
        } catch (Throwable $e) {
            $reply = $mockPayload['reply'];
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
    public function previewMessages(AssistantConversation $conversation, City $city, string $latestUserMessage): array
    {
        return $this->buildMessages($conversation, $city, $latestUserMessage);
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
        $system .= "\n\n".$this->contextBlock($conversation, $city);

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
            'Ты — консультант сервиса '.config('app.name').': помогаешь людям выбрать стоматологию и записаться. Общайся как внимательный живой администратор клиники: тепло, спокойно, на «вы», короткими фразами, без канцелярита и шаблонных вступлений. Не называй себя человеком, но и не подчёркивай, что ты бот.',
            '',
            'Как вести диалог:',
            '— Сначала пойми задачу: что беспокоит или какая услуга нужна, для взрослого или ребёнка, удобный район или метро, бюджет, когда удобно прийти. Задавай не больше одного-двух уточняющих вопросов за раз и только то, что действительно нужно. Если запрос понятен — сразу подбирай.',
            '— Подбирай клиники только через search_clinics и get_clinic. Никогда не придумывай клиники, цены, врачей, адреса и свободное время.',
            '— Рекомендуй 2–3 клиники (в search_clinics проси limit 3–4). По каждой одна-две строки: почему подходит (рейтинг и отзывы, цена на нужную услугу, метро или район, особенности вроде детского приёма, рассрочки, записи сегодня). Можно отметить, какую выбрал бы ты и почему.',
            '— Если подходящих клиник нет — честно скажи и предложи ближайшие альтернативы.',
            '— Когда спрашивают про запись, «ближайшие дни», «сегодня» или время — сразу вызови get_available_days (а для конкретной даты get_slots) по выбранной клинике и назови конкретные даты и время. Не отвечай общими словами.',
            '— Каждый ответ заканчивай одним понятным следующим шагом: уточняющий вопрос, выбор из клиник или запись. Не задавай несколько вопросов подряд.',
            '',
            'Запись и заявка:',
            '— Пока человек выбирает, не спрашивай имя и телефон. Когда клиника выбрана, предложи два пути: записаться онлайн самому (кнопка с клиникой появится под ответом) или оставить заявку — клиника перезвонит.',
            '— Имя и телефон проси, только если человек выбрал заявку. Затем один раз спроси явное согласие на обработку персональных данных («Согласны, чтобы клиника получила ваши имя и телефон?»).',
            '— После «да» вызови create_lead: clinic — slug выбранной клиники; если клиника не выбрана и человек просит подобрать — broadcast=true. В comment кратко опиши запрос (услуга, удобное время), без диагнозов.',
            '— После успешной заявки подтверди, что клиника перезвонит, и коротко скажи, что подготовить к визиту.',
            '',
            'Медицина и безопасность:',
            '— Не ставь диагнозы и не назначай лечение, не называй лекарства и дозировки. Можно объяснить, какой специалист и какая услуга обычно нужны, и что окончательно решит врач на осмотре.',
            '— Сильная боль с отёком, температура, кровотечение, травма — советуй срочно обратиться в клинику с приёмом сегодня или звонить 103/112.',
            '',
            'Оформление ответа:',
            '— Пиши обычным текстом без Markdown: без звёздочек, решёток и таблиц. Списки — строками, начинающимися с «— ». Ссылки и слова-кнопки вроде «Записаться» в текст не вставляй: карточки клиник появятся кнопками под ответом.',
            '— Обычно 2–6 строк. Отвечай на языке пользователя (по умолчанию русский).',
            '',
            'Помни разговор целиком: если человек пишет «первая», «та, что у метро», «запишите туда» — это о клиниках, которые ты уже показывал (список ниже).',
            $disclaimer,
        ]);
    }

    /** Город, дата, районы и ранее показанные клиники — чтобы модель опиралась на факты диалога. */
    private function contextBlock(AssistantConversation $conversation, City $city): string
    {
        $now = now()->timezone(config('app.timezone'));
        $lines = [
            'Контекст:',
            '— Город пользователя: '.$city->name.'. Ищи и предлагай клиники только в этом городе. Если человек спрашивает о другом городе — предложи переключить город в шапке сайта.',
            '— Сейчас: '.$now->translatedFormat('l, j F Y, H:i').'.',
        ];

        $districts = District::query()->where('city_id', $city->id)->orderBy('name')->limit(40)->pluck('name');
        if ($districts->isNotEmpty()) {
            $lines[] = '— Районы города: '.$districts->implode(', ').'.';
        }

        $popular = Service::query()->where('is_active', true)->orderByDesc('is_popular')->orderBy('id')->limit(14)->pluck('name');
        if ($popular->isNotEmpty()) {
            $lines[] = '— Примеры услуг в каталоге: '.$popular->implode(', ').'.';
        }

        $shown = $this->recentlyShownClinics($conversation);
        if ($shown !== []) {
            $lines[] = '— Ты уже показывал клиники (по порядку): '.implode('; ', array_map(
                fn (array $c, int $i) => ($i + 1).'. '.$c['name'].' (slug: '.$c['slug'].')',
                $shown,
                array_keys($shown),
            )).'.';
        }

        return implode("\n", $lines);
    }

    /** @return list<array{slug: string, name: string}> */
    private function recentlyShownClinics(AssistantConversation $conversation): array
    {
        $rows = $conversation->messages()
            ->where('role', 'assistant')
            ->orderByDesc('id')
            ->limit(self::MEMORY_REPLIES)
            ->get(['meta'])
            ->reverse();

        $seen = [];
        foreach ($rows as $row) {
            foreach ((array) ($row->meta['clinics'] ?? []) as $clinic) {
                if (is_array($clinic) && isset($clinic['slug'], $clinic['name'])) {
                    $seen[$clinic['slug']] = ['slug' => (string) $clinic['slug'], 'name' => (string) $clinic['name']];
                }
            }
        }

        return array_slice(array_values($seen), -8);
    }

    /**
     * Подсказки-кнопки под ответом по ходу диалога.
     *
     * @param  list<array{slug: string, name: string}>  $shown
     * @return list<string>
     */
    private function suggestionsFor(array $shown, bool $leadCreated): array
    {
        if ($leadCreated) {
            return ['Как подготовиться к приёму?', 'Подобрать ещё клинику'];
        }

        if ($shown !== []) {
            $first = $shown[0]['name'];

            return array_values(array_filter([
                'Записаться в «'.Str::limit($this->shortClinicName($first), 28, '…').'»',
                'Есть время на сегодня?',
                count($shown) > 1 ? 'Чем они отличаются?' : null,
                'Показать другие варианты',
            ]));
        }

        // Пока клиники не показаны, ответ обычно уточняющий вопрос — готовые варианты сбили бы человека.
        return [];
    }

    /** «Стоматология «Евродент»» → «Евродент»: короткое имя для кнопки без вложенных кавычек. */
    private function shortClinicName(string $name): string
    {
        $short = preg_replace('/^(стоматологи(я|ческая клиника)|клиника|центр стоматологии)\s+/iu', '', trim($name)) ?? $name;

        return trim($short, " «»\"'") ?: $name;
    }

    /** Убирает Markdown, который модель иногда добавляет: в виджете он отображался бы символами. */
    private function tidy(string $reply): string
    {
        $reply = preg_replace('/\*\*(.+?)\*\*/u', '$1', $reply) ?? $reply;
        $reply = preg_replace('/^#{1,6}\s*/mu', '', $reply) ?? $reply;
        $reply = preg_replace('/^\s*[*\-]\s+/mu', '— ', $reply) ?? $reply;
        $reply = preg_replace('/\[([^\]]+)\]\((https?:[^)]+)\)/u', '$1', $reply) ?? $reply;

        return trim(preg_replace("/\n{3,}/u", "\n\n", $reply) ?? $reply);
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
            $key = mb_strtolower($link['label']);
            if (isset($seen[$link['url']]) || isset($seen[$key])) {
                continue;
            }
            $seen[$link['url']] = true;
            $seen[$key] = true;
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
                $changes = [];
                if ($user !== null && $existing->user_id === null) {
                    $changes['user_id'] = $user->id;
                }
                // Город диалога — тот, из которого пишут сейчас: заявки-рассылки уйдут клиникам этого города.
                if ($existing->city_id !== $city->id) {
                    $changes['city_id'] = $city->id;
                }
                if ($changes !== []) {
                    $existing->update($changes);
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
