<?php

namespace App\Services\Broadcasts;

use App\Jobs\SendBroadcastBatch;
use App\Jobs\SendBroadcastRecipient;
use App\Mail\PlatformBroadcastMail;
use App\Models\Broadcast;
use App\Models\BroadcastRecipient;
use App\Models\Clinic;
use App\Models\ClinicFollower;
use App\Models\NotificationSubscription;
use App\Models\StopListEntry;
use App\Models\User;
use App\Services\Max\MaxBotClient;
use App\Services\Notifications\NotificationPreferenceService;
use App\Services\Notifications\NotificationSubscriptionService;
use App\Services\Notifications\WebPushSender;
use App\Support\NotificationEvents;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use RuntimeException;

class BroadcastService
{
    private const BATCH_SIZE = 40;

    public function __construct(
        private readonly NotificationPreferenceService $preferences,
        private readonly NotificationSubscriptionService $subscriptions,
        private readonly ClinicFollowerService $followers,
        private readonly ClinicBroadcastSettings $clinicSettings,
        private readonly MaxBotClient $maxClient,
        private readonly WebPushSender $webPush,
    ) {}

    /** @return array{count: int, sample: list<array{id: int, name: string, email: string|null}>} */
    public function estimateAudience(Broadcast $broadcast): array
    {
        if ($broadcast->sender_type === Broadcast::SENDER_CLINIC) {
            $count = ClinicFollower::query()
                ->when($broadcast->clinic_id, fn ($q) => $q->where('clinic_id', $broadcast->clinic_id))
                ->count();

            return ['count' => $count, 'sample' => []];
        }

        $query = $this->audienceQuery($broadcast);

        return [
            'count' => (clone $query)->count(),
            'sample' => (clone $query)->limit(8)->get(['id', 'name', 'email'])
                ->map(fn (User $u) => ['id' => $u->id, 'name' => $u->name, 'email' => $u->email])->all(),
        ];
    }

    /** @return array{created: int, skipped: int} */
    public function buildRecipients(Broadcast $broadcast, bool $replaceExisting = true): array
    {
        abort_unless($broadcast->isEditable() || $broadcast->moderation_status === Broadcast::MODERATION_APPROVED, 422);

        return $broadcast->sender_type === Broadcast::SENDER_CLINIC
            ? $this->buildClinicRecipients($broadcast, $replaceExisting)
            : $this->buildPlatformRecipients($broadcast, $replaceExisting);
    }

    /** @return array{created: int, skipped: int} */
    private function buildPlatformRecipients(Broadcast $broadcast, bool $replaceExisting): array
    {
        abort_unless($broadcast->sender_type === Broadcast::SENDER_PLATFORM, 422);

        $channels = $this->normalizedChannels($broadcast);
        if ($channels === []) {
            throw new RuntimeException('Выберите хотя бы один канал.');
        }

        $created = 0;
        $skipped = 0;

        DB::transaction(function () use ($broadcast, $channels, $replaceExisting, &$created, &$skipped): void {
            if ($replaceExisting) {
                $broadcast->recipients()->where('is_test', false)->delete();
            }

            $this->audienceQuery($broadcast)->chunkById(200, function ($users) use ($broadcast, $channels, &$created, &$skipped): void {
                /** @var User $user */
                foreach ($users as $user) {
                    foreach ($channels as $channel) {
                        if (! $this->preferences->allows($user, NotificationEvents::PLATFORM_MARKETING, $channel)) {
                            $skipped++;

                            continue;
                        }

                        $contact = $this->contactFor($user, $channel);
                        if ($contact === null || StopListEntry::blocks($channel, $contact)) {
                            $skipped++;

                            continue;
                        }

                        if ($this->recipientExists($broadcast, $user->id, $channel)) {
                            $skipped++;

                            continue;
                        }

                        $this->createRecipient($broadcast, $user, $channel, $contact);
                        $created++;
                    }
                }
            });

            $broadcast->update([
                'recipients_total' => $broadcast->recipients()->where('is_test', false)->count(),
            ]);
        });

        return ['created' => $created, 'skipped' => $skipped];
    }

