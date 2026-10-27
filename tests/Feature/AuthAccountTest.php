<?php

namespace Tests\Feature;

use App\Models\SocialAccount;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\VerifyEmailNotification;
use App\Services\Auth\MaxLoginService;
use App\Services\Auth\SocialAuthService;
use App\Services\Auth\SocialProfile;
use App\Services\Auth\VkOAuthClient;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\TestCase;

class AuthAccountTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_password_reset_link_can_be_requested(): void
    {
        Notification::fake();
        $user = User::factory()->create(['role' => 'user', 'status' => 'active']);

        $this->post('/forgot-password', ['email' => $user->email])->assertSessionHasNoErrors();

        Notification::assertSentTo($user, ResetPasswordNotification::class);
    }

    public function test_registration_redirects_to_email_verification(): void
    {
        Notification::fake();

        $this->post('/register', [
            'name' => 'Тест Пациент',
            'email' => 'patient@example.com',
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
            'consent' => true,
        ])->assertRedirect(route('verification.notice'));

        $this->assertAuthenticated();
        Notification::assertSentTo(User::where('email', 'patient@example.com')->first(), VerifyEmailNotification::class);
    }

    public function test_vk_user_without_email_can_open_account_when_social_linked(): void
    {
        $user = User::factory()->unverified()->create([
            'role' => 'user',
            'status' => 'active',
            'email' => 'vk_777@stomclinik.local',
        ]);
        SocialAccount::factory()->create([
            'user_id' => $user->id,
            'provider' => 'vk',
            'provider_user_id' => '777',
        ]);

        $this->actingAs($user)->get(route('account.overview'))->assertOk();
        $this->assertTrue($user->hasVerifiedEmail());
    }

    public function test_unverified_user_cannot_open_account(): void
    {
        $user = User::factory()->unverified()->create(['role' => 'user', 'status' => 'active']);

        $this->actingAs($user)->get(route('account.overview'))->assertRedirect(route('verification.notice'));
    }

    public function test_vk_oauth_rejects_invalid_state(): void
    {
        Config::set('services.vk_oauth.client_id', '12345');
        Config::set('services.vk_oauth.enabled', true);

        $this->get('/auth/vk/callback?code=abc&state=tampered')
            ->assertRedirect(route('login'))
            ->assertSessionHasErrors('email');
    }

    public function test_vk_oauth_accepts_payload_query_param(): void
    {
        Config::set('services.vk_oauth.client_id', '12345');
        Config::set('services.vk_oauth.enabled', true);

        $vk = app(VkOAuthClient::class);
        $url = $vk->authorizationUrl();
        parse_str(parse_url($url, PHP_URL_QUERY) ?: '', $query);
        $state = (string) ($query['state'] ?? '');

        Http::fake([
            'id.vk.com/oauth2/auth' => Http::response(['access_token' => 'tok', 'user_id' => 888], 200),
            'id.vk.com/oauth2/user_info' => Http::response(['user' => ['user_id' => 888, 'first_name' => 'P']], 200),
        ]);

        $payload = json_encode(['code' => 'from-payload', 'state' => $state, 'device_id' => 'dev-2', 'type' => 'code_v2'], JSON_THROW_ON_ERROR);

        $this->get('/auth/vk/callback?payload='.urlencode($payload))
            ->assertRedirect(route('account.overview'));

        $this->assertAuthenticated();
    }

    public function test_vk_oauth_exchanges_code_and_logs_in_new_user(): void
    {
        Config::set('services.vk_oauth.client_id', '12345');
        Config::set('services.vk_oauth.client_secret', 'secret');
        Config::set('services.vk_oauth.enabled', true);

        $vk = app(VkOAuthClient::class);
        $url = $vk->authorizationUrl();
        parse_str(parse_url($url, PHP_URL_QUERY) ?: '', $query);
        $state = (string) ($query['state'] ?? '');

        Http::fake([
            'id.vk.com/oauth2/auth' => Http::response(['access_token' => 'tok', 'refresh_token' => 'ref', 'user_id' => 777], 200),
            'id.vk.com/oauth2/user_info' => Http::response(['user' => ['user_id' => 777, 'email' => 'vk@example.com', 'first_name' => 'Vk', 'last_name' => 'User']], 200),
        ]);

        $this->get('/auth/vk/callback?code=good&state='.$state.'&device_id=test-device-1')
            ->assertRedirect(route('account.overview'));

        $this->assertAuthenticated();
        $this->assertDatabaseHas('social_accounts', ['provider' => 'vk', 'provider_user_id' => '777']);
    }

    public function test_social_login_with_existing_email_requires_password_link(): void
    {
        $existing = User::factory()->create(['email' => 'same@example.com', 'role' => 'user', 'status' => 'active']);

        $social = app(SocialAuthService::class);
        $profile = new SocialProfile('yandex', '999', 'same@example.com', null, 'Yandex User', null, emailVerified: true);
        $result = $social->resolveLogin($profile, null);

        $this->assertSame('link_prompt', $result['action']);
        $this->assertTrue($existing->is($result['user']));
    }

    public function test_max_login_code_expires(): void
    {
        Config::set('services.max_bot.token', 'token');
        Config::set('services.max_bot.login_enabled', true);

        $max = app(MaxLoginService::class);
        $session = $max->start();

        Cache::forget('max_login:'.$session['code']);

        $this->getJson('/auth/max/status/'.$session['code'])
            ->assertOk()
            ->assertJson(['status' => 'expired']);
    }

    public function test_max_webhook_attaches_user_and_status_becomes_ready(): void
    {
        Config::set('services.max_bot.token', 'token');
        Config::set('services.max_bot.login_enabled', true);
        Config::set('services.max_bot.webhook_secret', 'wh-secret');

        $max = app(MaxLoginService::class);
        $session = $max->start();

        Http::fake(['platform-api.max.ru/*' => Http::response(['ok' => true], 200)]);

        $this->post('/webhooks/max', [
            'update_type' => 'bot_started',
            'payload' => 'login_'.$session['code'],
            'user' => ['user_id' => 555, 'name' => 'Max User'],
        ], ['X-Max-Bot-Api-Secret' => 'wh-secret'])->assertOk();

        $this->getJson('/auth/max/status/'.$session['code'])
            ->assertOk()
            ->assertJsonPath('status', 'ready');
    }

    public function test_password_can_be_reset_with_token(): void
    {
        $user = User::factory()->create(['role' => 'user', 'status' => 'active']);
        $token = Password::createToken($user);

        $this->post('/password/reset', [
            'email' => $user->email,
            'token' => $token,
            'password' => 'Newpass1',
            'password_confirmation' => 'Newpass1',
        ])->assertRedirect(route('login'));

        $this->assertTrue(password_verify('Newpass1', $user->fresh()->password));
    }
}
