<?php

namespace Tests\Feature;

use App\Models\AssistantConversation;
use App\Models\AssistantMessage;
use App\Services\Assistant\AssistantSettings;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
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

        $conversation = AssistantConversation::query()->create([
            'public_id' => (string) Str::uuid(),
            'channel' => 'web',
            'ip_hash' => hash('sha256', (string) request()->ip()),
            'last_message_at' => now(),
        ]);

        AssistantMessage::query()->create([
            'assistant_conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => 'первый вопрос',
        ]);

        $response = $this->postJson('/api/v1/assistant/message', [
            'message' => 'ещё один',
            'conversation_id' => $conversation->public_id,
        ])
            ->assertOk()
            ->assertJsonFragment(['mock' => true]);

        $this->assertStringContainsString('лимит', mb_strtolower((string) $response->json('reply')));
    }
}
