<?php

namespace App\Jobs;

use App\Services\Broadcasts\BroadcastService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\WithoutOverlapping;

class SendBroadcastBatch implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 300;

    public function __construct(public int $broadcastId)
    {
        $this->afterCommit();
    }

    /** @return list<object> */
    public function middleware(): array
    {
        return [(new WithoutOverlapping("broadcast-{$this->broadcastId}"))->dontRelease()->expireAfter($this->timeout)];
    }

    public function handle(BroadcastService $broadcasts): void
    {
        $next = $broadcasts->processBatch($this->broadcastId);
        if ($next !== null) {
            self::dispatch($this->broadcastId)->delay($next);
        }
    }
}
