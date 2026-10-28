<?php

namespace Tests\Feature;

use App\Models\AssistantConversation;
use App\Models\AssistantMessage;
use App\Models\City;
use App\Models\Clinic;
use App\Models\ClinicService;
use App\Models\Organization;
use App\Models\Service;
use App\Models\User;
use App\Repositories\Contracts\CatalogRepository;
use App\Services\Assistant\AssistantChatService;
use App\Services\Assistant\AssistantSettings;
use App\Services\Assistant\AssistantToolExecutor;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class AssistantRealModeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_search_clinics_matches_service_by_user_words_and_returns_its_price(): void
    {
        $city = $this->city();
        $service = Service::query()->where('slug', 'implant-standart')->firstOrFail();
        $withService = $this->createPublishedClinic($city, 'Имплант Центр');
        $this->createPublishedClinic($city, 'Просто Клиника');
        ClinicService::query()->create(['clinic_id' => $withService->id, 'service_id' => $service->id, 'price_from' => 31000]);

        $executor = app(AssistantToolExecutor::class);
        $payload = json_decode($executor->run('search_clinics', ['query' => 'установка импланта'], $city), true);

        $this->assertSame('service', $payload['matched_by']);
        $this->assertSame($service->id, $payload['service']['id']);
        $this->assertSame([$withService->slug], array_column($payload['clinics'], 'slug'));
        $this->assertStringContainsString('31', $payload['clinics'][0]['service_price']);
        $this->assertSame([['slug' => $withService->slug, 'name' => $withService->name]], $executor->consumeShownClinics());
    }

    public function test_general_request_matches_direction_and_returns_price_of_that_direction(): void
    {
        $city = $this->city();
        $implant = Service::query()->where('slug', 'implant-standart')->firstOrFail();
        $cheapOther = Service::query()->where('specialty_id', '!=', $implant->specialty_id)->firstOrFail();
        $clinic = $this->createPublishedClinic($city, 'Имплант Плюс');
        ClinicService::query()->create(['clinic_id' => $clinic->id, 'service_id' => $implant->id, 'price_from' => 38000]);
        ClinicService::query()->create(['clinic_id' => $clinic->id, 'service_id' => $cheapOther->id, 'price_from' => 500]);
        $this->createPublishedClinic($city, 'Без Имплантов');

        $payload = json_decode(app(AssistantToolExecutor::class)->run('search_clinics', ['query' => 'имплантация зуба недорого'], $city), true);

        $this->assertSame('specialty', $payload['matched_by']);
        $this->assertSame([$clinic->slug], array_column($payload['clinics'], 'slug'));
        $this->assertStringContainsString('38', $payload['clinics'][0]['service_price']);
        $this->assertArrayNotHasKey('cheapest_any_service', $payload['clinics'][0]);
    }

    public function test_search_clinics_falls_back_to_best_clinics_of_the_city(): void
    {
        $city = $this->city();
        $clinic = $this->createPublishedClinic($city, 'Лучшая Клиника');

        $payload = json_decode(app(AssistantToolExecutor::class)->run('search_clinics', ['query' => 'зzzzнеизвестное'], $city), true);

        $this->assertSame('city_best', $payload['matched_by']);
        $this->assertContains($clinic->slug, array_column($payload['clinics'], 'slug'));
        $this->assertNotEmpty($payload['note']);
    }

    public function test_foreign_conversation_id_starts_a_new_dialog(): void
    {
        $foreign = AssistantConversation::query()->create([
            'public_id' => (string) Str::uuid(),
            'city_id' => $this->city()->id,
            'channel' => 'web',
            'ip_hash' => hash('sha256', '10.0.0.1'),
            'last_message_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/assistant/message', [
            'message' => 'имплантация',
            'conversation_id' => $foreign->public_id,
        ])->assertOk();

        $this->assertNotSame($foreign->public_id, $response->json('conversation_id'));
        $this->assertSame(0, $foreign->messages()->count());
    }

    public function test_own_conversation_continues_within_the_session(): void
    {
        $first = $this->postJson('/api/v1/assistant/message', ['message' => 'имплантация'])->assertOk();
        $id = $first->json('conversation_id');

        $this->postJson('/api/v1/assistant/message', ['message' => 'а детский?', 'conversation_id' => $id])
            ->assertOk()
            ->assertJson(['conversation_id' => $id]);

        $this->assertSame(4, AssistantConversation::query()->where('public_id', $id)->firstOrFail()->messages()->count());
    }

    public function test_model_sees_city_and_previously_shown_clinics(): void
    {
        $city = $this->city();
        $conversation = AssistantConversation::query()->create([
            'public_id' => (string) Str::uuid(),
            'city_id' => $city->id,
            'channel' => 'web',
            'last_message_at' => now(),
        ]);
        AssistantMessage::query()->create([
            'assistant_conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => 'Подобрал две клиники',
            'meta' => ['engine' => 'openrouter', 'clinics' => [['slug' => 'dent-one', 'name' => 'Дент Один'], ['slug' => 'dent-two', 'name' => 'Дент Два']]],
        ]);

        $system = app(AssistantChatService::class)->previewMessages($conversation, $city, 'запишите во вторую')[0]['content'];

        $this->assertStringContainsString('Город пользователя: '.$city->name, $system);
        $this->assertStringContainsString('2. Дент Два (slug: dent-two)', $system);
    }

    public function test_real_mode_reply_is_cleaned_and_remembers_shown_clinics(): void
    {
        $city = $this->city();
        $clinic = $this->createPublishedClinic($city, 'Клиника Улыбка');
        config(['services.openrouter.api_key' => 'test-key', 'services.openrouter.base_url' => 'https://openrouter.test/api/v1']);
        app(AssistantSettings::class)->save(['mock_mode' => false, 'stream_responses' => false]);

        Http::fakeSequence('https://openrouter.test/api/v1/chat/completions')
            ->push(['choices' => [['message' => ['role' => 'assistant', 'content' => null, 'tool_calls' => [[
                'id' => 'call_1',
                'type' => 'function',
                'function' => ['name' => 'search_clinics', 'arguments' => json_encode(['query' => 'Улыбка'])],
            ]]]]]])
            ->push(['choices' => [['message' => ['role' => 'assistant', 'content' => "**Клиника Улыбка** — рейтинг 4,5.\n- рядом с метро"]]]]);

        $response = $this->postJson('/api/v1/assistant/message', ['message' => 'посоветуйте клинику'])
            ->assertOk()
            ->assertJson(['mock' => false]);

        $this->assertSame("Клиника Улыбка — рейтинг 4,5.\n— рядом с метро", $response->json('reply'));
        $this->assertStringStartsWith('Записаться в «', $response->json('suggestions.0'));
        $stored = AssistantMessage::query()->where('role', 'assistant')->latest('id')->firstOrFail();
        $this->assertSame($clinic->slug, $stored->meta['clinics'][0]['slug']);
    }

    private function city(): City
    {
        return app(CatalogRepository::class)->defaultCity();
    }

    private function createPublishedClinic(City $city, string $name): Clinic
    {
        $owner = User::factory()->create();
        $owner->forceFill(['role' => 'clinic_owner', 'status' => 'active'])->save();
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Org '.uniqid()]);

        $clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => $city->id,
            'name' => $name,
            'slug' => Str::slug($name).'-'.uniqid(),
            'address' => 'Тестовая 1',
            'status' => 'published',
            'accepts_assistant_leads' => true,
            'rating' => 4.5,
            'reviews_count' => 10,
        ]);
        $clinic->touch();

        return $clinic;
    }
}
