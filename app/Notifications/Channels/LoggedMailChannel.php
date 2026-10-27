<?php

namespace App\Notifications\Channels;

use App\Models\NotificationDelivery;
use App\Models\NotificationSubscription;
use Illuminate\Notifications\Channels\MailChannel;
use Illuminate\Notifications\Notification;
use Throwable;

/** Отправка email с записью в notification_deliveries. */
class LoggedMailChannel
{
    public function __construct(private readonly MailChannel $mail) {}

    /**
     * @param  mixed  $notifiable
     */
    public function send($notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toMail')) {
            return;
        }

        $eventKey = method_exists($notification, 'eventKey')
            ? (string) $notification->eventKey()
            : class_basename($notification);

        $delivery = NotificationDelivery::query()->create([
            'user_id' => $notifiable->id ?? null,
            'channel' => NotificationSubscription::CHANNEL_EMAIL,
            'event_key' => $eventKey,
            'status' => NotificationDelivery::STATUS_QUEUED,
        ]);

        try {
            $this->mail->send($notifiable, $notification);
            $delivery->update([
                'status' => NotificationDelivery::STATUS_SENT,
                'sent_at' => now(),
                'attempts' => 1,
            ]);
        } catch (Throwable $e) {
            $delivery->update([
                'status' => NotificationDelivery::STATUS_FAILED,
                'attempts' => 1,
                'provider_response' => mb_substr($e->getMessage(), 0, 500),
            ]);

            throw $e;
        }
    }
}
