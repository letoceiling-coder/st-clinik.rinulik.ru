<?php

namespace App\Services\Max;

use App\Models\NotificationSubscription;
use App\Models\User;
use App\Services\Auth\MaxLoginService;
use App\Services\Auth\SocialAuthService;
use App\Services\Auth\SocialProfile;
use App\Services\Broadcasts\ClinicFollowerService;
use App\Services\Notifications\NotificationPreferenceService;
use App\Services\Notifications\NotificationSubscriptionService;
use Illuminate\Support\Str;

class MaxBotConversation
{
    public function __construct(
        private readonly MaxBotClient $client,
        private readonly MaxLoginService $login,
        private readonly SocialAuthService $social,
        private readonly NotificationSubscriptionService $subscriptions,
        private readonly MaxUserSync $maxUsers,
        private readonly MaxDeepLink $deepLink,
        private readonly MaxBotPatientMenu $patientMenu,
        private readonly ClinicFollowerService $clinicFollowers,
        private readonly MaxBotAppointmentActions $appointmentActions,
        private readonly MaxBotAssistantChat $assistantChat,
    ) {}

    /** @param  array<string, mixed>  $update */
    public function handle(array $update): void
    {
        $type = (string) ($update['update_type'] ?? $update['type'] ?? '');

        match ($type) {
            'bot_started' => $this->onBotStarted($update),
            'message_created' => $this->onMessageCreated($update),
            'message_callback' => $this->onMessageCallback($update),
            'bot_stopped', 'dialog_removed' => $this->onBotStopped($update),
            default => null,
        };
    }

    /** @param  array<string, mixed>  $update */
    private function onBotStarted(array $update): void
    {
        $startPayload = (string) ($update['payload'] ?? $update['start_payload'] ?? '');
        $user = $this->extractUser($update);
        $maxUserId = $this->userId($user);

        if ($maxUserId !== '') {
            $this->maxUsers->touch($maxUserId, $user, $this->chatId($update));
        }

        if ($startPayload !== '' && $user !== [] && str_starts_with($startPayload, 'login_')) {
            if ($this->login->attachFromWebhook($startPayload, $user)) {
                $code = substr($startPayload, 6);
                $status = $this->login->status($code);
                if ($maxUserId !== '' && isset($status['complete_url'])) {
                    $this->login->sendLoginConfirmation((int) $maxUserId, $status['complete_url']);
                }
            }

            return;
        }

        if ($maxUserId === '') {
            return;
        }

        $this->syncMaxSubscription($maxUserId);

        $followSlug = $this->deepLink->clinicSlugFromFollow($startPayload);
        if ($followSlug !== null) {
            $this->tryFollowClinic((int) $maxUserId, $followSlug);
        }

        $this->sendWelcome((int) $maxUserId, $startPayload);
    }

    /** @param  array<string, mixed>  $update */
    private function onMessageCreated(array $update): void
    {
        $message = is_array($update['message'] ?? null) ? $update['message'] : [];
        $sender = is_array($message['sender'] ?? null) ? $message['sender'] : [];
        $maxUserId = $this->userId($sender);
        if ($maxUserId === '') {
            return;
        }

        $this->maxUsers->touch($maxUserId, $sender, $this->chatIdFromMessage($message));

        $body = is_array($message['body'] ?? null) ? $message['body'] : [];
        $text = trim((string) ($body['text'] ?? ''));
        if (Str::lower($text) === '/start' || Str::lower($text) === 'start') {
            $this->assistantChat->deactivate($maxUserId);
            $this->sendWelcome((int) $maxUserId);

            return;
        }

        if ($this->assistantChat->isActive($maxUserId)) {
            $this->assistantChat->handleMessage((int) $maxUserId, $text, app('currentCity'));

            return;
        }

        if ($this->handleMenuText((int) $maxUserId, $text)) {
            return;
        }

        $phone = $this->phoneFromAttachments($body);
        if ($phone === null) {
            return;
        }

        $profile = new SocialProfile(
            provider: 'max',
            providerUserId: $maxUserId,
            email: null,
            phone: $phone,
            name: isset($sender['name']) ? (string) $sender['name'] : null,
            avatar: isset($sender['avatar_url']) ? (string) $sender['avatar_url'] : null,
            raw: $message,
            emailVerified: false,
        );

        $result = $this->social->resolveLogin($profile, null);
        if (isset($result['user'])) {
            $this->subscriptions->activateMax($result['user'], $maxUserId);
            $this->maxUsers->touch($maxUserId, $sender, $this->chatIdFromMessage($message));
        }

        $this->client->sendToUser(
            (int) $maxUserId,
            "Спасибо! Номер {$phone} сохранён в вашем профиле на ".config('app.name').".\n\nОткройте мини-приложение, чтобы найти клинику или посмотреть записи.",
            $this->patientMenu->mainMenuRows(),
        );
    }

