<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Clinic;
use App\Models\Lead;
use App\Models\Organization;
use App\Models\OrganizationStaff;
use App\Models\User;
use App\Notifications\ClinicStaffAlertNotification;
use App\Services\Leads\LeadResponseStats;
use App\Services\LeadService;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CabinetLeadWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private User $manager;

    private Clinic $clinic;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);

        $this->owner = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $this->manager = User::factory()->create(['role' => 'user', 'status' => 'active']);
        $org = Organization::create(['owner_id' => $this->owner->id, 'name' => 'Lead org']);
        foreach ([[$this->owner, OrganizationStaff::ROLE_OWNER], [$this->manager, OrganizationStaff::ROLE_MANAGER]] as [$user, $role]) {
            OrganizationStaff::query()->create(['organization_id' => $org->id, 'user_id' => $user->id, 'role' => $role, 'invited_at' => now()]);
        }
        $this->clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => (int) City::query()->where('name', 'Краснодар')->value('id'),
            'name' => 'Lead clinic',
            'slug' => 'lead-clinic',
            'address' => 'Addr',
            'phone' => '+7 (900) 000-00-00',
            'status' => 'published',
        ]);
    }

    public function test_new_site_lead_notifies_all_staff_in_cabinet_and_external_channels(): void
    {
        Notification::fake();

        $this->lead();

        $this->assertDatabaseHas('user_notifications', ['user_id' => $this->owner->id, 'type' => 'lead_new']);
        $this->assertDatabaseHas('user_notifications', ['user_id' => $this->manager->id, 'type' => 'lead_new']);
        Notification::assertSentTo($this->manager, ClinicStaffAlertNotification::class);
    }

    public function test_first_action_records_response_time_and_assignment(): void
    {
        $lead = $this->lead();
        $lead->forceFill(['created_at' => now()->subMinutes(12)])->save();

        $this->actingAs($this->owner)->put("/clinic-cabinet/leads/{$lead->id}?branch={$this->clinic->id}", [
            'status' => 'no_answer',
            'assigned_to' => $this->manager->id,
            'callback_at' => now()->addHour()->format('Y-m-d\TH:i'),
        ])->assertSessionHasNoErrors();

        $lead->refresh();
        $this->assertNotNull($lead->first_response_at);
        $this->assertSame($this->manager->id, $lead->assigned_to);
        $this->assertNotNull($lead->callback_at);
        $this->assertSame(12, app(LeadResponseStats::class)->forClinic($this->clinic->id)['median_minutes']);
    }

    public function test_cancel_keeps_reason_and_clears_callback_and_foreign_assignee_is_rejected(): void
    {
        $lead = $this->lead();
        $stranger = User::factory()->create();

        $this->actingAs($this->owner)->put("/clinic-cabinet/leads/{$lead->id}?branch={$this->clinic->id}", [
            'status' => 'new',
            'assigned_to' => $stranger->id,
        ])->assertSessionHasErrors('assigned_to');

        $this->actingAs($this->owner)->put("/clinic-cabinet/leads/{$lead->id}?branch={$this->clinic->id}", [
            'status' => 'cancelled',
            'cancel_reason' => 'price',
            'callback_at' => now()->addDay()->format('Y-m-d\TH:i'),
        ])->assertSessionHasNoErrors();

        $lead->refresh();
        $this->assertSame('price', $lead->cancel_reason);
        $this->assertNull($lead->callback_at);
    }

    public function test_leads_page_shows_tabs_counts_and_response_stats(): void
    {
        $this->lead();
        $done = $this->lead('+79001112244');
        $done->update(['status' => 'completed', 'first_response_at' => now()]);

        $this->actingAs($this->owner)->get("/clinic-cabinet/leads?branch={$this->clinic->id}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Cabinet/Leads')
                ->where('tab', 'active')
                ->where('tabs.active', 1)
                ->where('tabs.closed', 1)
                ->has('leads.data', 1)
                ->where('response.waiting', 1)
                ->has('staff', 2));
    }

    private function lead(string $phone = '+79001112233'): Lead
    {
        return app(LeadService::class)->create(
            app(LeadService::class)->validate(['clinic' => $this->clinic->slug, 'name' => 'Пациент', 'phone' => $phone, 'consent' => true]),
            null,
            'clinic_page',
        );
    }
}