    /** @return array{created: int, skipped: int} */
    private function buildClinicRecipients(Broadcast $broadcast, bool $replaceExisting): array
    {
        abort_unless($broadcast->sender_type === Broadcast::SENDER_CLINIC && $broadcast->clinic_id, 422);

        $channels = $this->normalizedChannels($broadcast);
        if ($channels === []) {
            throw new RuntimeException('Выберите хотя бы один канал.');
        }

        $created = 0;
        $skipped = 0;

        DB::transaction(function () use ($broadcast, $channels, $replaceExisting, &$created, &$skipped): void {
            if ($replaceExisting) {
                $broadcast->recipients()->where('is_test', false)->delete();
            }

            ClinicFollower::query()
                ->where('clinic_id', $broadcast->clinic_id)
                ->with('user')
                ->chunkById(200, function ($rows) use ($broadcast, $channels, &$created, &$skipped): void {
                    foreach ($rows as $follower) {
                        $user = $follower->user;
                        if (! $user instanceof User) {
                            $skipped++;

                            continue;
                        }

                        $followerChannels = is_array($follower->channels) ? $follower->channels : [];
                        foreach (array_intersect($channels, $followerChannels) as $channel) {
                            $contact = $this->contactFor($user, $channel);
                            if ($contact === null || StopListEntry::blocks($channel, $contact)) {
                                $skipped++;

                                continue;
                            }

                            if ($this->recipientExists($broadcast, $user->id, $channel)) {
                                $skipped++;

                                continue;
                            }

                            $this->createRecipient($broadcast, $user, $channel, $contact);
                            $created++;
                        }
                    }
                });

            $broadcast->update([
                'recipients_total' => $broadcast->recipients()->where('is_test', false)->count(),
            ]);
        });

        return ['created' => $created, 'skipped' => $skipped];
    }

    public function start(Broadcast $broadcast): void
    {
        abort_unless(in_array($broadcast->status, ['draft', 'scheduled', 'paused'], true), 422);

        if ($broadcast->sender_type === Broadcast::SENDER_CLINIC) {
            abort_unless($broadcast->moderation_status === Broadcast::MODERATION_APPROVED, 422, 'Рассылка должна быть одобрена модератором.');
        }

        if ($broadcast->recipients()->where('is_test', false)->where('status', BroadcastRecipient::STATUS_QUEUED)->doesntExist()) {
            $this->buildRecipients($broadcast);
        }

        $queued = $broadcast->recipients()->where('is_test', false)->where('status', BroadcastRecipient::STATUS_QUEUED)->count();
        abort_if($queued === 0, 422, 'Нет получателей для отправки. Сузьте фильтры или проверьте подписки.');

        $broadcast->update([
            'status' => 'running',
            'started_at' => $broadcast->started_at ?? now(),
            'scheduled_at' => null,
        ]);

        SendBroadcastBatch::dispatch($broadcast->id);
    }

    public function pause(Broadcast $broadcast): void
    {
        if ($broadcast->status === 'running') {
            $broadcast->update(['status' => 'paused']);
        }
    }

    public function cancel(Broadcast $broadcast): void
    {
        if (in_array($broadcast->status, ['draft', 'scheduled', 'running', 'paused'], true)) {
            $broadcast->update(['status' => 'cancelled', 'completed_at' => now()]);
        }
    }

    public function schedule(Broadcast $broadcast, \DateTimeInterface $at): void
    {
        abort_unless($broadcast->status === 'draft', 422);
        $broadcast->update(['status' => 'scheduled', 'scheduled_at' => $at]);
        $this->buildRecipients($broadcast);
    }