    /** @param  array<string, mixed>  $update */
    private function onMessageCallback(array $update): void
    {
        $callback = is_array($update['callback'] ?? null) ? $update['callback'] : [];
        $user = is_array($callback['user'] ?? null)
            ? $callback['user']
            : $this->extractUser($update);
        $maxUserId = $this->userId($user);
        if ($maxUserId === '') {
            return;
        }

        $this->maxUsers->touch($maxUserId, $user, $this->chatId($update));

        $payload = (string) ($callback['payload'] ?? $update['payload'] ?? '');
        $this->handleMenuPayload((int) $maxUserId, $payload);
    }

    private function handleMenuPayload(int $maxUserId, string $payload): void
    {
        if ($this->appointmentActions->handle($maxUserId, $payload)) {
            return;
        }

        if (str_starts_with($payload, 'assistant:hint:')) {
            $hint = substr($payload, strlen('assistant:hint:'));
            $this->assistantChat->handleHint($maxUserId, $hint, app('currentCity'));

            return;
        }

        if (str_starts_with($payload, 'notify:toggle:')) {
            $eventKey = substr($payload, strlen('notify:toggle:'));
            $this->withLinkedUser($maxUserId, function ($user) use ($maxUserId, $eventKey): void {
                app(NotificationPreferenceService::class)
                    ->toggleChannel($user, $eventKey, NotificationSubscription::CHANNEL_MAX);
                $this->patientMenu->sendNotificationsHelp($maxUserId, $user);
            });

            return;
        }

        match ($payload) {
            'menu:main' => $this->sendWelcome($maxUserId),
            'menu:assistant' => $this->assistantChat->start($maxUserId),
            'menu:appointments' => $this->withLinkedUser($maxUserId, fn ($user) => $this->patientMenu->sendAppointments($maxUserId, $user)),
            'menu:notifications' => $this->withLinkedUser($maxUserId, fn ($user) => $this->patientMenu->sendNotificationsHelp($maxUserId, $user)),
            'menu:link' => $this->patientMenu->sendLinkAccountHint($maxUserId),
            default => $this->client->sendToUser($maxUserId, 'Команда не распознана. Напишите /start для меню.', $this->patientMenu->mainMenuRows()),
        };
    }

    private function handleMenuText(int $maxUserId, string $text): bool
    {
        $lower = Str::lower($text);
        if (str_contains($lower, 'запис')) {
            $this->handleMenuPayload($maxUserId, 'menu:appointments');

            return true;
        }

        if (str_contains($lower, 'уведом')) {
            $this->handleMenuPayload($maxUserId, 'menu:notifications');

            return true;
        }

        if (str_contains($lower, 'вопрос') || str_contains($lower, 'ассистент') || str_contains($lower, 'помощник')) {
            $this->handleMenuPayload($maxUserId, 'menu:assistant');

            return true;
        }

        return false;
    }

    /** @param  callable(User): void  $callback */
    private function withLinkedUser(int $maxUserId, callable $callback): void
    {
        $account = $this->social->findAccount('max', (string) $maxUserId);
        if ($account === null) {
            $this->patientMenu->sendLinkAccountHint($maxUserId);

            return;
        }

        $callback($account->user);
    }

