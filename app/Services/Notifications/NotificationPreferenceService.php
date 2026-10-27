<?php

namespace App\Services\Notifications;

use App\Models\NotificationPreference;
use App\Models\NotificationSubscription;
use App\Models\User;
use App\Support\ClinicNotificationEvents;
use App\Support\NotificationEvents;

class NotificationPreferenceService
{
    public function __construct(private readonly NotificationSubscriptionService $subscriptions) {}

    /** @return list<string> */
    public function channelsFor(User $user, string $eventKey): array
    {
        $preference = NotificationPreference::query()->firstOrCreate(
            ['user_id' => $user->id, 'event_key' => $eventKey],
            ['channels' => $this->defaultChannels($user, $eventKey)],
        );

        $channels = is_array($preference->channels) ? $preference->channels : [];

        return array_values(array_filter($channels, fn (string $channel) => $this->channelAvailable($user, $channel)));
    }

    public function allows(User $user, string $eventKey, string $channel): bool
    {
        return in_array($channel, $this->channelsFor($user, $eventKey), true);
    }

    /** @return list<string> */
    public function availableOutboundChannels(User $user): array
    {
        return collect([
            NotificationSubscription::CHANNEL_EMAIL,
            NotificationSubscription::CHANNEL_MAX,
            NotificationSubscription::CHANNEL_WEB_PUSH,
        ])
            ->filter(fn (string $channel) => $this->channelAvailable($user, $channel))
            ->values()
            ->all();
    }

    /** @return list<string> */
    private function defaultChannels(User $user, string $eventKey): array
    {
        if ($eventKey === NotificationEvents::PLATFORM_MARKETING) {
            $channels = [];
            foreach ([NotificationSubscription::CHANNEL_EMAIL, NotificationSubscription::CHANNEL_MAX, NotificationSubscription::CHANNEL_WEB_PUSH] as $channel) {
                if ($this->channelAvailable($user, $channel)) {
                    $channels[] = $channel;
                }
            }

            return $channels;
        }

        $channels = ['in_app'];

        if ($this->channelAvailable($user, NotificationSubscription::CHANNEL_EMAIL)) {
            $channels[] = NotificationSubscription::CHANNEL_EMAIL;
        }

        if ($this->channelAvailable($user, NotificationSubscription::CHANNEL_MAX)) {
            $channels[] = NotificationSubscription::CHANNEL_MAX;
        }

        if ($this->channelAvailable($user, NotificationSubscription::CHANNEL_WEB_PUSH)) {
            $channels[] = NotificationSubscription::CHANNEL_WEB_PUSH;
        }

        return $channels;
    }

    /** @return list<array{key: string, label: string, channels: list<string>, available: list<string>}> */
    public function matrixFor(User $user): array
    {
        $available = collect(['in_app', NotificationSubscription::CHANNEL_EMAIL, NotificationSubscription::CHANNEL_MAX, NotificationSubscription::CHANNEL_WEB_PUSH])
            ->filter(fn (string $channel) => $this->channelAvailable($user, $channel))
            ->values()
            ->all();

        return collect(NotificationEvents::all())->map(function (string $eventKey) use ($user, $available) {
            $channels = array_values(array_intersect($this->channelsFor($user, $eventKey), $available));

            return [
                'key' => $eventKey,
                'label' => NotificationEvents::label($eventKey),
                'channels' => $channels,
                'available' => $available,
            ];
        })->all();
    }

    /** @return list<array{key: string, label: string, channels: list<string>, available: list<string>}> */
    public function matrixForClinic(User $user): array
    {
        $available = collect(['in_app', NotificationSubscription::CHANNEL_EMAIL, NotificationSubscription::CHANNEL_MAX, NotificationSubscription::CHANNEL_WEB_PUSH])
            ->filter(fn (string $channel) => $this->channelAvailable($user, $channel))
            ->values()
            ->all();

        return collect(ClinicNotificationEvents::all())->map(function (string $eventKey) use ($user, $available) {
            $channels = array_values(array_intersect($this->channelsFor($user, $eventKey), $available));

            return [
                'key' => $eventKey,
                'label' => ClinicNotificationEvents::label($eventKey),
                'channels' => $channels,
                'available' => $available,
            ];
        })->all();
    }

    public function toggleChannel(User $user, string $eventKey, string $channel): void
    {
        $current = $this->channelsFor($user, $eventKey);
        if (in_array($channel, $current, true)) {
            $next = array_values(array_filter($current, fn (string $c) => $c !== $channel));
        } else {
            $next = array_merge($current, [$channel]);
        }

        $this->update($user, $eventKey, $next);
    }

    /** @param  list<string>  $channels */
    public function update(User $user, string $eventKey, array $channels): void
    {
        abort_unless(in_array($eventKey, self::allowedEventKeys(), true), 422);

        $allowed = collect(['in_app', NotificationSubscription::CHANNEL_EMAIL, NotificationSubscription::CHANNEL_MAX, NotificationSubscription::CHANNEL_WEB_PUSH])
            ->filter(fn (string $channel) => $this->channelAvailable($user, $channel));

        $sanitized = collect($channels)
            ->unique()
            ->filter(fn (string $channel) => $allowed->contains($channel))
            ->values()
            ->all();

        $isClinicEvent = in_array($eventKey, ClinicNotificationEvents::all(), true);
        if (! $isClinicEvent && $eventKey !== NotificationEvents::PLATFORM_MARKETING && ! in_array('in_app', $sanitized, true)) {
            $sanitized = array_merge(['in_app'], $sanitized);
        }

        NotificationPreference::query()->updateOrCreate(
            ['user_id' => $user->id, 'event_key' => $eventKey],
            ['channels' => $sanitized],
        );
    }

    private function channelAvailable(User $user, string $channel): bool
    {
        return match ($channel) {
            'in_app' => true,
            NotificationSubscription::CHANNEL_EMAIL => $user->notify_email
                && ! $user->usesPlaceholderEmail()
                && filled($user->email),
            NotificationSubscription::CHANNEL_MAX => $this->subscriptions->activeMaxUserId($user) !== null,
            NotificationSubscription::CHANNEL_WEB_PUSH => $this->subscriptions->hasActiveWebPush($user),
            default => false,
        };
    }

    /** @return list<string> */
    private function allowedEventKeys(): array
    {
        return array_merge(NotificationEvents::all(), ClinicNotificationEvents::all());
    }
}
