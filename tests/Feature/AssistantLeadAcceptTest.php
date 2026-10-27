<?php

namespace Tests\Feature;

use App\Models\AssistantConversation;
use App\Models\City;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\Tariff;
use App\Models\User;
use App\Services\Assistant\AssistantLeadService;
use App\Services\Monetization\ClinicSubscriptionService;
use Database\Seeders\FoundationSeeder;
use Database\Seeders\TariffSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class AssistantLeadAcceptTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
        $this->seed(TariffSeeder::class);
    }

    public function test_first_clinic_accept_expires_other_dispatches(): void
    {
        $city = City::query()->firstOrFail();
        $clinicA = $this->clinic($city, 'accept-a');
        $clinicB = $this->clinic($city, 'accept-b');
        $ownerA = $clinicA->organization->owner;
        $ownerB = $clinicB->organization->owner;

        $conversation = AssistantConversation::query()->create([
            'public_id' => (string) Str::uuid(),
            'city_id' => $city->id,
            'channel' => 'web',
            'last_message_at' => now(),
        ]);

        $result = app(AssistantLeadService::class)->create($conversation, [
            'broadcast' => true,
            'name' => 'Пациент',
            'phone' => '+79005556677',
            'consent' => true,
        ], null);

        $lead = $result['lead'];
        $this->assertTrue($lead->assistant_broadcast);

        $this->actingAs($ownerA)
            ->post("/clinic-cabinet/leads/{$lead->id}/accept?branch={$clinicA->id}")
            ->assertRedirect();

        $this->assertDatabaseHas('lead_dispatches', [
            'lead_id' => $lead->id,
            'clinic_id' => $clinicA->id,
            'status' => 'accepted',
        ]);
        $this->assertDatabaseHas('lead_dispatches', [
            'lead_id' => $lead->id,
            'clinic_id' => $clinicB->id,
            'status' => 'expired',
        ]);

        $this->actingAs($ownerB)
            ->post("/clinic-cabinet/leads/{$lead->id}/accept?branch={$clinicB->id}")
            ->assertSessionHasErrors();
    }

    private function clinic(City $city, string $slug): Clinic
    {
        $owner = User::factory()->create();
        $owner->forceFill(['role' => 'clinic_owner', 'status' => 'active'])->save();
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Org '.$slug]);

        $clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => $city->id,
            'name' => 'Clinic '.$slug,
            'slug' => $slug,
            'address' => 'Addr',
            'status' => 'published',
            'accepts_assistant_leads' => true,
            'rating' => 4,
            'reviews_count' => 1,
        ]);

        // Лиды ассистента получают только клиники на тарифе с этой возможностью.
        $tariff = Tariff::query()->get()->first(fn (Tariff $t) => $t->hasFeature(Tariff::FEATURE_ASSISTANT_LEADS));
        app(ClinicSubscriptionService::class)->activate($clinic, $tariff, null, now(), now()->addDays(30));

        return $clinic;
    }
}