    public function sendWelcome(int $maxUserId, ?string $startPayload = null): void
    {
        $appName = config('app.name');
        $extra = '';
        if ($startPayload !== null && $startPayload !== '') {
            $target = $this->deepLink->url($startPayload);
            if ($target !== null) {
                $extra = "\n\nОткройте мини-приложение — мы подготовили нужный раздел.";
            }
        }

        $this->client->sendToUser(
            $maxUserId,
            "Здравствуйте! Я бот {$appName}.\n\n".
            "• «Найти клинику» — каталог в мини-приложении.\n".
            "• «Мои записи» и «Уведомления» — в меню ниже.\n".
            "• «Поделиться контактом» — телефон для записей.\n\n".
            'Напишите /start, чтобы снова показать меню.'.$extra,
            $this->patientMenu->mainMenuRows(),
        );
    }

    private function tryFollowClinic(int $maxUserId, string $slug): void
    {
        $clinic = $this->deepLink->findPublishedClinic($slug);
        if ($clinic === null) {
            return;
        }

        $account = $this->social->findAccount('max', (string) $maxUserId);
        if ($account === null) {
            return;
        }

        try {
            $this->clinicFollowers->subscribe($account->user, $clinic);
            $this->client->sendToUser(
                $maxUserId,
                "Вы подписаны на новости клиники «{$clinic->name}». Отписаться можно в профиле на сайте.",
            );
        } catch (\Throwable) {
            // Каналы не подключены — пользователь увидит подсказку в мини-приложении.
        }
    }

    /** @param  array<string, mixed>  $body */
    private function phoneFromAttachments(array $body): ?string
    {
        $attachments = is_array($body['attachments'] ?? null) ? $body['attachments'] : [];
        foreach ($attachments as $attachment) {
            if (! is_array($attachment) || ($attachment['type'] ?? '') !== 'contact') {
                continue;
            }

            $payload = is_array($attachment['payload'] ?? null) ? $attachment['payload'] : [];
            $phone = $payload['phone_number'] ?? $payload['phone'] ?? null;
            if (is_string($phone) && trim($phone) !== '') {
                return $this->normalizePhone($phone);
            }
        }

        return null;
    }

    /** @param  array<string, mixed>  $update */
    private function extractUser(array $update): array
    {
        if (is_array($update['user'] ?? null)) {
            return $update['user'];
        }

        $message = is_array($update['message'] ?? null) ? $update['message'] : [];

        return is_array($message['sender'] ?? null) ? $message['sender'] : [];
    }

    /** @param  array<string, mixed>  $user */
    private function userId(array $user): string
    {
        $id = $user['user_id'] ?? $user['id'] ?? null;

        return $id !== null && $id !== '' ? (string) $id : '';
    }

    /** @param  array<string, mixed>  $update */
    private function chatId(array $update): ?string
    {
        $chat = is_array($update['chat'] ?? null) ? $update['chat'] : null;
        if ($chat !== null && isset($chat['chat_id'])) {
            return (string) $chat['chat_id'];
        }

        $message = is_array($update['message'] ?? null) ? $update['message'] : [];

        return $this->chatIdFromMessage($message);
    }

    /** @param  array<string, mixed>  $message */
    private function chatIdFromMessage(array $message): ?string
    {
        $recipient = is_array($message['recipient'] ?? null) ? $message['recipient'] : [];
        if (isset($recipient['chat_id'])) {
            return (string) $recipient['chat_id'];
        }

        return null;
    }

    /** @param  array<string, mixed>  $update */
    private function onBotStopped(array $update): void
    {
        $maxUserId = $this->userId($this->extractUser($update));
        if ($maxUserId !== '') {
            $this->subscriptions->revokeMax($maxUserId);
            $this->maxUsers->markBlocked($maxUserId);
        }
    }

    private function syncMaxSubscription(string $maxUserId): void
    {
        $account = $this->social->findAccount('max', $maxUserId);
        if ($account === null) {
            return;
        }

        $this->subscriptions->activateMax($account->user, $maxUserId);
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';
        if ($digits === '') {
            return trim($phone);
        }
        if (str_starts_with($digits, '8') && strlen($digits) === 11) {
            $digits = '7'.substr($digits, 1);
        }

        return str_starts_with($digits, '7') ? '+'.$digits : '+'.$digits;
    }
}
