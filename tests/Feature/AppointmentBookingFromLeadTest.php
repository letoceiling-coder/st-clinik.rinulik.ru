<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Lead;
use App\Models\Organization;
use App\Models\User;
use App\Services\AppointmentBookingService;
use App\Services\LeadService;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AppointmentBookingFromLeadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_lead_with_preferred_date_does_not_create_appointment(): void
    {
        $clinic = $this->publishedClinic();

        app(LeadService::class)->create([
            'clinic' => $clinic->slug,
            'name' => 'Иван Петров',
            'phone' => '+79001234567',
            'preferred_date' => now()->addDay()->toDateString(),
            'preferred_time' => 'утро',
            'consent' => true,
        ], null);

        $lead = Lead::query()->where('clinic_id', $clinic->id)->firstOrFail();

        $this->assertSame('new', $lead->status);
        $this->assertDatabaseMissing('appointments', ['lead_id' => $lead->id]);
    }

    public function test_patient_cancelling_lead_cancels_linked_appointment(): void
    {
        $clinic = $this->publishedClinic();
        $patient = User::factory()->create();
        $patient->forceFill(['role' => 'user', 'status' => 'active'])->save();

        $lead = app(LeadService::class)->create([
            'clinic' => $clinic->slug,
            'name' => 'Иван Петров',
            'phone' => '+79001234567',
            'preferred_date' => now()->addDay()->toDateString(),
            'consent' => true,
        ], $patient);

        $appointment = app(AppointmentBookingService::class)->createFromLead($lead);
        $this->assertNotNull($appointment);

        $this->actingAs($patient)->post(route('account.leads.cancel', $lead))->assertRedirect();

        $this->assertSame('cancelled', $lead->fresh()->status);
        $this->assertSame('cancelled', $appointment->fresh()->status);
    }

    public function test_updating_appointment_rejects_doctor_from_another_clinic(): void
    {
        $clinic = $this->publishedClinic();
        $foreignDoctor = Doctor::create([
            'clinic_id' => $this->publishedClinic()->id,
            'name' => 'Чужой Врач',
            'slug' => 'foreign-doctor-'.uniqid(),
        ]);
        $appointment = app(AppointmentBookingService::class)->createManual($clinic, [
            'patient_name' => 'Иван Петров',
            'patient_phone' => '+79001234567',
            'starts_at' => now()->addDay()->setTime(11, 0)->toDateTimeString(),
        ]);

        $this->expectException(ValidationException::class);

        app(AppointmentBookingService::class)->update($appointment, ['doctor_id' => $foreignDoctor->id]);
    }

    private function publishedClinic(): Clinic
    {
        $owner = User::factory()->create();
        $owner->forceFill(['role' => 'clinic_owner', 'status' => 'active'])->save();
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Test Org']);
        $city = City::query()->firstOrFail();

        return Clinic::create([
            'organization_id' => $org->id,
            'city_id' => $city->id,
            'name' => 'Test Clinic',
            'slug' => 'test-clinic-'.uniqid(),
            'address' => 'Test address',
            'status' => 'published',
        ]);
    }
}
