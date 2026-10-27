<?php

namespace App\Jobs;

use App\Models\NotificationDelivery;
use App\Services\Max\MaxBotClient;
use App\Services\Notifications\NotificationSubscriptionService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\RateLimited;
use Throwable;

class SendMaxNotificationJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 5;

    /** @return list<int> */
    public function backoff(): array
    {
        return [30, 120, 300, 900, 1800];
    }

    public function __construct(
        public int $deliveryId,
        public int $maxUserId,
        public string $message,
    ) {
        $this->afterCommit();
    }

    /** @return list<object> */
    public function middleware(): array
    {
        return [new RateLimited('max-bot')];
    }

    public function handle(MaxBotClient $client, NotificationSubscriptionService $subscriptions): void
    {
        $delivery = NotificationDelivery::query()->find($this->deliveryId);
        if ($delivery === null) {
            return;
        }

        $attempt = $delivery->attempts + 1;

        try {
            $ok = $client->sendToUser($this->maxUserId, $this->message);
            if ($ok) {
                $delivery->update([
                    'status' => NotificationDelivery::STATUS_SENT,
                    'sent_at' => now(),
                    'attempts' => $attempt,
                    'provider_response' => null,
                ]);

                return;
            }

            $delivery->update([
                'attempts' => $attempt,
                'provider_response' => 'send returned false',
            ]);

            throw new \RuntimeException('MAX send returned false');
        } catch (Throwable $e) {
            if ($this->isPermanentMaxFailure($e->getMessage())) {
                $subscriptions->revokeMax((string) $this->maxUserId);
                $delivery->update([
                    'status' => NotificationDelivery::STATUS_FAILED,
                    'attempts' => $attempt,
                    'provider_response' => $e->getMessage(),
                ]);

                return;
            }

            $delivery->update([
                'attempts' => $attempt,
                'provider_response' => $e->getMessage(),
            ]);

            throw $e;
        }
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

    private function isPermanentMaxFailure(string $message): bool
    {
        $lower = mb_strtolower($message);

        return str_contains($lower, 'blocked')
            || str_contains($lower, 'bot was stopped')
            || str_contains($lower, 'user not found');
    }
}
