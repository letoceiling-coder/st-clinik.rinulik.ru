<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdminRolesAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_content_manager_has_no_access_to_money_or_patient_data(): void
    {
        $user = $this->userWithRole('content_manager');

        $this->actingAs($user)->get('/admin/site-display')->assertOk();
        $this->actingAs($user)->get('/admin/finance')->assertForbidden();
        $this->actingAs($user)->get('/admin/tariffs')->assertForbidden();
        $this->actingAs($user)->get('/admin/appointments')->assertForbidden();
        $this->actingAs($user)->get('/admin/reports')->assertForbidden();
    }

    public function test_moderator_cannot_see_patient_appointments_or_exports(): void
    {
        $user = $this->userWithRole('moderator');

        $this->actingAs($user)->get('/admin/clinics')->assertOk();
        $this->actingAs($user)->get('/admin/appointments')->assertForbidden();
        $this->actingAs($user)->get('/admin/reports')->assertForbidden();
    }

    public function test_new_staff_roles_open_their_sections(): void
    {
        $this->actingAs($this->userWithRole('finance_manager'))->get('/admin/finance')->assertOk();
        $this->actingAs($this->userWithRole('support_operator'))->get('/admin/appointments')->assertOk();
        $this->actingAs($this->userWithRole('sales_manager'))->get('/admin/parser')->assertOk();
        $this->actingAs($this->userWithRole('sales_manager'))->get('/admin/finance')->assertForbidden();
    }

    public function test_user_manager_cannot_appoint_superadmin_or_touch_superadmin(): void
    {
        Role::create(['slug' => 'hr', 'name' => 'Кадры', 'permissions' => ['admin.dashboard', 'admin.users'], 'is_system' => false]);
        $hr = $this->userWithRole('hr');
        $patient = $this->userWithRole('user');
        $superadmin = $this->userWithRole('superadmin');

        $this->actingAs($hr)->put("/admin/users/{$patient->id}", ['role' => 'superadmin', 'status' => 'active'])
            ->assertSessionHasErrors('role');
        $this->assertSame('user', $patient->refresh()->role);

        $this->actingAs($hr)->put("/admin/users/{$superadmin->id}", ['role' => 'user', 'status' => 'blocked'])
            ->assertForbidden();
        $this->assertSame('superadmin', $superadmin->refresh()->role);

        $this->actingAs($hr)->put("/admin/users/{$patient->id}", ['role' => 'user', 'status' => 'blocked'])
            ->assertSessionHasNoErrors();
        $this->assertSame('blocked', $patient->refresh()->status);
    }

    public function test_role_manager_cannot_grant_more_than_own_rights_or_edit_own_role(): void
    {
        Role::create(['slug' => 'lead', 'name' => 'Руководитель', 'permissions' => ['admin.dashboard', 'admin.roles', 'admin.clinics'], 'is_system' => false]);
        $lead = $this->userWithRole('lead');

        $this->actingAs($lead)->post('/admin/roles', ['slug' => 'helper', 'name' => 'Помощник', 'permissions' => ['admin.dashboard', 'admin.finance']])
            ->assertSessionHasErrors('permissions');
        $this->assertDatabaseMissing('roles', ['slug' => 'helper']);

        $this->actingAs($lead)->post('/admin/roles', ['slug' => 'helper', 'name' => 'Помощник', 'permissions' => ['admin.dashboard', 'admin.clinics']])
            ->assertSessionHasNoErrors();

        $this->actingAs($lead)->put('/admin/roles/lead', ['name' => 'Руководитель', 'permissions' => ['admin.dashboard', 'admin.roles', 'admin.clinics', 'admin.finance']])
            ->assertForbidden();
        $this->actingAs($lead)->put('/admin/roles/content_manager', ['name' => 'Контент', 'permissions' => []])
            ->assertForbidden();
    }

    public function test_site_roles_never_get_admin_permissions(): void
    {
        $this->actingAs($this->userWithRole('superadmin'))
            ->put('/admin/roles/clinic_owner', ['name' => 'Представитель клиники', 'permissions' => ['admin.dashboard', 'admin.clinics']])
            ->assertSessionHasNoErrors();

        $this->assertSame([], Role::query()->find('clinic_owner')->permissions);
    }

    public function test_migration_keeps_access_of_custom_roles_and_resets_system_roles(): void
    {
        DB::table('roles')->insert(['slug' => 'custom_ops', 'name' => 'Опер', 'permissions' => json_encode(['admin.dashboard', 'admin.promotions']), 'is_system' => false]);
        DB::table('roles')->where('slug', 'content_manager')->update(['permissions' => json_encode(['admin.dashboard', 'admin.promotions', 'admin.cms'])]);
        DB::table('roles')->where('slug', 'finance_manager')->delete();

        $migration = require database_path('migrations/2026_10_28_222458_split_admin_permissions_and_add_staff_roles.php');
        $migration->up();

        $custom = Role::query()->find('custom_ops')->permissions;
        foreach (['admin.appointments', 'admin.reports', 'admin.analytics', 'admin.finance', 'admin.tariffs', 'admin.site_display'] as $permission) {
            $this->assertContains($permission, $custom);
        }
        $this->assertNotContains('admin.finance', Role::query()->find('content_manager')->permissions);
        $this->assertTrue(Role::query()->whereKey('finance_manager')->exists());
    }

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create();
        $user->forceFill(['role' => $role, 'status' => 'active'])->save();

        return $user;
    }
}
