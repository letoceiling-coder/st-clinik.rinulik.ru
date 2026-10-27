<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\City;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\DoctorSchedule;
use App\Models\Organization;
use App\Models\ScheduleException;
use App\Models\Service;
use App\Models\User;
use App\Services\AppointmentBookingService;
use App\Services\ReviewService;
use App\Services\SlotAvailabilityService;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class OnlineBookingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_slots_follow_doctor_schedule_exceptions_and_duration(): void
    {
        [$clinic, $doctor] = $this->clinicWithDoctor();
        $date = now()->next('Monday')->startOfDay();

        DoctorSchedule::factory()->create([
            'doctor_id' => $doctor->id,
            'clinic_id' => $clinic->id,
            'weekday' => (int) $date->format('N'),
            'start_time' => '10:00',
            'end_time' => '13:00',
            'break_start' => '11:00',
            'break_end' => '11:30',
            'slot_minutes' => 30,
        ]);

        $slots = app(SlotAvailabilityService::class);
        $times = collect($slots->slotsForDay($clinic, $doctor->id, null, $date))->pluck('time')->all();

        $this->assertSame(['10:00', '10:30', '11:30', '12:00', '12:30'], $times);

        ScheduleException::factory()->create([
            'doctor_id' => $doctor->id,
            'clinic_id' => $clinic->id,
            'date_from' => $date->toDateString(),
            'date_to' => $date->toDateString(),
            'kind' => 'day_off',
        ]);
        $slots->invalidate($clinic);

        $this->assertSame([], $slots->slotsForDay($clinic, $doctor->id, null, $date));
    }

    public function test_guest_books_slot_and_manages_it_by_signed_link(): void
    {
        [$clinic, $doctor] = $this->clinicWithDoctor();
        $this->weekTemplate($doctor, $clinic);
        $starts = now()->next('Tuesday')->setTime(10, 0)->seconds(0);

        $this->post(route('booking.store', $clinic->slug), [
            'doctor_id' => $doctor->id,
            'starts_at' => $starts->format('Y-m-d H:i'),
            'patient_name' => 'Анна Иванова',
            'patient_phone' => '+79001112233',
            'consent' => true,
        ])->assertRedirect();

        $appointment = Appointment::query()->where('clinic_id', $clinic->id)->firstOrFail();
        $this->assertSame('new', $appointment->status);
        $this->assertSame('online', $appointment->source);
        $this->assertSame($doctor->id, $appointment->doctor_id);
        $this->assertNotNull($appointment->consent_at);
        $this->assertTrue($appointment->history()->where('to_status', 'new')->exists());

        $this->get(URL::signedRoute('appointments.show', $appointment))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Booking/Show')->where('appointment.status', 'new'));

        $this->get(route('appointments.show', $appointment))->assertForbidden();

        $this->post(URL::signedRoute('appointments.cancel', $appointment), ['reason' => 'Передумал'])
            ->assertRedirect();
        $this->assertSame('cancelled', $appointment->fresh()->status);
    }

    public function test_second_booking_on_same_slot_is_rejected(): void
    {
        [$clinic, $doctor] = $this->clinicWithDoctor();
        $this->weekTemplate($doctor, $clinic);
        $starts = now()->next('Wednesday')->setTime(11, 0)->seconds(0);
        $booking = app(AppointmentBookingService::class);

        $first = $booking->book($clinic, [
            'doctor_id' => $doctor->id,
            'starts_at' => $starts->toDateTimeString(),
            'patient_name' => 'Первый',
            'patient_phone' => '+79001112233',
        ]);
        $this->assertSame('new', $first->status);

        try {
            $booking->book($clinic, [
                'doctor_id' => $doctor->id,
                'starts_at' => $starts->toDateTimeString(),
                'patient_name' => 'Второй',
                'patient_phone' => '+79002223344',
            ]);
            $this->fail('Вторая запись на тот же слот должна быть отклонена.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('starts_at', $e->errors());
        }

        $this->assertSame(1, Appointment::query()->where('doctor_id', $doctor->id)->active()->count());
    }

    public function test_patient_sees_appointment_and_requests_reschedule(): void
    {
        [$clinic, $doctor] = $this->clinicWithDoctor();
        $this->weekTemplate($doctor, $clinic);
        $patient = User::factory()->create();
        $patient->forceFill(['role' => 'user', 'status' => 'active'])->save();
        $starts = now()->next('Thursday')->setTime(10, 0)->seconds(0);
        $next = $starts->copy()->addMinutes(30);

        $appointment = app(AppointmentBookingService::class)->book($clinic, [
            'doctor_id' => $doctor->id,
            'starts_at' => $starts->format('Y-m-d H:i'),
            'patient_name' => 'Пациент',
            'patient_phone' => '+79003334455',
        ], $patient);

        $this->actingAs($patient)->get(route('account.appointments'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Account/Appointments')->has('appointments.data', 1));

        $this->actingAs($patient)->post(route('account.appointments.reschedule', $appointment), [
            'starts_at' => $next->format('Y-m-d H:i'),
        ])->assertRedirect();

        $appointment->refresh();
        $this->assertSame('pending', $appointment->status);
        $this->assertSame($next->format('Y-m-d H:i'), $appointment->requested_starts_at->format('Y-m-d H:i'));

        $owner = $clinic->organization->owner;
        $this->actingAs($owner)->post(route('cabinet.calendar.reschedule.approve', $appointment).'?branch='.$clinic->id)
            ->assertRedirect();

        $appointment->refresh();
        $this->assertSame('rescheduled', $appointment->status);
        $this->assertSame($next->format('Y-m-d H:i'), $appointment->starts_at->format('Y-m-d H:i'));
    }

    public function test_clinic_confirms_and_completed_visit_marks_review_verified(): void
    {
        [$clinic, $doctor] = $this->clinicWithDoctor();
        $this->weekTemplate($doctor, $clinic);
        $patient = User::factory()->create();
        $patient->forceFill(['role' => 'user', 'status' => 'active'])->save();
        $starts = now()->next('Friday')->setTime(10, 0)->seconds(0);

        $appointment = app(AppointmentBookingService::class)->book($clinic, [
            'doctor_id' => $doctor->id,
            'starts_at' => $starts->format('Y-m-d H:i'),
            'patient_name' => 'Пациент',
            'patient_phone' => '+79005556677',
        ], $patient);

        $owner = $clinic->organization->owner;
        $this->actingAs($owner)->post(route('cabinet.calendar.status', $appointment).'?branch='.$clinic->id, [
            'status' => 'confirmed',
        ])->assertRedirect();
        $this->assertSame('confirmed', $appointment->fresh()->status);

        $this->travelTo($starts->copy()->addHour());
        $this->actingAs($owner)->post(route('cabinet.calendar.status', $appointment).'?branch='.$clinic->id, [
            'status' => 'completed',
        ])->assertRedirect();

        $review = app(ReviewService::class)->create($clinic, $patient, [
            'rating' => 5,
            'body' => str_repeat('Отличный приём, всё подробно объяснили и помогли. ', 3),
            'visit_date' => $starts->toDateString(),
            'rules' => true,
            'consent' => true,
        ]);

        $this->assertTrue($review->is_verified_visit);
    }

    public function test_slots_api_is_available(): void
    {
        [$clinic, $doctor] = $this->clinicWithDoctor();
        $this->weekTemplate($doctor, $clinic);
        $date = now()->next('Monday')->toDateString();

        $this->getJson(route('api.v1.clinics.slots', ['slug' => $clinic->slug, 'date' => $date, 'doctor' => $doctor->id]))
            ->assertOk()
            ->assertJsonPath('data.date', $date)
            ->assertJsonStructure(['data' => ['date', 'duration', 'slots']]);

        $this->getJson(route('api.v1.clinics.slot-days', ['slug' => $clinic->slug, 'from' => $date, 'days' => 7, 'doctor' => $doctor->id]))
            ->assertOk()
            ->assertJsonCount(7, 'data');
    }

    public function test_booking_page_and_doctor_schedule_page_load(): void
    {
        [$clinic, $doctor] = $this->clinicWithDoctor();
        $owner = $clinic->organization->owner;

        $this->get(route('booking.create', $clinic->slug))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Booking/Create')->where('clinic.slug', $clinic->slug));

        $this->actingAs($owner)->get('/clinic-cabinet/schedule/doctors?branch='.$clinic->id)
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Cabinet/DoctorSchedules')->has('doctors'));

        $this->actingAs($owner)->put('/clinic-cabinet/schedule/doctors/'.$doctor->id.'?branch='.$clinic->id, [
            'days' => [
                1 => ['enabled' => true, 'start_time' => '09:00', 'end_time' => '15:00', 'slot_minutes' => 30],
            ],
        ])->assertRedirect();

        $this->assertDatabaseHas('doctor_schedules', [
            'doctor_id' => $doctor->id,
            'clinic_id' => $clinic->id,
            'weekday' => 1,
            'start_time' => '09:00',
        ]);
    }

    public function test_service_duration_from_clinic_overrides_catalog(): void
    {
        [$clinic, $doctor] = $this->clinicWithDoctor();
        $service = Service::query()->firstOrFail();
        $clinic->clinicServices()->create([
            'service_id' => $service->id,
            'price_from' => 2000,
            'duration_min' => 45,
        ]);

        $this->assertSame(45, app(SlotAvailabilityService::class)->durationFor($clinic, $service->id));
    }

    /** @return array{0: Clinic, 1: Doctor} */
    private function clinicWithDoctor(): array
    {
        $owner = User::factory()->create();
        $owner->forceFill(['role' => 'clinic_owner', 'status' => 'active'])->save();
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Org']);
        $city = City::query()->firstOrFail();
        $clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => $city->id,
            'name' => 'Клиника записи',
            'slug' => 'booking-clinic-'.uniqid(),
            'address' => 'Тестовая 1',
            'status' => 'published',
            'is_24_7' => false,
            'schedule' => [
                'mon' => ['open' => '09:00', 'close' => '18:00'],
                'tue' => ['open' => '09:00', 'close' => '18:00'],
                'wed' => ['open' => '09:00', 'close' => '18:00'],
                'thu' => ['open' => '09:00', 'close' => '18:00'],
                'fri' => ['open' => '09:00', 'close' => '18:00'],
            ],
        ]);
        $doctor = Doctor::create([
            'clinic_id' => $clinic->id,
            'name' => 'Доктор Тестов',
            'slug' => 'doc-'.uniqid(),
            'status' => 'published',
        ]);

        return [$clinic, $doctor];
    }

    private function weekTemplate(Doctor $doctor, Clinic $clinic): void
    {
        foreach (range(1, 5) as $weekday) {
            DoctorSchedule::factory()->withoutBreak()->create([
                'doctor_id' => $doctor->id,
                'clinic_id' => $clinic->id,
                'weekday' => $weekday,
                'start_time' => '09:00',
                'end_time' => '18:00',
                'slot_minutes' => 30,
            ]);
        }
    }
}
