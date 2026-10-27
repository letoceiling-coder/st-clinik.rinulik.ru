<?php

namespace Tests\Feature;

use App\Models\AssistantMessage;
use App\Services\Assistant\AssistantSettings;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AssistantMockTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_assistant_message_returns_mock_reply(): void
    {
        $this->postJson('/api/v1/assistant/message', ['message' => 'как записаться онлайн'])
            ->assertOk()
            ->assertJsonStructure(['reply', 'suggestions', 'links', 'conversation_id', 'mock'])
            ->assertJson(['mock' => true]);

        $this->assertSame(2, AssistantMessage::query()->count());
        $this->assertDatabaseHas('assistant_messages', [
            'role' => 'user',
            'content' => 'как записаться онлайн',
        ]);
    }

    public function test_assistant_uses_openrouter_when_mock_disabled(): void
    {
        config([
            'services.openrouter.api_key' => 'test-key',
            'services.openrouter.base_url' => 'https://openrouter.test/api/v1',
        ]);

        Http::fake([
            'https://openrouter.test/api/v1/chat/completions' => Http::response([
                'choices' => [
                    ['message' => ['content' => 'Ответ модели']],
                ],
            ]),
        ]);

        app(AssistantSettings::class)->save(['mock_mode' => false]);

        $this->postJson('/api/v1/assistant/message', ['message' => 'привет'])
            ->assertOk()
            ->assertJson([
                'reply' => 'Ответ модели',
                'mock' => false,
            ]);

        Http::assertSent(fn ($request) => str_contains($request->url(), 'chat/completions'));

        $this->assertDatabaseHas('assistant_messages', [
            'role' => 'assistant',
            'content' => 'Ответ модели',
        ]);
    }

    public function test_assistant_disabled_returns_not_found(): void
    {
        app(AssistantSettings::class)->save(['enabled' => false]);

        $this->postJson('/api/v1/assistant/message', ['message' => 'тест'])
            ->assertNotFound();
    }
}
