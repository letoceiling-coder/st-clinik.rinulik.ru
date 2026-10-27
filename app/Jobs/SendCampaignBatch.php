<?php

namespace App\Jobs;

use App\Models\Campaign;
use App\Services\Offers\CampaignService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\Middleware\WithoutOverlapping;

/** Порция автоматической рассылки кампании; сама планирует продолжение (рабочие часы, дневные лимиты). */
class SendCampaignBatch implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 300;

    public function __construct(public int $campaignId)
    {
        $this->afterCommit();
    }

    /** @return list<object> */
    public function middleware(): array
    {
        return [(new WithoutOverlapping("campaign-{$this->campaignId}"))->dontRelease()->expireAfter($this->timeout)];
    }

    public function handle(CampaignService $campaigns): void
    {
        $campaign = Campaign::query()->find($this->campaignId);
        if ($campaign === null) {
            return;
        }

        $next = $campaigns->sendBatch($campaign);
        if ($next !== null) {
            self::dispatch($this->campaignId)->delay($next);
        }
    }
}