    /** @return list<string> */
    public function sendTest(Broadcast $broadcast, User $admin): array
    {
        $sent = [];
        foreach ($this->normalizedChannels($broadcast) as $channel) {
            if (! $this->preferences->allows($admin, NotificationEvents::PLATFORM_MARKETING, $channel)) {
                continue;
            }

            $contact = $this->contactFor($admin, $channel);
            if ($contact === null) {
                continue;
            }

            $recipient = BroadcastRecipient::query()->create([
                'broadcast_id' => $broadcast->id,
                'user_id' => $admin->id,
                'channel' => $channel,
                'contact' => $contact,
                'track_code' => $this->uniqueTrackCode(),
                'status' => BroadcastRecipient::STATUS_QUEUED,
                'is_test' => true,
            ]);

            SendBroadcastRecipient::dispatchSync($recipient->id);
            $sent[] = $channel;
        }

        return $sent;
    }

    public function processBatch(int $broadcastId): ?\DateTimeInterface
    {
        $broadcast = Broadcast::query()->find($broadcastId);
        if ($broadcast === null || $broadcast->status !== 'running') {
            return null;
        }

        $recipients = $broadcast->recipients()
            ->where('is_test', false)
            ->where('status', BroadcastRecipient::STATUS_QUEUED)
            ->orderBy('id')
            ->limit(self::BATCH_SIZE)
            ->get();

        foreach ($recipients as $recipient) {
            SendBroadcastRecipient::dispatch($recipient->id);
        }

        $remaining = $broadcast->recipients()
            ->where('is_test', false)
            ->where('status', BroadcastRecipient::STATUS_QUEUED)
            ->exists();

        if (! $remaining) {
            $broadcast->update(['status' => 'completed', 'completed_at' => now()]);
            $this->refreshStats($broadcast);

            return null;
        }

        return now()->addSecond();
    }

    public function deliver(BroadcastRecipient $recipient): void
    {
        $recipient->loadMissing('broadcast', 'user');
        $broadcast = $recipient->broadcast;
        if ($broadcast === null) {
            return;
        }

        if ($recipient->status !== BroadcastRecipient::STATUS_QUEUED) {
            return;
        }

        if ($recipient->contact && StopListEntry::blocks($recipient->channel, $recipient->contact)) {
            $recipient->update(['status' => BroadcastRecipient::STATUS_SKIPPED, 'error' => 'Стоп-лист']);

            return;
        }

        $attempt = $recipient->attempts + 1;

        try {
            match ($recipient->channel) {
                'email' => $this->sendEmail($recipient, $broadcast),
                NotificationSubscription::CHANNEL_MAX => $this->sendMax($recipient, $broadcast),
                NotificationSubscription::CHANNEL_WEB_PUSH => $this->sendWebPush($recipient, $broadcast),
                default => throw new RuntimeException('Канал не поддерживается'),
            };

            $recipient->update([
                'status' => BroadcastRecipient::STATUS_SENT,
                'sent_at' => now(),
                'attempts' => $attempt,
                'error' => null,
            ]);

            if (! $recipient->is_test) {
                $broadcast->increment('sent_count');
            }
        } catch (\Throwable $e) {
            $recipient->update([
                'attempts' => $attempt,
                'error' => mb_substr($e->getMessage(), 0, 250),
                'status' => $attempt >= 3 ? BroadcastRecipient::STATUS_FAILED : BroadcastRecipient::STATUS_QUEUED,
            ]);

            if ($attempt >= 3 && ! $recipient->is_test) {
                $broadcast->increment('failed_count');
            }

            if ($attempt < 3) {
                throw $e;
            }
        }
    }

    public function recordClick(BroadcastRecipient $recipient): void
    {
        if ($recipient->clicked_at === null) {
            $recipient->update(['clicked_at' => now()]);
            $recipient->broadcast?->increment('click_count');
        }
    }

