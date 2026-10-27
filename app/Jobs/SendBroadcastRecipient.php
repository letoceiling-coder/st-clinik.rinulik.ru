<?php

namespace App\Jobs;

use App\Models\BroadcastRecipient;
use App\Models\NotificationSubscription;
use App\Services\Broadcasts\BroadcastService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\RateLimited;
use Throwable;

class SendBroadcastRecipient implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @return list<int> */
    public function backoff(): array
    {
        return [30, 120, 600];
    }

    public function __construct(public int $recipientId)
    {
        $this->afterCommit();
    }

    /** @return list<object> */
    public function middleware(): array
    {
        $recipient = BroadcastRecipient::query()->find($this->recipientId);
        if ($recipient?->channel === NotificationSubscription::CHANNEL_MAX) {
            return [new RateLimited('max-bot')];
        }

        return [];
    }

    public function handle(BroadcastService $broadcasts): void
    {
        $recipient = BroadcastRecipient::query()->find($this->recipientId);
        if ($recipient === null) {
            return;
        }

        $broadcasts->deliver($recipient);
    }

    public function failed(?Throwable $e): void
    {
        $recipient = BroadcastRecipient::query()->find($this->recipientId);
        if ($recipient === null || $recipient->status !== BroadcastRecipient::STATUS_QUEUED) {
            return;
        }

        $recipient->update([
            'status' => BroadcastRecipient::STATUS_FAILED,
            'error' => mb_substr((string) $e?->getMessage(), 0, 250),
        ]);

        if (! $recipient->is_test) {
            $recipient->broadcast?->increment('failed_count');
        }
    }
}
