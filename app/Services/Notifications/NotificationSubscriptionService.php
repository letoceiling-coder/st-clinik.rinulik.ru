<?php

namespace App\Services\Notifications;

use App\Models\NotificationSubscription;
use App\Models\User;

class NotificationSubscriptionService
{
    public function activateMax(User $user, string $maxUserId, ?array $meta = null): NotificationSubscription
    {
        return $this->activate($user, NotificationSubscription::CHANNEL_MAX, $maxUserId, $meta);
    }

    public function revokeMax(string $maxUserId): void
    {
        $this->revokeByExternal(NotificationSubscription::CHANNEL_MAX, $maxUserId);
    }

    public function activate(User $user, string $channel, string $externalId, ?array $meta = null): NotificationSubscription
    {
        $subscription = NotificationSubscription::query()->updateOrCreate(
            [
                'channel' => $channel,
                'external_id' => $externalId,
            ],
            [
                'user_id' => $user->id,
                'status' => NotificationSubscription::STATUS_ACTIVE,
                'allowed_at' => now(),
                'revoked_at' => null,
                'meta' => $meta,
            ],
        );

        return $subscription;
    }

    public function revokeByExternal(string $channel, string $externalId): void
    {
        NotificationSubscription::query()
            ->where('channel', $channel)
            ->where('external_id', $externalId)
            ->where('status', NotificationSubscription::STATUS_ACTIVE)
            ->update([
                'status' => NotificationSubscription::STATUS_REVOKED,
                'revoked_at' => now(),
            ]);
    }

    public function activeMaxUserId(User $user): ?string
    {
        $row = NotificationSubscription::query()
            ->where('user_id', $user->id)
            ->where('channel', NotificationSubscription::CHANNEL_MAX)
            ->where('status', NotificationSubscription::STATUS_ACTIVE)
            ->value('external_id');

        return is_string($row) && $row !== '' ? $row : null;
    }

    /** @param  array<string, mixed>  $subscription */
    public function activateWebPush(User $user, array $subscription): NotificationSubscription
    {
        $endpoint = (string) ($subscription['endpoint'] ?? '');
        $externalId = hash('sha256', $endpoint);

        return $this->activate($user, NotificationSubscription::CHANNEL_WEB_PUSH, $externalId, [
            'subscription' => $subscription,
        ]);
    }

    public function revokeWebPush(string $endpoint): void
    {
        $this->revokeByExternal(NotificationSubscription::CHANNEL_WEB_PUSH, hash('sha256', $endpoint));
    }

    public function hasActiveWebPush(User $user): bool
    {
        return NotificationSubscription::query()
            ->where('user_id', $user->id)
            ->where('channel', NotificationSubscription::CHANNEL_WEB_PUSH)
            ->where('status', NotificationSubscription::STATUS_ACTIVE)
            ->exists();
    }
}
