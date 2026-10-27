<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\User;
use App\Services\Auth\MaxWebAppValidator;
use App\Services\IntegrationSettings;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MaxMiniAppTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_max_miniapp_page_is_available(): void
    {
        $this->get('/max')
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Max/Home'));
    }

    public function test_max_miniapp_allows_embedding_in_max_iframe(): void
    {
        $response = $this->get('/max');

        $response->assertOk();
        $this->assertStringContainsString('frame-ancestors', (string) $response->headers->get('Content-Security-Policy'));
        $this->assertFalse($response->headers->has('X-Frame-Options'));
    }

    public function test_init_data_signature_is_validated(): void
    {
        app(IntegrationSettings::class)->put('max_bot', 'bot_token', 'test-bot-token-secret');

        $authDate = time();
        $initData = MaxWebAppValidator::signForTest('test-bot-token-secret', [
            'auth_date' => (string) $authDate,
            'query_id' => 'q-1',
            'user' => json_encode(['id' => 4242, 'first_name' => 'Max'], JSON_UNESCAPED_UNICODE),
        ]);

        $this->post('/max/session', ['init_data' => $initData])
            ->assertRedirect(route('max.miniapp'));

        $this->assertDatabaseHas('social_accounts', [
            'provider' => 'max',
            'provider_user_id' => '4242',
        ]);

        $this->assertDatabaseHas('max_users', [
            'max_user_id' => '4242',
        ]);
    }

    public function test_init_data_start_param_redirects_to_clinic_in_max(): void
    {
        app(IntegrationSettings::class)->put('max_bot', 'bot_token', 'test-bot-token-secret');

        $city = City::query()->firstOrFail();
        $owner = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Max test org']);
        $clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => $city->id,
            'name' => 'Max Clinic',
            'slug' => 'demo-max-clinic',
            'address' => 'Test',
            'status' => 'published',
            'is_24_7' => false,
        ]);

        $authDate = time();
        $initData = MaxWebAppValidator::signForTest('test-bot-token-secret', [
            'auth_date' => (string) $authDate,
            'query_id' => 'q-2',
            'start_param' => 'clinic_'.$clinic->slug,
            'user' => json_encode(['id' => 5252, 'first_name' => 'Max'], JSON_UNESCAPED_UNICODE),
        ]);

        $this->post('/max/session', ['init_data' => $initData])
            ->assertRedirect(route('max.clinic', ['slug' => $clinic->slug]));
        $this->assertDatabaseHas('social_accounts', [
            'provider' => 'max',
            'provider_user_id' => '4242',
        ]);
    }

    public function test_init_data_with_bad_signature_is_rejected(): void
    {
        IntegrationSetting::query()->updateOrCreate(
            ['group' => 'max_bot', 'field' => 'bot_token'],
            ['value' => encrypt('test-bot-token-secret')],
        );
        app(IntegrationSettings::class)->applyToConfig();

        $this->post('/max/session', ['init_data' => 'auth_date=1&hash=deadbeef'])
            ->assertSessionHasErrors('init_data');
    }
}
