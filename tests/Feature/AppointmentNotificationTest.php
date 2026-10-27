<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\City;
use App\Models\Clinic;
use App\Models\NotificationDelivery;
use App\Models\NotificationPreference;
use App\Models\NotificationSubscription;
use App\Models\Organization;
use App\Models\User;
use App\Notifications\AppointmentStatusNotification;
use App\Services\AppointmentBookingService;
use App\Services\Max\MaxBotClient;
use App\Support\NotificationEvents;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification as NotificationFacade;
use Tests\TestCase;

class AppointmentNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_confirmed_appointment_creates_in_app_and_queues_email(): void
    {
        Mail::fake();
        NotificationFacade::fake();

        $user = User::factory()->create(['notify_email' => true, 'email_verified_at' => now()]);
        $appointment = $this->appointmentFor($user);

        app(AppointmentBookingService::class)->changeStatus($appointment, 'confirmed', $user, 'clinic');

        $this->assertDatabaseHas('user_notifications', [
            'user_id' => $user->id,
            'title' => NotificationEvents::label(NotificationEvents::APPOINTMENT_CONFIRMED),
        ]);

        NotificationFacade::assertSentTo($user, AppointmentStatusNotification::class);
    }

    public function test_email_channel_delivery_is_logged_when_preference_includes_email(): void
    {
        Mail::fake();

        $user = User::factory()->create(['notify_email' => true, 'email_verified_at' => now()]);
        NotificationPreference::query()->create([
            'user_id' => $user->id,
            'event_key' => NotificationEvents::APPOINTMENT_CONFIRMED,
            'channels' => ['in_app', 'email'],
        ]);

        $appointment = $this->appointmentFor($user);
        app(AppointmentBookingService::class)->changeStatus($appointment, 'confirmed', $user, 'clinic');

        $this->assertDatabaseHas('notification_deliveries', [
            'user_id' => $user->id,
            'channel' => NotificationSubscription::CHANNEL_EMAIL,
            'event_key' => NotificationEvents::APPOINTMENT_CONFIRMED,
            'status' => NotificationDelivery::STATUS_SENT,
        ]);
    }

    public function test_max_channel_delivery_is_logged_when_subscription_active(): void
    {
        Mail::fake();
        $this->mock(MaxBotClient::class, function ($mock): void {
            $mock->shouldReceive('sendToUser')->once()->andReturn(true);
        });

        $user = User::factory()->create(['notify_email' => false]);
        NotificationSubscription::query()->create([
            'user_id' => $user->id,
            'channel' => NotificationSubscription::CHANNEL_MAX,
            'external_id' => '4242',
            'status' => NotificationSubscription::STATUS_ACTIVE,
            'allowed_at' => now(),
        ]);
        NotificationPreference::query()->create([
            'user_id' => $user->id,
            'event_key' => NotificationEvents::APPOINTMENT_CONFIRMED,
            'channels' => ['in_app', 'max'],
        ]);

        $appointment = $this->appointmentFor($user);
        app(AppointmentBookingService::class)->changeStatus($appointment, 'confirmed', $user, 'clinic');

        $this->assertDatabaseHas('notification_deliveries', [
            'user_id' => $user->id,
            'channel' => NotificationSubscription::CHANNEL_MAX,
            'status' => NotificationDelivery::STATUS_SENT,
        ]);
    }

    private function appointmentFor(User $user): Appointment
    {
        $owner = User::factory()->create();
        $owner->forceFill(['role' => 'clinic_owner', 'status' => 'active'])->save();
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Org notify']);
        $city = City::query()->firstOrFail();
        $clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => $city->id,
            'name' => 'Клиника уведомлений',
            'slug' => 'notify-clinic-'.uniqid(),
            'address' => 'Тест 1',
            'status' => 'published',
            'is_24_7' => false,
        ]);

        return Appointment::query()->create([
            'user_id' => $user->id,
            'clinic_id' => $clinic->id,
            'patient_name' => $user->name,
            'patient_phone' => '+79001234567',
            'status' => 'new',
            'source' => 'online',
            'starts_at' => now()->addDay(),
            'ends_at' => now()->addDay()->addHour(),
        ]);
    }
}
