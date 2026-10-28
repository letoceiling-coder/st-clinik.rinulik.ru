<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AssistantConversation;
use App\Models\User;
use App\Rules\RussianPhone;
use App\Services\Assistant\AssistantChatService;
use App\Services\Assistant\AssistantLeadService;
use App\Services\Assistant\AssistantSettings;
use App\Services\Assistant\AssistantSseStream;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AssistantController extends Controller
{
    /** Диалоги, начатые в этой сессии браузера: продолжить чужой диалог по одному идентификатору нельзя. */
    private const SESSION_KEY = 'assistant_conversations';

    private const SESSION_LIMIT = 20;

    public function message(Request $request, AssistantSettings $settings, AssistantChatService $chat): JsonResponse
    {
        abort_unless($settings->get()['enabled'], 404);

        $data = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'conversation_id' => ['nullable', 'uuid'],
        ]);

        $payload = $this->respond($request, $settings, $chat, $data['message'], $this->ownedConversationId($request, $data['conversation_id'] ?? null));

        return response()->json($payload);
    }

    public function stream(Request $request, AssistantSettings $settings, AssistantChatService $chat): StreamedResponse|JsonResponse
    {
        abort_unless($settings->get()['enabled'], 404);

        if (! $settings->get()['stream_responses']) {
            return $this->message($request, $settings, $chat);
        }

        $data = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'conversation_id' => ['nullable', 'uuid'],
        ]);

        $message = $data['message'];
        $publicId = $this->ownedConversationId($request, $data['conversation_id'] ?? null);

        return response()->stream(function () use ($request, $chat, $message, $publicId): void {
            $write = static function (string $chunk): void {
                echo $chunk;
            };

            try {
                $payload = $this->buildStreamingPayload(
                    $request,
                    $chat,
                    $message,
                    is_string($publicId) ? $publicId : null,
                    static function (string $piece) use ($write): void {
                        AssistantSseStream::event($write, 'chunk', ['text' => $piece]);
                    },
                );
                $this->rememberConversation($request, $payload['conversation_id']);
                $request->session()->save();

                AssistantSseStream::event($write, 'done', [
                    'reply' => $payload['reply'],
                    'suggestions' => $payload['suggestions'],
                    'links' => $payload['links'],
                    'conversation_id' => $payload['conversation_id'],
                    'mock' => $payload['mock'],
                ]);
            } catch (\Throwable $e) {
                AssistantSseStream::event($write, 'error', ['message' => 'Не удалось получить ответ. Попробуйте позже.']);
                report($e);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream; charset=UTF-8',
            'Cache-Control' => 'no-cache, no-transform',
            'X-Accel-Buffering' => 'no',
            'Connection' => 'keep-alive',
        ]);
    }

    public function lead(Request $request, AssistantSettings $settings, AssistantLeadService $assistantLeads): JsonResponse
    {
        abort_unless($settings->get()['enabled'], 404);

        $data = $request->validate([
            'conversation_id' => ['required', 'uuid'],
            'clinic' => ['required_without:broadcast', 'nullable', 'string', 'max:120'],
            'broadcast' => ['sometimes', 'boolean'],
            'name' => ['required', 'string', 'min:2', 'max:60'],
            'phone' => ['required', 'string', 'max:32', new RussianPhone],
            'comment' => ['nullable', 'string', 'max:300'],
            'preferred_date' => ['nullable', 'date'],
            'preferred_time' => ['nullable', 'string', 'max:16'],
            'consent' => ['accepted'],
        ]);

        $conversation = AssistantConversation::query()
            ->where('public_id', $data['conversation_id'])
            ->first();

        if ($conversation === null) {
            throw ValidationException::withMessages(['conversation_id' => 'Диалог не найден. Сначала напишите ассистенту.']);
        }

        $ownedInSession = in_array($conversation->public_id, (array) $request->session()->get(self::SESSION_KEY, []), true);
        $ownedByUser = $request->user() !== null && $request->user()->id === $conversation->user_id;
        $sameIp = $conversation->ip_hash !== null && $conversation->ip_hash === hash('sha256', (string) $request->ip());
        abort_unless($ownedInSession || $ownedByUser || $sameIp, 403);

        $result = $assistantLeads->create($conversation, $data, $request->user());

        return response()->json([
            'ok' => true,
            'lead_id' => $result['lead']->id,
            'message' => $result['message'],
        ]);
    }

    /**
     * @return array{
     *     reply: string,
     *     suggestions: list<string>,
     *     links: list<array{label: string, url: string}>,
     *     conversation_id: string,
     *     mock: bool
     * }
     */
    private function respond(Request $request, AssistantSettings $settings, AssistantChatService $chat, string $message, ?string $publicId): array
    {
        $payload = $this->buildPayload($request, $chat, $message, $publicId);
        $this->rememberConversation($request, $payload['conversation_id']);

        return $payload;
    }

    /**
     * Идентификатор диалога принимается, только если диалог начат в этой сессии или принадлежит вошедшему пользователю.
     * Иначе начинается новый диалог — память разных людей не смешивается.
     */
    private function ownedConversationId(Request $request, ?string $publicId): ?string
    {
        if ($publicId === null || $publicId === '') {
            return null;
        }

        if (in_array($publicId, (array) $request->session()->get(self::SESSION_KEY, []), true)) {
            return $publicId;
        }

        $user = $request->user();
        if ($user instanceof User && AssistantConversation::query()->where('public_id', $publicId)->where('user_id', $user->id)->exists()) {
            return $publicId;
        }

        return null;
    }

    private function rememberConversation(Request $request, string $publicId): void
    {
        $owned = array_values(array_filter((array) $request->session()->get(self::SESSION_KEY, []), 'is_string'));
        if (! in_array($publicId, $owned, true)) {
            $owned[] = $publicId;
        }
        $request->session()->put(self::SESSION_KEY, array_slice($owned, -self::SESSION_LIMIT));
    }

    /**
     * @return array{
     *     reply: string,
     *     suggestions: list<string>,
     *     links: list<array{label: string, url: string}>,
     *     conversation_id: string,
     *     mock: bool
     * }
     */
    private function buildPayload(Request $request, AssistantChatService $chat, string $message, ?string $publicId): array
    {
        $ipHash = hash('sha256', (string) $request->ip());

        return $chat->chat(
            message: $message,
            city: $this->city(),
            user: $request->user(),
            publicConversationId: is_string($publicId) ? $publicId : null,
            channel: 'web',
            ipHash: $ipHash,
        );
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
    private function buildStreamingPayload(
        Request $request,
        AssistantChatService $chat,
        string $message,
        ?string $publicId,
        callable $onDelta,
    ): array {
        $ipHash = hash('sha256', (string) $request->ip());

        return $chat->chatStreaming(
            message: $message,
            city: $this->city(),
            onDelta: $onDelta,
            user: $request->user(),
            publicConversationId: is_string($publicId) ? $publicId : null,
            channel: 'web',
            ipHash: $ipHash,
        );
    }
}
