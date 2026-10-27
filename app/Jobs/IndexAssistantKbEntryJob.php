<?php

namespace App\Jobs;

use App\Models\AssistantKbEntry;
use App\Services\Assistant\AssistantKbEmbeddingService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;

class IndexAssistantKbEntryJob implements ShouldQueue
{
    use Dispatchable, Queueable;

    public function __construct(public int $entryId) {}

    public function handle(AssistantKbEmbeddingService $embeddings): void
    {
        $entry = AssistantKbEntry::query()->find($this->entryId);
        if ($entry === null || ! $entry->is_active) {
            return;
        }

        $embeddings->index($entry);
    }
}
