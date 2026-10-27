<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\OrganizationStaff;
use App\Models\User;
use App\Services\Notifications\NotificationPreferenceService;
use App\Services\Organization\ClinicStaffNotifier;
use App\Support\ClinicNotificationEvents;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClinicStaffNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_staff_with_disabled_lead_notifications_does_not_receive_in_app(): void
    {
        $owner = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $manager = User::factory()->create(['role' => 'user', 'status' => 'active']);
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Notify org']);
        OrganizationStaff::query()->create([
            'organization_id' => $org->id,
            'user_id' => $manager->id,
            'role' => OrganizationStaff::ROLE_MANAGER,
            'invited_at' => now(),
        ]);

        app(NotificationPreferenceService::class)->update($manager, ClinicNotificationEvents::LEAD_NEW, []);

        app(ClinicStaffNotifier::class)->notify(
            $org,
            ClinicNotificationEvents::LEAD_NEW,
            'lead_new',
            'Тест',
            'Тело',
            '/clinic-cabinet/leads',
        );

        $this->assertDatabaseMissing('user_notifications', ['user_id' => $manager->id, 'type' => 'lead_new']);
        $this->assertDatabaseHas('user_notifications', ['user_id' => $owner->id, 'type' => 'lead_new']);
    }

    public function test_cabinet_settings_page_loads_for_clinic_owner(): void
    {
        $owner = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Settings org']);
        OrganizationStaff::query()->create([
            'organization_id' => $org->id,
            'user_id' => $owner->id,
            'role' => OrganizationStaff::ROLE_OWNER,
            'invited_at' => now(),
        ]);
        $clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => (int) City::query()->where('name', 'Краснодар')->value('id'),
            'name' => 'Settings clinic',
            'slug' => 'settings-clinic',
            'address' => 'Addr',
            'status' => 'published',
            'accepts_assistant_leads' => true,
        ]);

        $this->actingAs($owner)
            ->get('/clinic-cabinet/settings?branch='.$clinic->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Cabinet/Settings'));
    }
}
