<?php

namespace Tests\Feature;

use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssistantStreamTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_assistant_stream_returns_sse_done_event(): void
    {
        $response = $this->post('/api/v1/assistant/message/stream', ['message' => 'как записаться']);

        $response->assertOk();
        $body = $response->streamedContent();
        $this->assertStringContainsString('event: done', $body);
        $this->assertStringContainsString('event: chunk', $body);
        $this->assertStringContainsString('conversation_id', $body);
    }
}
