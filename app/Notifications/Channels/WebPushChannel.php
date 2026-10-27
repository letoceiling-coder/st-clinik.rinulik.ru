<?php

namespace App\Notifications\Channels;

use App\Jobs\SendWebPushNotificationJob;
use App\Models\NotificationDelivery;
use App\Models\NotificationSubscription;
use App\Services\Notifications\WebPushSender;
use Illuminate\Notifications\Notification;

class WebPushChannel
{
    public function __construct(private readonly WebPushSender $sender) {}

    /**
     * @param  mixed  $notifiable
     */
    public function send($notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toWebPush')) {
            return;
        }

        $message = $notification->toWebPush($notifiable);
        if (! is_array($message) || ! isset($message['title'], $message['body'])) {
            return;
        }

        $eventKey = method_exists($notification, 'eventKey')
            ? (string) $notification->eventKey()
            : class_basename($notification);

        foreach ($this->sender->activeSubscriptionsFor((int) $notifiable->id) as $subscription) {
            $payload = is_array($subscription->meta['subscription'] ?? null)
                ? $subscription->meta['subscription']
                : null;
            if ($payload === null) {
                continue;
            }

            $delivery = NotificationDelivery::query()->create([
                'user_id' => $notifiable->id,
                'channel' => NotificationSubscription::CHANNEL_WEB_PUSH,
                'event_key' => $eventKey,
                'status' => NotificationDelivery::STATUS_QUEUED,
            ]);

            SendWebPushNotificationJob::dispatch(
                $delivery->id,
                (int) $subscription->id,
                $payload,
                (string) $message['title'],
                (string) $message['body'],
                isset($message['url']) ? (string) $message['url'] : null,
            );
        }
    }
}
