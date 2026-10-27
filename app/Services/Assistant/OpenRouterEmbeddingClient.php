<?php

namespace App\Services\Assistant;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class OpenRouterEmbeddingClient
{
    public function __construct(private readonly OpenRouterBudgetGuard $budget) {}

    /** @return list<float> */
    public function embed(string $text): array
    {
        $this->budget->assertWithinBudget();

        $token = config('services.openrouter.api_key');
        if (! filled($token)) {
            throw new RuntimeException('OpenRouter API key is not configured.');
        }

        $base = rtrim((string) config('services.openrouter.base_url', 'https://openrouter.ai/api/v1'), '/');
        $model = (string) config('services.openrouter.embedding_model', 'openai/text-embedding-3-small');

        $http = Http::withToken((string) $token)
            ->timeout(45)
            ->acceptJson()
            ->withHeaders([
                'HTTP-Referer' => url('/'),
                'X-Title' => config('app.name'),
            ]);

        if (filled(config('services.openrouter.proxy'))) {
            $http = $http->withOptions(['proxy' => (string) config('services.openrouter.proxy')]);
        }

        $response = $http->post("{$base}/embeddings", [
            'model' => $model,
            'input' => mb_substr(trim($text), 0, 8000),
        ]);

        if (! $response->successful()) {
            Log::warning('openrouter.embedding_failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new RuntimeException('OpenRouter embedding request failed.');
        }

        $this->budget->record($response->json('usage'), 'embedding');

        $vector = $response->json('data.0.embedding');
        if (! is_array($vector) || $vector === []) {
            throw new RuntimeException('OpenRouter returned empty embedding.');
        }

        return array_map(static fn ($v) => (float) $v, $vector);
    }
}
