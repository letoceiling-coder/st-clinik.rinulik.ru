<?php

namespace App\Console\Commands;

use App\Services\Broadcasts\BroadcastService;
use Illuminate\Console\Command;

class DispatchScheduledBroadcasts extends Command
{
    protected $signature = 'broadcasts:dispatch-scheduled';

    protected $description = 'Запускает платформенные рассылки, у которых наступило scheduled_at';

    public function handle(BroadcastService $broadcasts): int
    {
        $count = $broadcasts->dispatchDueScheduled();
        $this->info("Started {$count} scheduled broadcast(s).");

        return self::SUCCESS;
    }
}
