<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\User;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CabinetAppointmentCalendarTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_calendar_page_loads_for_clinic_owner(): void
    {
        [$owner, $clinic] = $this->clinicOwner();

        $this->actingAs($owner)->get('/clinic-cabinet/calendar?branch='.$clinic->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Cabinet/Calendar')
                ->has('grid', fn ($grid) => $grid
                    ->where('step_minutes', 30)
                    ->has('start_minutes')
                    ->has('end_minutes'))
                ->where('view', 'week'));
    }

    public function test_calendar_accepts_day_view_and_doctor_filter(): void
    {
        [$owner, $clinic] = $this->clinicOwner();
        $day = now()->addDay()->toDateString();

        $this->actingAs($owner)->get('/clinic-cabinet/calendar?branch='.$clinic->id.'&view=day&day='.$day.'&anchor='.$day.'&doctor_id=999')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('view', 'day')
                ->where('focus_day', $day)
                ->where('doctor_id', 999));

        $this->actingAs($owner)->get('/clinic-cabinet/calendar?branch='.$clinic->id.'&view=month&anchor='.$day)
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('view', 'month')->has('period_label'));
    }

    public function test_owner_can_create_manual_appointment(): void
    {
        [$owner, $clinic] = $this->clinicOwner();

        $startsAt = now()->addDay()->setTime(11, 0)->format('Y-m-d\TH:i');

        $this->actingAs($owner)->post('/clinic-cabinet/calendar?branch='.$clinic->id, [
            'patient_name' => 'Мария Смирнова',
            'patient_phone' => '+79007654321',
            'starts_at' => $startsAt,
            'duration_minutes' => 30,
            'status' => 'confirmed',
        ])->assertRedirect();

        $this->assertDatabaseHas('appointments', [
            'clinic_id' => $clinic->id,
            'patient_name' => 'Мария Смирнова',
            'source' => 'manual',
        ]);
    }

    /** @return array{0: User, 1: Clinic} */
    private function clinicOwner(): array
    {
        $owner = User::factory()->create();
        $owner->forceFill(['role' => 'clinic_owner', 'status' => 'active'])->save();
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Test Org']);
        $city = City::query()->firstOrFail();
        $clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => $city->id,
            'name' => 'Test Clinic',
            'slug' => 'test-clinic-'.uniqid(),
            'address' => 'Test address',
            'status' => 'published',
        ]);

        return [$owner, $clinic];
    }
}
