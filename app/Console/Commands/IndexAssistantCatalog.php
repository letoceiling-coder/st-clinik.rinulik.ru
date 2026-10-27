<?php

namespace App\Console\Commands;

use App\Services\Assistant\AssistantCatalogIndexService;
use Illuminate\Console\Command;

class IndexAssistantCatalog extends Command
{
    protected $signature = 'assistant:reindex-catalog {--sync : Без очереди, сразу эмбеддинги}';

    protected $description = 'Rebuild assistant knowledge chunks from published clinics and doctors';

    public function handle(AssistantCatalogIndexService $indexer): int
    {
        $count = $indexer->reindexAll();
        $this->info("Indexed {$count} catalog chunks.");

        return self::SUCCESS;
    }
}
