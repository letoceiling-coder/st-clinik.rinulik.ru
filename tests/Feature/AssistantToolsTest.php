<?php

namespace Tests\Feature;

use App\Models\AssistantConversation;
use App\Models\Lead;
use App\Services\Assistant\AssistantSettings;
use App\Services\Assistant\AssistantToolExecutor;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class AssistantToolsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_search_clinics_tool_returns_published_clinic(): void
    {
        $city = $this->defaultCity();
        $clinic = $this->createPublishedClinic($city);

        $executor = app(AssistantToolExecutor::class);
        $json = $executor->run('search_clinics', ['query' => $clinic->name, 'limit' => 3], $city);
        $payload = json_decode($json, true);

        $this->assertIsArray($payload);
        $this->assertNotEmpty($payload['clinics'] ?? []);
        $this->assertNotEmpty($executor->consumeLinks());
    }

    public function test_assistant_lead_endpoint_creates_lead(): void
    {
        $city = $this->city();
        $clinic = $this->createPublishedClinic($city);
        $conversation = AssistantConversation::query()->create([
            'public_id' => (string) Str::uuid(),
            'city_id' => $city->id,
            'channel' => 'web',
            'ip_hash' => hash('sha256', '127.0.0.1'),
            'last_message_at' => now(),
        ]);

        $this->postJson('/api/v1/assistant/lead', [
            'conversation_id' => $conversation->public_id,
            'clinic' => $clinic->slug,
            'name' => 'Иван Тестов',
            'phone' => '+79001234567',
            'consent' => true,
            'comment' => 'Через ассистента',
        ])->assertOk()->assertJson(['ok' => true]);

        $this->assertDatabaseHas('leads', [
            'source' => 'assistant',
            'assistant_conversation_id' => $conversation->id,
            'phone' => '+79001234567',
        ]);
    }

    public function test_openrouter_passes_tools_when_mock_disabled(): void
    {
        config([
            'services.openrouter.api_key' => 'test-key',
            'services.openrouter.base_url' => 'https://openrouter.test/api/v1',
        ]);

        Http::fake([
            'https://openrouter.test/api/v1/chat/completions' => Http::sequence()
                ->push([
                    'choices' => [[
                        'message' => [
                            'role' => 'assistant',
                            'content' => null,
                            'tool_calls' => [[
                                'id' => 'call_1',
                                'type' => 'function',
                                'function' => [
                                    'name' => 'search_clinics',
                                    'arguments' => json_encode(['query' => 'имплантация', 'limit' => 2]),
                                ],
                            ]],
                        ],
                        'finish_reason' => 'tool_calls',
                    ]],
                ])
                ->push([
                    'choices' => [[
                        'message' => [
                            'role' => 'assistant',
                            'content' => 'Вот клиники по вашему запросу.',
                        ],
                        'finish_reason' => 'stop',
                    ]],
                ]),
        ]);

        app(AssistantSettings::class)->save(['mock_mode' => false]);

        $this->postJson('/api/v1/assistant/message', ['message' => 'где имплантация'])
            ->assertOk()
            ->assertJson([
                'reply' => 'Вот клиники по вашему запросу.',
                'mock' => false,
            ]);

        Http::assertSentCount(2);
    }

    public function test_search_knowledge_returns_seeded_faq(): void
    {
        $city = $this->defaultCity();
        $executor = app(AssistantToolExecutor::class);
        $json = $executor->run('search_knowledge', ['query' => 'онлайн запись'], $city);
        $payload = json_decode($json, true);

        $this->assertNotEmpty($payload['entries'] ?? []);
    }

    public function test_get_slots_returns_times_for_scheduled_clinic(): void
    {
        $city = $this->defaultCity();
        $clinic = $this->createPublishedClinic($city);
        $date = now()->next('monday')->toDateString();

        $executor = app(AssistantToolExecutor::class);
        $json = $executor->run('get_slots', ['slug' => $clinic->slug, 'date' => $date], $city);
        $payload = json_decode($json, true);

        $this->assertSame($clinic->slug, $payload['clinic'] ?? null);
        $this->assertIsArray($payload['slots'] ?? null);
    }

    public function test_assistant_lead_dedupes_phone_within_24_hours(): void
    {
        $city = $this->defaultCity();
        $clinic = $this->createPublishedClinic($city);
        $conversation = AssistantConversation::query()->create([
            'public_id' => (string) Str::uuid(),
            'city_id' => $city->id,
            'channel' => 'web',
            'ip_hash' => hash('sha256', (string) request()->ip()),
            'last_message_at' => now(),
        ]);

        Lead::query()->create([
            'clinic_id' => $clinic->id,
            'name' => 'Первый',
            'phone' => '+79009998877',
            'status' => 'new',
            'source' => 'clinic_page',
            'consent_at' => now(),
        ]);

        $this->postJson('/api/v1/assistant/lead', [
            'conversation_id' => $conversation->public_id,
            'clinic' => $clinic->slug,
            'name' => 'Второй',
            'phone' => '+79009998877',
            'consent' => true,
        ])->assertUnprocessable();
    }
}
