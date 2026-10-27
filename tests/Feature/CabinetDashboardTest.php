<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\City;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\OrganizationStaff;
use App\Models\User;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CabinetDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_dashboard_includes_appointment_and_promotion_kpis(): void
    {
        $owner = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Dash org']);
        OrganizationStaff::query()->create([
            'organization_id' => $org->id,
            'user_id' => $owner->id,
            'role' => OrganizationStaff::ROLE_OWNER,
            'invited_at' => now(),
        ]);
        $clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => (int) City::query()->value('id'),
            'name' => 'Dash clinic',
            'slug' => 'dash-clinic-'.uniqid(),
            'address' => 'Addr',
            'status' => 'published',
        ]);

        $starts = now()->addHour();
        Appointment::factory()->create([
            'clinic_id' => $clinic->id,
            'status' => 'confirmed',
            'starts_at' => $starts,
            'ends_at' => $starts->copy()->addHour(),
        ]);

        $this->actingAs($owner)
            ->get('/clinic-cabinet?branch='.$clinic->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Cabinet/Dashboard')
                ->where('kpi.appointments_upcoming', 1)
                ->has('kpi.appointments_today'));
    }
}
