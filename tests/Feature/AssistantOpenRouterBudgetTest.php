<?php

namespace Tests\Feature;

use App\Models\AssistantOpenrouterUsage;
use App\Services\Assistant\AssistantBudgetExceeded;
use App\Services\Assistant\AssistantSettings;
use App\Services\Assistant\OpenRouterBudgetGuard;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssistantOpenRouterBudgetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_daily_budget_blocks_new_requests(): void
    {
        config(['services.openrouter.daily_budget_usd' => 0.5]);
        AssistantOpenrouterUsage::query()->create([
            'operation' => 'chat',
            'cost_usd' => 0.5,
            'prompt_tokens' => 100,
            'completion_tokens' => 50,
        ]);

        $this->expectException(AssistantBudgetExceeded::class);
        app(OpenRouterBudgetGuard::class)->assertWithinBudget();
    }

    public function test_assistant_message_returns_limit_reply_when_budget_exhausted(): void
    {
        config(['services.openrouter.daily_budget_usd' => 0.01]);
        AssistantOpenrouterUsage::query()->create([
            'operation' => 'chat',
            'cost_usd' => 0.02,
            'prompt_tokens' => 10,
            'completion_tokens' => 10,
        ]);

        app(AssistantSettings::class)->save(['mock_mode' => false]);
        config(['services.openrouter.api_key' => 'test-key']);

        $response = $this->postJson('/api/v1/assistant/message', ['message' => 'привет'])
            ->assertOk()
            ->assertJsonPath('mock', true);

        $this->assertIsString($response->json('reply'));
        $this->assertStringContainsString('бюджет', mb_strtolower((string) $response->json('reply')));
    }
}