    public function unsubscribe(BroadcastRecipient $recipient): void
    {
        if ($recipient->broadcast?->sender_type === Broadcast::SENDER_CLINIC) {
            $this->unsubscribeFromClinic($recipient);

            return;
        }

        $user = $recipient->user;
        if ($user instanceof User) {
            $this->preferences->update($user, NotificationEvents::PLATFORM_MARKETING, []);
        }

        if ($recipient->contact) {
            StopListEntry::add($recipient->channel, $recipient->contact, 'unsubscribed', $user?->id, 'Отписка от рассылки платформы');
        }

        $recipient->update(['status' => BroadcastRecipient::STATUS_UNSUBSCRIBED]);
    }

    public function unsubscribeFromClinic(BroadcastRecipient $recipient): void
    {
        $user = $recipient->user;
        $clinicId = $recipient->broadcast?->clinic_id;
        if ($user instanceof User && $clinicId) {
            $this->followers->unsubscribe($user, Clinic::query()->findOrFail($clinicId));
        }

        $recipient->update(['status' => BroadcastRecipient::STATUS_UNSUBSCRIBED]);
    }

    public function trackedUrl(BroadcastRecipient $recipient): ?string
    {
        if (! filled($recipient->broadcast?->button_url)) {
            return null;
        }

        return route('broadcast.go', ['code' => $recipient->track_code]);
    }

    public function unsubscribeUrl(BroadcastRecipient $recipient): string
    {
        $route = $recipient->broadcast?->sender_type === Broadcast::SENDER_CLINIC
            ? 'broadcast.clinic-unsubscribe'
            : 'broadcast.unsubscribe';

        return URL::signedRoute($route, ['code' => $recipient->track_code]);
    }

    /** @return array{plain: string, html: string, subject: string} */
    public function renderForRecipient(Broadcast $broadcast, BroadcastRecipient $recipient, bool $testPrefix = false): array
    {
        $prefix = $testPrefix || $recipient->is_test ? '[Тест] ' : '';
        $body = trim($broadcast->body);
        $link = $this->trackedUrl($recipient);
        $buttonLabel = filled($broadcast->button_label) ? (string) $broadcast->button_label : 'Подробнее';
        $unsub = $this->unsubscribeUrl($recipient);

        $plain = $prefix.$body;
        if ($link !== null) {
            $plain .= "\n\n{$buttonLabel}: {$link}";
        }
        $unsubLabel = $broadcast->sender_type === Broadcast::SENDER_CLINIC
            ? 'Отписаться от новостей этой клиники'
            : 'Отписаться от рассылки';
        $plain .= "\n\n{$unsubLabel}: {$unsub}";

        $html = '<p>'.nl2br(e($prefix.$body)).'</p>';
        if ($link !== null) {
            $html .= '<p><a href="'.e($link).'">'.e($buttonLabel).'</a></p>';
        }
        $html .= '<p style="font-size:12px;color:#666"><a href="'.e($unsub).'">'.e($unsubLabel).'</a></p>';

        return [
            'subject' => $prefix.($broadcast->name ?: 'СтомКлиник'),
            'plain' => $plain,
            'html' => $html,
        ];
    }

    public function refreshStats(Broadcast $broadcast): void
    {
        $broadcast->update([
            'sent_count' => $broadcast->recipients()->where('is_test', false)->where('status', BroadcastRecipient::STATUS_SENT)->count(),
            'failed_count' => $broadcast->recipients()->where('is_test', false)->where('status', BroadcastRecipient::STATUS_FAILED)->count(),
            'click_count' => $broadcast->recipients()->where('is_test', false)->whereNotNull('clicked_at')->count(),
        ]);
    }

    public function dispatchDueScheduled(): int
    {
        $due = Broadcast::query()
            ->where('sender_type', Broadcast::SENDER_PLATFORM)
            ->where('status', 'scheduled')
            ->where('scheduled_at', '<=', now())
            ->get();

        foreach ($due as $broadcast) {
            $this->start($broadcast);
        }

        return $due->count();
    }

