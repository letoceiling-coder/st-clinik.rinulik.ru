<?php

namespace App\Console\Commands;

use App\Jobs\IndexAssistantKbEntryJob;
use App\Models\AssistantKbEntry;
use Illuminate\Console\Command;

class ReindexAssistantKb extends Command
{
    protected $signature = 'assistant:reindex-kb {--sync : Index synchronously in this process}';

    protected $description = 'Rebuild OpenRouter embeddings for assistant FAQ entries';

    public function handle(): int
    {
        $query = AssistantKbEntry::query()->where('is_active', true);
        $count = 0;

        $query->orderBy('id')->each(function (AssistantKbEntry $entry) use (&$count): void {
            if ($this->option('sync')) {
                IndexAssistantKbEntryJob::dispatchSync($entry->id);
            } else {
                IndexAssistantKbEntryJob::dispatch($entry->id);
            }
            $count++;
        });

        $this->info("Queued or indexed {$count} FAQ entries.");

        return self::SUCCESS;
    }
}
