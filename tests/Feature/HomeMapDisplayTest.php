<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\IntegrationSetting;
use App\Models\User;
use App\Services\PublicDisplaySettings;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Tests\TestCase;

class HomeMapDisplayTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_home_includes_map_props_when_enabled(): void
    {
        $city = City::query()->firstOrFail();

        $this->get('/?city='.$city->slug)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Home')
                ->has('home_map_clinics')
                ->has('home_map_active'));
    }

    public function test_home_hides_banners_when_ads_disabled(): void
    {
        app(PublicDisplaySettings::class)->save(['ads_enabled' => false]);

        $city = City::query()->firstOrFail();

        $this->get('/?city='.$city->slug)
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('banner_home', []));
    }

    public function test_admin_can_disable_home_map(): void
    {
        $admin = User::factory()->create();
        $admin->forceFill(['role' => 'superadmin', 'status' => 'active'])->save();

        $this->actingAs($admin)->put('/admin/site-display', [
            'home_map_enabled' => false,
            'ads_enabled' => true,
        ])->assertRedirect()->assertSessionHas('success');

        $this->assertFalse(app(PublicDisplaySettings::class)->homeMapEnabled());

        $city = City::query()->firstOrFail();
        $this->get('/?city='.$city->slug)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('home_map_active', false)
                ->where('home_map_clinics', []));
    }

    public function test_home_map_block_active_when_key_in_integrations_even_without_config_cache(): void
    {
        IntegrationSetting::query()->create([
            'group' => 'yandex_maps',
            'key' => 'api_key',
            'value' => Crypt::encryptString('maps-test-key'),
        ]);
        Cache::forget('integration_settings.v1');
        config(['services.yandex.maps_api_key' => null]);

        $city = City::query()->firstOrFail();

        $this->get('/?city='.$city->slug)
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('home_map_active', true)
                ->has('home_map_clinics'));
    }
}
