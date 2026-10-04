<?php

namespace Tests\Feature;

use App\Models\IntegrationSetting;
use App\Models\User;
use App\Services\IntegrationSettings;
use App\Services\YooKassaService;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
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

    public function test_superadmin_can_save_yookassa_settings(): void
    {
        $admin = User::factory()->create();
        $admin->forceFill(['role' => 'superadmin', 'status' => 'active'])->save();

        $this->actingAs($admin)->put('/admin/integrations/yookassa', [
            'shop_id' => '123456',
            'secret_key' => 'test_secret_key',
            'return_url' => 'https://example.test/clinic-cabinet/promotions/return',
        ])->assertRedirect();

        $settings = app(IntegrationSettings::class);
        $this->assertSame('123456', $settings->get('yookassa', 'shop_id'));
        $this->assertSame('test_secret_key', $settings->get('yookassa', 'secret_key'));
        $this->assertTrue(app(YooKassaService::class)->configured());
    }

    public function test_secret_fields_are_encrypted_in_database(): void
    {
        $admin = User::factory()->create();
        $admin->forceFill(['role' => 'superadmin', 'status' => 'active'])->save();

        $this->actingAs($admin)->put('/admin/integrations/yandex_maps', [
            'api_key' => 'maps-secret-key',
        ]);

        $raw = IntegrationSetting::query()->where('group', 'yandex_maps')->where('key', 'api_key')->value('value');
        $this->assertNotSame('maps-secret-key', $raw);
        $this->assertSame('maps-secret-key', Crypt::decryptString((string) $raw));
    }
}