    /** @return Builder<User> */
    private function audienceQuery(Broadcast $broadcast): Builder
    {
        $filters = is_array($broadcast->filters) ? $broadcast->filters : [];
        $roles = array_values(array_filter((array) ($filters['roles'] ?? ['user'])));
        if ($roles === []) {
            $roles = ['user'];
        }

        $query = User::query()->where('status', 'active')->whereIn('role', $roles);

        if ($cityId = (int) ($filters['city_id'] ?? 0)) {
            $query->where('city_id', $cityId);
        }

        if (($days = (int) ($filters['active_within_days'] ?? 0)) > 0) {
            $query->where(function (Builder $b) use ($days): void {
                $b->where('last_login_at', '>=', now()->subDays($days))
                    ->orWhere('created_at', '>=', now()->subDays($days));
            });
        }

        return $query;
    }

    /** @return list<string> */
    private function normalizedChannels(Broadcast $broadcast): array
    {
        $channels = is_array($broadcast->channels) ? $broadcast->channels : [];

        return array_values(array_intersect($channels, array_keys(Broadcast::CHANNELS)));
    }

    private function contactFor(User $user, string $channel): ?string
    {
        return match ($channel) {
            NotificationSubscription::CHANNEL_EMAIL => $user->notify_email && ! $user->usesPlaceholderEmail() && filled($user->email)
                ? StopListEntry::normalize('email', (string) $user->email)
                : null,
            NotificationSubscription::CHANNEL_MAX => $this->subscriptions->activeMaxUserId($user),
            NotificationSubscription::CHANNEL_WEB_PUSH => $this->subscriptions->hasActiveWebPush($user) ? 'web_push' : null,
            default => null,
        };
    }

    private function sendEmail(BroadcastRecipient $recipient, Broadcast $broadcast): void
    {
        $render = $this->renderForRecipient($broadcast, $recipient);
        Mail::to((string) $recipient->contact)->send(new PlatformBroadcastMail(
            subjectLine: $render['subject'],
            bodyHtml: $render['html'],
            bodyText: $render['plain'],
            unsubscribeUrl: $this->unsubscribeUrl($recipient),
        ));
    }

    private function sendMax(BroadcastRecipient $recipient, Broadcast $broadcast): void
    {
        $maxUserId = $this->subscriptions->activeMaxUserId($recipient->user);
        if ($maxUserId === null) {
            throw new RuntimeException('Нет подписки MAX');
        }

        $render = $this->renderForRecipient($broadcast, $recipient);
        if (! $this->maxClient->sendToUser((int) $maxUserId, $render['plain'])) {
            throw new RuntimeException('MAX не принял сообщение');
        }
    }

    private function sendWebPush(BroadcastRecipient $recipient, Broadcast $broadcast): void
    {
        $user = $recipient->user;
        if (! $user instanceof User) {
            throw new RuntimeException('Пользователь не найден');
        }

        $subscription = NotificationSubscription::query()
            ->where('user_id', $user->id)
            ->where('channel', NotificationSubscription::CHANNEL_WEB_PUSH)
            ->where('status', NotificationSubscription::STATUS_ACTIVE)
            ->first();

        $payload = is_array($subscription?->meta['subscription'] ?? null) ? $subscription->meta['subscription'] : null;
        if ($payload === null) {
            throw new RuntimeException('Нет Web Push подписки');
        }

        $render = $this->renderForRecipient($broadcast, $recipient);
        $result = $this->webPush->send(
            $payload,
            $render['subject'],
            mb_substr(strip_tags($broadcast->body), 0, 180),
            $this->trackedUrl($recipient),
        );

        if (! $result->success) {
            if ($result->subscriptionExpired && $subscription !== null) {
                $subscription->update([
                    'status' => NotificationSubscription::STATUS_REVOKED,
                    'revoked_at' => now(),
                ]);
            }

            throw new RuntimeException($result->reason ?? 'Web Push failed');
        }
    }

