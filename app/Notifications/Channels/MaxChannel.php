<?php

namespace App\Notifications\Channels;

use App\Models\NotificationDelivery;
use App\Models\NotificationSubscription;
use App\Services\Max\MaxBotClient;
use App\Services\Notifications\NotificationSubscriptionService;
use Illuminate\Notifications\Notification;

class MaxChannel
{
    public function __construct(
        private readonly MaxBotClient $client,
        private readonly NotificationSubscriptionService $subscriptions,
    ) {}

    /**
     * @param  mixed  $notifiable
     */
    public function send($notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toMax')) {
            return;
        }

        $message = $notification->toMax($notifiable);
        if (! is_string($message) || $message === '') {
            return;
        }

        $maxUserId = $this->subscriptions->activeMaxUserId($notifiable);
        if ($maxUserId === null) {
            return;
        }

        $eventKey = method_exists($notification, 'eventKey')
            ? (string) $notification->eventKey()
            : class_basename($notification);

        $delivery = NotificationDelivery::query()->create([
            'user_id' => $notifiable->id,
            'channel' => NotificationSubscription::CHANNEL_MAX,
            'event_key' => $eventKey,
            'status' => NotificationDelivery::STATUS_QUEUED,
        ]);

        try {
            $this->client->sendToUser((int) $maxUserId, $message);
            $delivery->update([
                'status' => NotificationDelivery::STATUS_SENT,
                'sent_at' => now(),
                'attempts' => 1,
            ]);
        } catch (\Throwable $e) {
            $delivery->update([
                'status' => NotificationDelivery::STATUS_FAILED,
                'attempts' => 1,
                'provider_response' => $e->getMessage(),
            ]);
        }
    }
}
