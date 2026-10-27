<?php

namespace App\Services\Notifications;

use App\Models\NotificationSubscription;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class WebPushSender
{
    public function configured(): bool
    {
        return filled(config('services.webpush.public_key'))
            && filled(config('services.webpush.private_key'))
            && filled(config('services.webpush.subject'));
    }

    /**
     * @param  array<string, mixed>  $subscription
     */
    public function send(array $subscription, string $title, string $body, ?string $url = null): WebPushSendResult
    {
        if (! $this->configured()) {
            return WebPushSendResult::failed('not configured');
        }

        $payload = json_encode([
            'title' => $title,
            'body' => $body,
            'url' => $url,
        ], JSON_UNESCAPED_UNICODE);

        if ($payload === false) {
            return WebPushSendResult::failed('payload encode failed');
        }

        try {
            $webPush = new WebPush([
                'VAPID' => [
                    'subject' => (string) config('services.webpush.subject'),
                    'publicKey' => (string) config('services.webpush.public_key'),
                    'privateKey' => (string) config('services.webpush.private_key'),
                ],
            ]);

            $report = $webPush->sendOneNotification(
                Subscription::create($subscription),
                $payload,
            );

            if ($report->isSuccess()) {
                return WebPushSendResult::ok();
            }

            $reason = (string) $report->getReason();
            Log::warning('web_push.send_failed', [
                'reason' => $reason,
                'expired' => $report->isSubscriptionExpired(),
            ]);

            return new WebPushSendResult(
                success: false,
                subscriptionExpired: $report->isSubscriptionExpired(),
                reason: $reason,
            );
        } catch (\Throwable $e) {
            Log::warning('web_push.send_exception', ['error' => $e->getMessage()]);

            return WebPushSendResult::failed($e->getMessage());
        }
    }

    /** @return list<NotificationSubscription> */
    public function activeSubscriptionsFor(int $userId): array
    {
        return NotificationSubscription::query()
            ->where('user_id', $userId)
            ->where('channel', NotificationSubscription::CHANNEL_WEB_PUSH)
            ->where('status', NotificationSubscription::STATUS_ACTIVE)
            ->get()
            ->all();
    }
}
