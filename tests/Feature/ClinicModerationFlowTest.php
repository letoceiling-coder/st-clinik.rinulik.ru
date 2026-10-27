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

class ClinicModerationFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_clinic_moderation_goes_pending_approved_published(): void
    {
        $owner = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Mod org']);
        OrganizationStaff::query()->create([
            'organization_id' => $org->id,
            'user_id' => $owner->id,
            'role' => OrganizationStaff::ROLE_OWNER,
            'invited_at' => now(),
        ]);
        $clinic = Clinic::create([
            'organization_id' => $org->id,
            'city_id' => (int) City::query()->where('name', 'Краснодар')->value('id'),
            'name' => 'Тестовая стоматология',
            'slug' => 'test-mod-clinic',
            'address' => 'ул. Тестовая, 1',
            'phone' => '+79001112233',
            'status' => 'draft',
            'description' => str_repeat('Описание клиники. ', 20),
            'schedule' => ['mon' => ['open' => '09:00', 'close' => '18:00']],
            'payment_methods' => ['Наличные'],
            'lat' => 45.0,
            'lng' => 39.0,
            'restrictions' => 'Нет',
            'art_seed' => 1,
        ]);

        $this->actingAs($owner)->post(route('cabinet.branches.submit', $clinic))->assertRedirect();
        $this->assertSame('pending', $clinic->fresh()->status);

        $admin = User::factory()->create(['role' => 'superadmin', 'status' => 'active']);
        $this->actingAs($admin)->put(route('admin.clinics.update', $clinic), [
            'status' => 'approved',
            'is_verified' => false,
        ])->assertRedirect();
        $this->assertSame('approved', $clinic->fresh()->status);

        $this->actingAs($owner)->post(route('cabinet.branches.publish', $clinic))->assertRedirect();
        $this->assertSame('published', $clinic->fresh()->status);
    }
}
