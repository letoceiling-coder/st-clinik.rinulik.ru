<?php

namespace Tests\Feature;

use App\Models\AssistantConversation;
use App\Models\City;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\User;
use App\Repositories\Contracts\CatalogRepository;
use App\Services\Assistant\AssistantToolExecutor;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AssistantCreateLeadToolTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_create_lead_tool_requires_consent(): void
    {
        $city = app(CatalogRepository::class)->defaultCity();
        $conversation = $this->conversation($city);

        $json = app(AssistantToolExecutor::class)->run('create_lead', [
            'name' => 'Иван',
            'phone' => '+79001234567',
            'consent' => false,
        ], $city, $conversation);

        $payload = json_decode($json, true);
        $this->assertSame('consent_required', $payload['error'] ?? null);
    }

    public function test_create_lead_tool_creates_lead_when_consent_given(): void
    {
        $city = app(CatalogRepository::class)->defaultCity();
        $clinic = $this->clinic($city);
        $conversation = $this->conversation($city);

        $json = app(AssistantToolExecutor::class)->run('create_lead', [
            'name' => 'Иван Тест',
            'phone' => '+79007654321',
            'clinic' => $clinic->slug,
            'consent' => true,
        ], $city, $conversation);

        $payload = json_decode($json, true);
        $this->assertTrue($payload['ok'] ?? false);
        $this->assertDatabaseHas('leads', [
            'phone' => '+79007654321',
            'source' => 'assistant',
            'clinic_id' => $clinic->id,
        ]);
    }

    private function conversation(City $city): AssistantConversation
    {
        return AssistantConversation::query()->create([
            'public_id' => (string) Str::uuid(),
            'city_id' => $city->id,
            'channel' => 'web',
            'last_message_at' => now(),
        ]);
    }

    private function clinic(City $city): Clinic
    {
        $owner = User::factory()->create();
        $owner->forceFill(['role' => 'clinic_owner', 'status' => 'active'])->save();
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Org tool']);

        return Clinic::create([
            'organization_id' => $org->id,
            'city_id' => $city->id,
            'name' => 'Tool clinic',
            'slug' => 'tool-clinic-'.uniqid(),
            'address' => 'Addr',
            'status' => 'published',
            'accepts_assistant_leads' => true,
        ]);
    }
}
