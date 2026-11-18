<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Clinic;
use App\Models\Lead;
use App\Models\Organization;
use App\Models\OrganizationStaff;
use App\Models\User;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class CabinetRoleAccessTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Organization $organization;

    private Clinic $clinic;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);

        $this->owner = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $this->organization = Organization::create(['owner_id' => $this->owner->id, 'name' => 'Roles org']);
        $this->clinic = Clinic::create([
            'organization_id' => $this->organization->id,
            'city_id' => (int) City::query()->value('id'),
            'name' => 'Roles clinic',
            'slug' => 'roles-clinic',
            'address' => 'Addr',
            'status' => 'approved',
        ]);
    }

    public function test_unverified_owner_can_fill_the_cabinet_but_not_submit_pay_or_invite(): void
    {
        $this->owner->forceFill(['email_verified_at' => null])->save();
        $this->clinic->update(['status' => 'draft']);

        foreach (['/clinic-cabinet', '/clinic-cabinet/branches', '/clinic-cabinet/branches/create', '/clinic-cabinet/doctors', '/clinic-cabinet/prices', '/clinic-cabinet/photos'] as $url) {
            $this->actingAs($this->owner)->get($url)->assertOk();
        }
        $this->actingAs($this->owner)->get('/clinic-cabinet')->assertInertia(fn (Assert $page) => $page->where('cabinet.email_verified', false));

        $this->actingAs($this->owner)->post(route('cabinet.branches.submit', $this->clinic))
            ->assertSessionHas('error', fn (string $message) => str_contains($message, 'Подтвердите e-mail'));
        $this->assertSame('draft', $this->clinic->fresh()->status);

        $this->actingAs($this->owner)->post('/clinic-cabinet/staff/invite', ['email' => 'new@example.test', 'role' => OrganizationStaff::ROLE_MANAGER])
            ->assertSessionHas('error', fn (string $message) => str_contains($message, 'Подтвердите e-mail'));
        $this->assertDatabaseMissing('staff_invitations', ['email' => 'new@example.test']);
    }

    public function test_verified_owner_is_not_blocked_by_the_email_rule(): void
    {
        $this->clinic->update(['status' => 'draft']);

        $this->actingAs($this->owner)->post(route('cabinet.branches.submit', $this->clinic))
            ->assertSessionHas('error', fn (string $message) => ! str_contains($message, 'Подтвердите e-mail'));
    }

    public function test_clinic_is_never_public_until_moderation_even_if_the_owner_fills_everything(): void
    {
        $this->owner->forceFill(['email_verified_at' => null])->save();
        $this->clinic->update(['status' => 'draft']);

        $this->get('/clinics/roles-clinic')->assertNotFound();
        $this->actingAs($this->owner)->post(route('cabinet.branches.publish', $this->clinic));
        $this->assertSame('draft', $this->clinic->fresh()->status);
        $this->get('/clinics/roles-clinic')->assertNotFound();
    }

    public function test_content_manager_cannot_open_patient_sections(): void
    {
        $content = $this->staff(OrganizationStaff::ROLE_CONTENT);

        foreach (['/clinic-cabinet/leads', '/clinic-cabinet/calendar', '/clinic-cabinet/reviews', '/clinic-cabinet/payments', '/clinic-cabinet/staff'] as $url) {
            $this->actingAs($content)->get($url)->assertForbidden();
        }
        $this->actingAs($content)->get('/clinic-cabinet/prices')->assertOk();
    }

    public function test_manager_works_with_leads_but_not_profile_content(): void
    {
        $manager = $this->staff(OrganizationStaff::ROLE_MANAGER);

        $this->actingAs($manager)->get('/clinic-cabinet/leads')->assertOk();
        $this->actingAs($manager)->get('/clinic-cabinet/prices')->assertForbidden();
        $this->actingAs($manager)->post('/clinic-cabinet/prices', ['name' => 'Чистка'])->assertForbidden();
    }

    public function test_clinic_admin_cannot_manage_billing_staff_or_organization(): void
    {
        $admin = $this->staff(OrganizationStaff::ROLE_ADMIN);

        $this->actingAs($admin)->get('/clinic-cabinet/doctors')->assertOk();
        $this->actingAs($admin)->get('/clinic-cabinet/payments')->assertForbidden();
        $this->actingAs($admin)->get('/clinic-cabinet/organization')->assertForbidden();
        $this->actingAs($admin)->post('/clinic-cabinet/staff/invite', [
            'email' => 'new@example.test',
            'role' => OrganizationStaff::ROLE_MANAGER,
        ])->assertForbidden();
    }

    public function test_dashboard_shares_abilities_and_hides_patient_leads_from_content_manager(): void
    {
        Lead::create(['clinic_id' => $this->clinic->id, 'name' => 'Пациент', 'phone' => '+79000000000', 'status' => 'new', 'consent_at' => now()]);
        $content = $this->staff(OrganizationStaff::ROLE_CONTENT);

        $this->actingAs($content)->get('/clinic-cabinet')->assertInertia(fn (Assert $page) => $page
            ->where('cabinet.abilities', ['manage_content'])
            ->where('recent_leads', []));

        $this->actingAs($this->owner)->get('/clinic-cabinet')->assertInertia(fn (Assert $page) => $page
            ->has('recent_leads', 1));
    }

    public function test_owner_cannot_republish_branch_hidden_by_moderation(): void
    {
        $this->clinic->update(['status' => 'hidden']);
        $this->assertSame(Clinic::HIDDEN_BY_MODERATION, $this->clinic->fresh()->hidden_reason);

        $this->actingAs($this->owner)->post("/clinic-cabinet/branches/{$this->clinic->id}/publish")->assertSessionHas('error');

        $this->assertSame('hidden', $this->clinic->fresh()->status);
    }

    public function test_branch_hidden_by_expired_tariff_needs_active_subscription_to_republish(): void
    {
        $this->clinic->update(['status' => 'hidden', 'hidden_reason' => Clinic::HIDDEN_BY_SUBSCRIPTION]);

        $this->actingAs($this->owner)->post("/clinic-cabinet/branches/{$this->clinic->id}/publish")->assertSessionHas('error');

        $this->assertSame('hidden', $this->clinic->fresh()->status);
    }

    public function test_owner_publishes_approved_branch(): void
    {
        $this->actingAs($this->owner)->post("/clinic-cabinet/branches/{$this->clinic->id}/publish")->assertSessionHas('success');

        $this->assertSame('published', $this->clinic->fresh()->status);
        $this->assertNull($this->clinic->fresh()->hidden_reason);
    }

    private function staff(string $role): User
    {
        $user = User::factory()->create(['role' => 'user', 'status' => 'active']);
        OrganizationStaff::query()->create([
            'organization_id' => $this->organization->id,
            'user_id' => $user->id,
            'role' => $role,
            'invited_at' => now(),
        ]);

        return $user;
    }
}