    public function submitClinicForModeration(Broadcast $broadcast, Clinic $clinic): void
    {
        abort_unless($broadcast->sender_type === Broadcast::SENDER_CLINIC && $broadcast->clinic_id === $clinic->id, 422);
        abort_unless($broadcast->isEditable(), 422);

        $settings = $this->clinicSettings->all();
        abort_unless($settings['enabled'], 422, 'Рассылки клиник временно отключены.');
        abort_unless($this->clinicSettings->clinicMayBroadcast($clinic), 422, 'Рассылки доступны при активном продвижении клиники.');
        $weekly = Broadcast::query()
            ->where('sender_type', Broadcast::SENDER_CLINIC)
            ->where('clinic_id', $clinic->id)
            ->where('id', '!=', $broadcast->id)
            ->where('created_at', '>=', now()->startOfWeek())
            ->whereIn('moderation_status', [Broadcast::MODERATION_PENDING, Broadcast::MODERATION_APPROVED])
            ->whereNot('status', 'cancelled')
            ->count();
        abort_if($weekly >= $settings['max_per_week'], 422, 'Превышен недельный лимит рассылок.');

        $this->assertClinicBodyAllowed($broadcast->body, $settings['max_body_length']);

        $this->buildRecipients($broadcast);

        $broadcast->update([
            'moderation_status' => Broadcast::MODERATION_PENDING,
            'moderation_note' => null,
        ]);
    }

    public function moderateClinic(Broadcast $broadcast, string $decision, ?string $note = null): void
    {
        abort_unless($broadcast->sender_type === Broadcast::SENDER_CLINIC, 422);
        abort_unless($broadcast->moderation_status === Broadcast::MODERATION_PENDING, 422);

        if ($decision === 'approve') {
            $broadcast->update([
                'moderation_status' => Broadcast::MODERATION_APPROVED,
                'moderation_note' => null,
            ]);

            return;
        }

        $broadcast->update([
            'moderation_status' => Broadcast::MODERATION_REJECTED,
            'moderation_note' => mb_substr((string) $note, 0, 500),
        ]);
    }

    private function assertClinicBodyAllowed(string $body, int $maxLength): void
    {
        abort_if(mb_strlen(trim($body)) > $maxLength, 422, "Текст длиннее {$maxLength} символов.");

        if (preg_match('/(?:\+7|8)\s?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/u', $body) === 1) {
            throw new RuntimeException('В тексте нельзя указывать телефон — используйте кнопку-ссылку.');
        }

        if (preg_match('/[\w.+-]+@[\w-]+\.[\w.-]+/u', $body) === 1) {
            throw new RuntimeException('В тексте нельзя указывать email — используйте кнопку-ссылку.');
        }

        $lower = mb_strtolower($body);
        foreach (['100% гарант', 'вылечим', 'избавим навсегда', 'без боли за 1'] as $phrase) {
            if (str_contains($lower, $phrase)) {
                throw new RuntimeException('Текст содержит запрещённые медицинские обещания.');
            }
        }
    }

    private function recipientExists(Broadcast $broadcast, int $userId, string $channel): bool
    {
        return $broadcast->recipients()
            ->where('user_id', $userId)
            ->where('channel', $channel)
            ->where('is_test', false)
            ->exists();
    }

    private function createRecipient(Broadcast $broadcast, User $user, string $channel, string $contact): void
    {
        BroadcastRecipient::query()->create([
            'broadcast_id' => $broadcast->id,
            'user_id' => $user->id,
            'channel' => $channel,
            'contact' => $contact,
            'track_code' => $this->uniqueTrackCode(),
            'status' => BroadcastRecipient::STATUS_QUEUED,
        ]);
    }

    private function uniqueTrackCode(): string
    {
        do {
            $code = Str::lower(Str::random(10));
        } while (BroadcastRecipient::query()->where('track_code', $code)->exists());

        return $code;
    }
}
