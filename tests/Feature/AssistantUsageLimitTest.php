<?php

namespace Tests\Feature;

use App\Services\Assistant\AssistantSettings;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssistantUsageLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_conversation_message_limit_returns_friendly_reply(): void
    {
        app(AssistantSettings::class)->save(['max_messages_per_conversation' => 1]);

        $conversationId = $this->postJson('/api/v1/assistant/message', ['message' => 'первый вопрос'])
            ->assertOk()
            ->json('conversation_id');

        $response = $this->postJson('/api/v1/assistant/message', [
            'message' => 'ещё один',
            'conversation_id' => $conversationId,
        ])
            ->assertOk()
            ->assertJsonFragment(['mock' => true]);

        $this->assertStringContainsString('лимит', mb_strtolower((string) $response->json('reply')));
    }
}
