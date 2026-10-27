<?php

namespace Tests\Feature;

use App\Models\AssistantKbEntry;
use App\Repositories\Contracts\CatalogRepository;
use App\Services\Assistant\AssistantKbEmbeddingService;
use App\Services\Assistant\AssistantKbSearchService;
use App\Services\Assistant\AssistantSettings;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AssistantKbEmbeddingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_kb_embedding_service_stores_vector(): void
    {
        config([
            'services.openrouter.api_key' => 'test-key',
            'services.openrouter.base_url' => 'https://openrouter.test/api/v1',
        ]);

        Http::fake([
            'https://openrouter.test/api/v1/embeddings' => Http::response([
                'data' => [['embedding' => [0.1, 0.9, 0.0]]],
            ]),
        ]);

        app(AssistantSettings::class)->save(['mock_mode' => false]);

        $entry = AssistantKbEntry::query()->firstOrFail();
        $this->assertTrue(app(AssistantKbEmbeddingService::class)->index($entry));
        $entry->refresh();
        $this->assertCount(3, $entry->embedding ?? []);
        $this->assertEqualsWithDelta(0.1, $entry->embedding[0], 0.0001);
        $this->assertEqualsWithDelta(0.9, $entry->embedding[1], 0.0001);
    }

    public function test_semantic_search_prefers_embedding_match(): void
    {
        config([
            'services.openrouter.api_key' => 'test-key',
            'services.openrouter.base_url' => 'https://openrouter.test/api/v1',
        ]);

        Http::fake([
            'https://openrouter.test/api/v1/embeddings' => Http::response([
                'data' => [['embedding' => [1.0, 0.0, 0.0]]],
            ]),
        ]);

        app(AssistantSettings::class)->save(['mock_mode' => false]);

        $entry = AssistantKbEntry::query()->firstOrFail();
        $entry->update([
            'question' => 'Уникальный семантический вопрос XYZ',
            'answer' => 'Уникальный семантический ответ.',
            'embedding' => [1.0, 0.0, 0.0],
            'embedded_at' => now(),
        ]);

        $city = app(CatalogRepository::class)->defaultCity();
        $results = app(AssistantKbSearchService::class)->search($city, 'семантика XYZ', 3);

        $this->assertNotEmpty($results);
        $this->assertStringContainsString('семантический', $results[0]['answer']);
    }
}
