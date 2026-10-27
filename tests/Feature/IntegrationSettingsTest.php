<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\IntegrationCheck;
use App\Models\IntegrationSetting;
use App\Models\NotificationSubscription;
use App\Models\User;
use App\Services\IntegrationSettings;
use App\Services\Notifications\NotificationSubscriptionService;
use App\Services\Notifications\WebPushSender;
use App\Services\Notifications\WebPushSendResult;
use App\Services\Payments\TBankAcquiringService;
use App\Support\Vapid;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class IntegrationSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_integrations_page_requires_superadmin_permission(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['role' => 'moderator', 'status' => 'active'])->save();

        $this->actingAs($user)->get('/admin/integrations')->assertForbidden();
    }

    public function test_superadmin_can_save_tbank_settings(): void
    {
        $admin = $this->superadmin();

        $this->actingAs($admin)->put('/admin/integrations/tbank', [
            'terminal_key' => 'TBankTest',
            'password' => 'test_terminal_password',
            'success_url' => 'https://example.test/clinic-cabinet/promotions/return',
        ])->assertRedirect();

        $settings = app(IntegrationSettings::class);
        $this->assertSame('TBankTest', $settings->get('tbank', 'terminal_key'));
        $this->assertSame('test_terminal_password', $settings->get('tbank', 'password'));
        $this->assertTrue(app(TBankAcquiringService::class)->configured());
    }

    public function test_secret_fields_are_encrypted_in_database(): void
    {
        $admin = $this->superadmin();

        $this->actingAs($admin)->put('/admin/integrations/yandex_maps', [
            'api_key' => 'maps-secret-key',
        ]);

        $raw = IntegrationSetting::query()->where('group', 'yandex_maps')->where('key', 'api_key')->value('value');
        $this->assertNotSame('maps-secret-key', $raw);
        $this->assertSame('maps-secret-key', Crypt::decryptString((string) $raw));
    }

    public function test_empty_secret_keeps_saved_value_and_update_is_audited(): void
    {
        $admin = $this->superadmin();
        $this->actingAs($admin)->put('/admin/integrations/tbank', ['terminal_key' => '111', 'password' => 'keep-me']);

        $this->actingAs($admin)->put('/admin/integrations/tbank', ['terminal_key' => '222', 'password' => ''])
            ->assertSessionHas('success');

        $settings = app(IntegrationSettings::class);
        $this->assertSame('222', $settings->get('tbank', 'terminal_key'));
        $this->assertSame('keep-me', $settings->get('tbank', 'password'));

        $log = AuditLog::query()->where('action', 'integration.updated')->latest('id')->first();
        $this->assertSame('tbank', $log->meta['group']);
        $this->assertContains('TerminalKey (идентификатор терминала)', $log->meta['fields']);
        $this->assertNotContains('Пароль терминала', $log->meta['fields']);
    }

    public function test_tbank_check_is_stored_without_leaking_secret(): void
    {
        Http::fake(['securepay.tinkoff.ru/*' => Http::response([
            'Success' => false,
            'ErrorCode' => '7',
            'Message' => 'Платеж не найден',
        ])]);
        $admin = $this->superadmin();
        $this->actingAs($admin)->put('/admin/integrations/tbank', ['terminal_key' => 'TBankTest', 'password' => 'live_super_secret']);

        $this->actingAs($admin)->post('/admin/integrations/tbank/check')->assertSessionHas('success');

        $check = IntegrationCheck::query()->where('group', 'tbank')->firstOrFail();
        $this->assertTrue($check->ok);
        $this->assertSame($admin->id, $check->checked_by);
        $this->assertStringNotContainsString('live_super_secret', json_encode([$check->message, $check->details]));
    }

    public function test_failed_check_reports_rejected_credentials(): void
    {
        Http::fake(['securepay.tinkoff.ru/*' => Http::response([
            'Success' => false,
            'ErrorCode' => '501',
            'Message' => 'Неверный Token',
        ])]);
        $admin = $this->superadmin();
        $this->actingAs($admin)->put('/admin/integrations/tbank', ['terminal_key' => '1', 'password' => 'wrong']);

        $this->actingAs($admin)->post('/admin/integrations/tbank/check')->assertSessionHas('error');

        $this->assertFalse(IntegrationCheck::query()->where('group', 'tbank')->value('ok'));
    }

    public function test_changing_settings_resets_last_check(): void
    {
        Http::fake(['securepay.tinkoff.ru/*' => Http::response(['Success' => false, 'ErrorCode' => '7', 'Message' => 'не найден'])]);
        $admin = $this->superadmin();
        $this->actingAs($admin)->put('/admin/integrations/tbank', ['terminal_key' => '1', 'password' => 'a']);
        $this->actingAs($admin)->post('/admin/integrations/tbank/check');
        $this->assertDatabaseCount('integration_checks', 1);

        $this->actingAs($admin)->put('/admin/integrations/tbank', ['terminal_key' => '2', 'password' => '']);

        $this->assertDatabaseCount('integration_checks', 0);
    }

    public function test_parser_check_counts_online_html_workers(): void
    {
        Http::fake([
            'parser.test/health' => Http::response(['status' => 'healthy']),
            'parser.test/api/v1/workers' => Http::response(['workers' => [
                ['connected' => true, 'capabilities' => ['task:page.html']],
                ['connected' => false, 'capabilities' => ['task:page.html']],
            ]]),
        ]);
        $admin = $this->superadmin();
        $this->actingAs($admin)->put('/admin/integrations/parser', ['base_url' => 'https://parser.test', 'api_key' => 'parser-secret']);

        $this->actingAs($admin)->post('/admin/integrations/parser/check')->assertSessionHas('success');

        $details = IntegrationCheck::query()->where('group', 'parser')->firstOrFail()->details;
        $this->assertSame('1 из 2', $details[0]['value']);
        $this->assertStringNotContainsString('parser-secret', json_encode($details));
    }

    public function test_max_bot_check_fills_bot_username(): void
    {
        Http::fake([
            'platform-api2.max.ru/me' => Http::response(['name' => 'СТ Клиник', 'username' => 'st_clinik_bot']),
            'platform-api2.max.ru/subscriptions*' => Http::response(['success' => true]),
            'platform-api.max.ru/*' => Http::response(['name' => 'СТ Клиник', 'username' => 'st_clinik_bot']),
        ]);
        $admin = $this->superadmin();
        $this->actingAs($admin)->put('/admin/integrations/max_bot', ['bot_token' => 'max-token']);

        $this->actingAs($admin)->post('/admin/integrations/max_bot/check')->assertSessionHas('success');

        $this->assertSame('st_clinik_bot', app(IntegrationSettings::class)->get('max_bot', 'bot_username'));
    }

    public function test_check_endpoint_requires_superadmin(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['role' => 'moderator', 'status' => 'active'])->save();

        $this->actingAs($user)->post('/admin/integrations/tbank/check')->assertForbidden();
    }

    public function test_web_push_test_requires_browser_subscription(): void
    {
        if (@openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]) === false) {
            $this->markTestSkipped('OpenSSL EC key generation is unavailable in this environment.');
        }

        $admin = $this->superadmin();
        $this->actingAs($admin)->post('/admin/integrations/web_push/generate')->assertSessionHas('success');

        $this->actingAs($admin)->post('/admin/integrations/web_push/test')
            ->assertRedirect()
            ->assertSessionHas('error');
    }

    public function test_web_push_test_sends_to_current_admin_subscription(): void
    {
        if (@openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]) === false) {
            $this->markTestSkipped('OpenSSL EC key generation is unavailable in this environment.');
        }

        $admin = $this->superadmin();
        $this->actingAs($admin)->post('/admin/integrations/web_push/generate');

        app(NotificationSubscriptionService::class)->activateWebPush($admin, [
            'endpoint' => 'https://push.example.test/subscription',
            'keys' => ['auth' => 'auth', 'p256dh' => 'p256dh'],
        ]);

        $subscription = NotificationSubscription::query()
            ->where('user_id', $admin->id)
            ->where('channel', NotificationSubscription::CHANNEL_WEB_PUSH)
            ->firstOrFail();

        $this->mock(WebPushSender::class, function ($mock) use ($admin, $subscription): void {
            $mock->shouldReceive('configured')->andReturn(true);
            $mock->shouldReceive('activeSubscriptionsFor')->with($admin->id)->andReturn([$subscription]);
            $mock->shouldReceive('send')->once()->andReturn(WebPushSendResult::ok());
        });

        $this->actingAs($admin)->post('/admin/integrations/web_push/test')
            ->assertRedirect()
            ->assertSessionHas('success');
    }

    public function test_web_push_generate_creates_valid_vapid_keys(): void
    {
        if (@openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]) === false) {
            $this->markTestSkipped('OpenSSL EC key generation is unavailable in this environment.');
        }

        $this->actingAs($this->superadmin())->post('/admin/integrations/web_push/generate')->assertSessionHas('success');

        $settings = app(IntegrationSettings::class);
        $public = (string) $settings->get('web_push', 'public_key');
        $this->assertTrue(Vapid::isValidPublicKey($public));
        $this->assertSame($public, Vapid::publicKeyFor((string) $settings->get('web_push', 'private_key')));
    }

    private function superadmin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['role' => 'superadmin', 'status' => 'active'])->save();

        return $admin;
    }
}
