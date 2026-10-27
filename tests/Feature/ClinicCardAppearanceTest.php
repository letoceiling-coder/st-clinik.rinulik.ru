<?php

namespace Tests\Feature;

use App\Models\SiteSetting;
use App\Models\User;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClinicCardAppearanceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_home_page_shares_default_ivory_premium_skin(): void
    {
        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('display.premium_clinic_card_variant', 'ivory_gold')
                ->where('display.premium_clinic_card_class', 'clinic-card--premium-ivory'));
    }

    public function test_admin_can_switch_premium_card_variant(): void
    {
        $admin = User::factory()->create();
        $admin->forceFill(['role' => 'superadmin', 'status' => 'active'])->save();

        $this->actingAs($admin)
            ->put('/admin/clinic-card-appearance', ['variant' => 'gold_signature'])
            ->assertRedirect();

        $this->assertSame(
            'gold_signature',
            SiteSetting::query()->where('key', 'premium_clinic_card_variant')->value('value'),
        );

        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('display.premium_clinic_card_variant', 'gold_signature')
                ->where('display.premium_clinic_card_class', 'clinic-card--premium-signature'));
    }
}
