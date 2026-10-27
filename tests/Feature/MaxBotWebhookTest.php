<?php

namespace Tests\Feature;

use App\Models\Appointment;
use App\Models\City;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\SocialAccount;
use App\Models\User;
use App\Support\NotificationEvents;
use Carbon\Carbon;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MaxBotWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_bot_started_sends_welcome_message(): void
    {
        Config::set('services.max_bot.token', 'token');
        Config::set('services.max_bot.webhook_secret', 'wh-secret');
        Config::set('services.max_bot.mini_app_url', 'https://st-clinik.rinulik.ru/max');

        Http::fake([
            'platform-api2.max.ru/*' => Http::response(['ok' => true], 200),
            'platform-api.max.ru/*' => Http::response(['ok' => true], 200),
        ]);

        $this->post('/webhooks/max', [
            'update_type' => 'bot_started',
            'user' => ['user_id' => 9001, 'name' => 'Test User'],
        ], ['X-Max-Bot-Api-Secret' => 'wh-secret'])->assertOk();

        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/messages')
                && str_contains($request->body(), 'menu:appointments')
                && str_contains($request->body(), 'open_app');
        });

        $this->assertDatabaseHas('max_users', [
            'max_user_id' => '9001',
            'is_blocked' => false,
        ]);
    }

    public function test_message_callback_sends_appointments_hint_for_unlinked_user(): void
    {
        Config::set('services.max_bot.token', 'token');
        Config::set('services.max_bot.webhook_secret', 'wh-secret');

        Http::fake([
            'platform-api2.max.ru/*' => Http::response(['ok' => true], 200),
        ]);

        $this->post('/webhooks/max', [
            'update_type' => 'message_callback',
            'callback' => [
                'payload' => 'menu:appointments',
                'user' => ['user_id' => 9002],
            ],
        ], ['X-Max-Bot-Api-Secret' => 'wh-secret'])->assertOk();

        $this->assertDatabaseHas('max_users', ['max_user_id' => '9002']);
        Http::assertSent(fn ($request) => str_contains($request->url(), '/messages'));
    }

    public function test_message_callback_toggles_max_notification_preference(): void
    {
        Config::set('services.max_bot.token', 'token');
        Config::set('services.max_bot.webhook_secret', 'wh-secret');

        Http::fake([
            'platform-api2.max.ru/*' => Http::response(['ok' => true], 200),
        ]);

        $user = User::factory()->create();
        SocialAccount::create([
            'user_id' => $user->id,
            'provider' => 'max',
            'provider_user_id' => '9004',
            'linked_at' => now(),
        ]);

        $this->post('/webhooks/max', [
            'update_type' => 'message_callback',
            'callback' => [
                'payload' => 'notify:toggle:'.NotificationEvents::APPOINTMENT_REMINDER_24H,
                'user' => ['user_id' => 9004],
            ],
        ], ['X-Max-Bot-Api-Secret' => 'wh-secret'])->assertOk();

        $this->assertDatabaseHas('notification_preferences', [
            'user_id' => $user->id,
            'event_key' => NotificationEvents::APPOINTMENT_REMINDER_24H,
        ]);

        Http::assertSent(fn ($request) => str_contains($request->body(), 'notify:toggle:'));
    }

    public function test_message_callback_lists_appointments_for_linked_user(): void
    {
        Config::set('services.max_bot.token', 'token');
        Config::set('services.max_bot.webhook_secret', 'wh-secret');
        Config::set('services.max_bot.mini_app_url', 'https://st-clinik.rinulik.ru/max');

        Http::fake([
            'platform-api2.max.ru/*' => Http::response(['ok' => true], 200),
        ]);

        $user = User::factory()->create();
        SocialAccount::create([
            'user_id' => $user->id,
            'provider' => 'max',
            'provider_user_id' => '9010',
            'linked_at' => now(),
        ]);

        $this->post('/webhooks/max', [
            'update_type' => 'message_callback',
            'callback' => [
                'payload' => 'menu:appointments',
                'user' => ['user_id' => 9010],
            ],
        ], ['X-Max-Bot-Api-Secret' => 'wh-secret'])->assertOk();

        Http::assertSent(fn ($request) => str_contains($request->url(), '/messages'));
    }

    public function test_clinic_owner_can_confirm_appointment_from_callback(): void
    {
        Config::set('services.max_bot.token', 'token');
        Config::set('services.max_bot.webhook_secret', 'wh-secret');

        Http::fake(['platform-api2.max.ru/*' => Http::response(['ok' => true], 200)]);

        [$owner, $clinic] = $this->ownerAndClinic();
        SocialAccount::create([
            'user_id' => $owner->id,
            'provider' => 'max',
            'provider_user_id' => '88001',
            'linked_at' => now(),
        ]);

        $appointment = Appointment::create([
            'clinic_id' => $clinic->id,
            'user_id' => User::factory()->create()->id,
            'status' => 'new',
            'source' => 'online',
            'patient_name' => 'Иван',
            'patient_phone' => '+79001234567',
            'starts_at' => Carbon::now()->addDay()->setTime(10, 0),
            'ends_at' => Carbon::now()->addDay()->setTime(10, 30),
        ]);

        $this->post('/webhooks/max', [
            'update_type' => 'message_callback',
            'callback' => [
                'payload' => 'appt:confirm:'.$appointment->id,
                'user' => ['user_id' => 88001],
            ],
        ], ['X-Max-Bot-Api-Secret' => 'wh-secret'])->assertOk();

        $this->assertSame('confirmed', $appointment->fresh()->status);
    }

    public function test_patient_can_cancel_own_appointment_from_callback(): void
    {
        Config::set('services.max_bot.token', 'token');
        Config::set('services.max_bot.webhook_secret', 'wh-secret');

        Http::fake(['platform-api2.max.ru/*' => Http::response(['ok' => true], 200)]);

        [, $clinic] = $this->ownerAndClinic();
        $patient = User::factory()->create();
        SocialAccount::create([
            'user_id' => $patient->id,
            'provider' => 'max',
            'provider_user_id' => '88002',
            'linked_at' => now(),
        ]);

        $appointment = Appointment::create([
            'clinic_id' => $clinic->id,
            'user_id' => $patient->id,
            'status' => 'confirmed',
            'source' => 'online',
            'patient_name' => 'Мария',
            'patient_phone' => '+79007654321',
            'starts_at' => Carbon::now()->addDays(2)->setTime(11, 0),
            'ends_at' => Carbon::now()->addDays(2)->setTime(11, 30),
        ]);

        $this->post('/webhooks/max', [
            'update_type' => 'message_callback',
            'callback' => [
                'payload' => 'appt:patient_cancel:'.$appointment->id,
                'user' => ['user_id' => 88002],
            ],
        ], ['X-Max-Bot-Api-Secret' => 'wh-secret'])->assertOk();

        $this->assertSame('cancelled', $appointment->fresh()->status);
    }

    /** @return array{0: User, 1: Clinic} */
    private function ownerAndClinic(): array
    {
        $owner = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Max appt org']);
        $city = City::query()->firstOrFail();
        $clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => $city->id,
            'name' => 'Клиника MAX',
            'slug' => 'max-appt-'.uniqid(),
            'address' => 'Тест',
            'status' => 'published',
            'is_24_7' => false,
        ]);

        return [$owner, $clinic];
    }
}
