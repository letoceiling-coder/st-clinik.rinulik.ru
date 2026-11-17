<?php

namespace App\Notifications\Channels;

use App\Models\NotificationDelivery;
use App\Models\NotificationSubscription;
use App\Services\Notifications\NotificationSubscriptionService;
use App\Services\Vk\VkCommunityClient;
use App\Services\Vk\VkSendException;
use Illuminate\Notifications\Notification;

class VkChannel
{
    public function __construct(
        private readonly VkCommunityClient $client,
        private readonly NotificationSubscriptionService $subscriptions,
    ) {}

    /** @param  mixed  $notifiable */
    public function send($notifiable, Notification $notification): void
    {
        if (! method_exists($notification, 'toVk')) {
            return;
        }

        $message = $notification->toVk($notifiable);
        if (! is_string($message) || $message === '') {
            return;
        }

        $vkUserId = $this->subscriptions->activeVkUserId($notifiable);
        if ($vkUserId === null) {
            return;
        }

        $eventKey = method_exists($notification, 'eventKey')
            ? (string) $notification->eventKey()
            : class_basename($notification);

        $delivery = NotificationDelivery::query()->create([
            'user_id' => $notifiable->id,
            'channel' => NotificationSubscription::CHANNEL_VK,
            'event_key' => $eventKey,
            'status' => NotificationDelivery::STATUS_QUEUED,
        ]);

        try {
            $this->client->sendToUser($vkUserId, $message);
            $delivery->update([
                'status' => NotificationDelivery::STATUS_SENT,
                'sent_at' => now(),
                'attempts' => 1,
            ]);
        } catch (\Throwable $e) {
            if ($e instanceof VkSendException && $e->userBlockedMessages()) {
                $this->subscriptions->revokeVk($vkUserId);
            }

            $delivery->update([
                'status' => NotificationDelivery::STATUS_FAILED,
                'attempts' => 1,
                'provider_response' => $e->getMessage(),
            ]);
        }
    }
}
