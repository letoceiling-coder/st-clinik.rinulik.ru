<?php

namespace App\Jobs;

use App\Models\NotificationDelivery;
use App\Models\NotificationSubscription;
use App\Services\Notifications\WebPushSender;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

class SendWebPushNotificationJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    /** @return list<int> */
    public function backoff(): array
    {
        return [30, 120, 300, 900, 1800];
    }

    /**
     * @param  array<string, mixed>  $subscriptionPayload
     */
    public function __construct(
        public int $deliveryId,
        public int $subscriptionId,
        public array $subscriptionPayload,
        public string $title,
        public string $body,
        public ?string $url = null,
    ) {
        $this->afterCommit();
    }

    public function handle(WebPushSender $sender): void
    {
        $delivery = NotificationDelivery::query()->find($this->deliveryId);
        if ($delivery === null) {
            return;
        }

        $subscription = NotificationSubscription::query()->find($this->subscriptionId);
        if ($subscription === null) {
            $delivery->update([
                'status' => NotificationDelivery::STATUS_SKIPPED,
                'provider_response' => 'subscription missing',
            ]);

            return;
        }

        $attempt = $delivery->attempts + 1;
        $result = $sender->send($this->subscriptionPayload, $this->title, $this->body, $this->url);

        if ($result->success) {
            $delivery->update([
                'status' => NotificationDelivery::STATUS_SENT,
                'sent_at' => now(),
                'attempts' => $attempt,
                'provider_response' => null,
            ]);

            return;
        }

        if ($result->subscriptionExpired) {
            $subscription->update([
                'status' => NotificationSubscription::STATUS_REVOKED,
                'revoked_at' => now(),
            ]);
            $delivery->update([
                'status' => NotificationDelivery::STATUS_FAILED,
                'attempts' => $attempt,
                'provider_response' => $result->reason ?? 'subscription expired',
            ]);

            return;
        }

        $delivery->update([
            'attempts' => $attempt,
            'provider_response' => $result->reason,
        ]);

        throw new \RuntimeException($result->reason ?? 'Web Push send failed');
    }

    public function failed(?Throwable $e): void
    {
        NotificationDelivery::query()
            ->whereKey($this->deliveryId)
            ->where('status', NotificationDelivery::STATUS_QUEUED)
            ->update([
                'status' => NotificationDelivery::STATUS_FAILED,
                'provider_response' => $e?->getMessage(),
            ]);
    }
}
