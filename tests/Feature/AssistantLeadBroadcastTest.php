<?php

namespace Tests\Feature;

use App\Models\AssistantConversation;
use App\Models\City;
use App\Models\Clinic;
use App\Models\LeadDispatch;
use App\Models\Organization;
use App\Models\Tariff;
use App\Models\User;
use App\Repositories\Contracts\CatalogRepository;
use App\Services\Assistant\AssistantSettings;
use App\Services\Monetization\ClinicSubscriptionService;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AssistantLeadBroadcastTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
        app(AssistantSettings::class)->save(['assistant_lead_broadcast_count' => 2]);
    }

    public function test_broadcast_lead_creates_dispatches_for_multiple_clinics(): void
    {
        $city = app(CatalogRepository::class)->defaultCity();
        $this->createPublishedClinic($city);
        $this->createPublishedClinic($city);
        $this->createPublishedClinic($city);

        $conversation = AssistantConversation::query()->create([
            'public_id' => (string) Str::uuid(),
            'city_id' => $city->id,
            'channel' => 'web',
            'ip_hash' => hash('sha256', '127.0.0.1'),
            'last_message_at' => now(),
        ]);

        $this->postJson('/api/v1/assistant/lead', [
            'conversation_id' => $conversation->public_id,
            'broadcast' => true,
            'name' => 'Мария Тест',
            'phone' => '+79001112233',
            'consent' => true,
        ])->assertOk()->assertJsonPath('ok', true);

        $this->assertSame(2, LeadDispatch::query()->count());
    }

    private function createPublishedClinic(City $city): Clinic
    {
        $owner = User::factory()->create();
        $owner->forceFill(['role' => 'clinic_owner', 'status' => 'active'])->save();
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Org Broadcast '.uniqid()]);

        $clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => $city->id,
            'name' => 'Клиника '.uniqid(),
            'slug' => 'bc-'.uniqid(),
            'address' => 'Тестовая 1',
            'status' => 'published',
            'accepts_assistant_leads' => true,
            'rating' => 4.5,
            'reviews_count' => 10,
        ]);

        // Рассылку лидов ассистента получают только клиники с тарифом, где включена эта возможность.
        $tariff = Tariff::query()->firstOrCreate(
            ['slug' => 'assistant-leads-test'],
            ['name' => 'С лидами ассистента', 'price' => 100000, 'duration_days' => 30, 'features' => [Tariff::FEATURE_ASSISTANT_LEADS], 'is_active' => true],
        );
        app(ClinicSubscriptionService::class)->activate($clinic, $tariff, null, now(), now()->addDays(30));

        return $clinic;
    }
}
