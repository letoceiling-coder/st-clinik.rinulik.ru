<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\OrganizationStaff;
use App\Models\User;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationBlockTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_admin_can_block_organization_and_clinic_cabinet_is_denied(): void
    {
        [$owner, $clinic] = $this->clinicWithOwner();
        $admin = User::factory()->create(['role' => 'superadmin', 'status' => 'active']);

        $this->actingAs($admin)->post(route('admin.clinics.organization.block', $clinic), [
            'note' => 'Нарушение правил',
        ])->assertRedirect();

        $this->assertSame('blocked', $clinic->organization->fresh()->status);
        $this->assertSame('blocked', $clinic->fresh()->status);

        $this->actingAs($owner)->get('/clinic-cabinet')->assertForbidden();
    }

    public function test_unblock_organization_restores_cabinet_access(): void
    {
        [$owner, $clinic] = $this->clinicWithOwner();
        $admin = User::factory()->create(['role' => 'superadmin', 'status' => 'active']);

        $this->actingAs($admin)->post(route('admin.clinics.organization.block', $clinic));
        $this->actingAs($admin)->post(route('admin.clinics.organization.unblock', $clinic))->assertRedirect();

        $this->assertSame('active', $clinic->organization->fresh()->status);
        $this->actingAs($owner)->get('/clinic-cabinet/staff')->assertOk();
    }

    /** @return array{0: User, 1: Clinic} */
    private function clinicWithOwner(): array
    {
        $owner = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Block org']);
        OrganizationStaff::query()->create([
            'organization_id' => $org->id,
            'user_id' => $owner->id,
            'role' => OrganizationStaff::ROLE_OWNER,
            'invited_at' => now(),
        ]);
        $clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => (int) City::query()->value('id'),
            'name' => 'Block clinic',
            'slug' => 'block-clinic-'.uniqid(),
            'address' => 'Addr',
            'status' => 'published',
        ]);

        return [$owner, $clinic];
    }
}
