<?php

namespace App\Services\Assistant;

use App\Models\AssistantKbEntry;
use App\Support\PgVector;
use Illuminate\Support\Facades\DB;
use Throwable;

class AssistantKbEmbeddingService
{
    public function __construct(
        private readonly OpenRouterEmbeddingClient $client,
        private readonly AssistantSettings $settings,
    ) {}

    public function index(AssistantKbEntry $entry): bool
    {
        if ($this->settings->get()['mock_mode'] || ! filled(config('services.openrouter.api_key'))) {
            return false;
        }

        try {
            $text = trim($entry->question."\n\n".$entry->answer);
            $vector = $this->client->embed($text);
            $entry->forceFill([
                'embedding' => $vector,
                'embedded_at' => now(),
            ])->saveQuietly();

            if (PgVector::isAvailable()) {
                DB::statement(
                    'UPDATE assistant_kb_entries SET embedding_vector = ?::vector WHERE id = ?',
                    [PgVector::literal($vector), $entry->id],
                );
            }

            return true;
        } catch (Throwable $e) {
            report($e);

            return false;
        }
    }
}
