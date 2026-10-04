<?php

namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(FoundationSeeder::class);
        config([
            'demo.enabled' => true,
            'demo.personas.cabinet.email' => 'cabinet-demo@example.test',
            'demo.personas.admin.email' => 'admin-demo@example.test',
        ]);
    }

    public function test_clinic_cabinet_demo_logs_in_and_redirects(): void
    {
        $owner = User::factory()->create(['email' => 'cabinet-demo@example.test']);
        $owner->forceFill(['role' => 'clinic_owner', 'status' => 'active'])->save();
        Organization::create(['owner_id' => $owner->id, 'name' => 'Demo Clinic']);

        $response = $this->get('/clinic-cabinet-demo');

        $response->assertRedirect(route('cabinet.dashboard'));
        $this->assertAuthenticatedAs($owner);
        $this->assertSame('cabinet', session('demo_mode'));
    }

    public function test_admin_demo_logs_in_and_redirects(): void
    {
        $admin = User::factory()->create(['email' => 'admin-demo@example.test']);
        $admin->forceFill(['role' => 'superadmin', 'status' => 'active'])->save();

        $response = $this->get('/admin-demo');

        $response->assertRedirect(route('admin.dashboard'));
        $this->assertAuthenticatedAs($admin);
        $this->assertSame('admin', session('demo_mode'));
    }

    public function test_demo_routes_are_hidden_when_disabled(): void
    {
        config(['demo.enabled' => false]);

        $this->get('/clinic-cabinet-demo')->assertNotFound();
        $this->get('/admin-demo')->assertNotFound();
    }
}
