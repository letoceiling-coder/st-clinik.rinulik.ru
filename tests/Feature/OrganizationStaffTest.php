<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Offer;
use App\Models\OfferTemplate;
use App\Models\Organization;
use App\Models\OrganizationStaff;
use App\Models\ParsedOrganization;
use App\Models\User;
use App\Services\Offers\OfferService;
use App\Services\Parser\ParsedOrganizationImporter;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class OrganizationStaffTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_clinic_registration_creates_organization_and_owner_staff(): void
    {
        $this->post('/register/clinic', [
            'name' => 'Иван',
            'organization_name' => 'Стома+',
            'email' => 'owner-clinic@example.test',
            'phone' => '+79001112233',
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
            'consent' => true,
        ])->assertRedirect(route('cabinet.branches.create'));

        $user = User::query()->where('email', 'owner-clinic@example.test')->firstOrFail();
        $this->assertSame('clinic_owner', $user->role);
        $org = Organization::query()->where('owner_id', $user->id)->firstOrFail();
        $this->assertDatabaseHas('organization_staff', [
            'organization_id' => $org->id,
            'user_id' => $user->id,
            'role' => OrganizationStaff::ROLE_OWNER,
        ]);
    }

    public function test_staff_member_can_open_cabinet_dashboard(): void
    {
        $owner = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Staff org']);
        $member = User::factory()->create(['role' => 'user', 'status' => 'active']);
        OrganizationStaff::query()->create([
            'organization_id' => $org->id,
            'user_id' => $member->id,
            'role' => OrganizationStaff::ROLE_MANAGER,
            'invited_at' => now(),
        ]);

        $this->actingAs($member)->get('/clinic-cabinet/staff')->assertOk();
    }

    public function test_owner_can_invite_staff_by_phone_without_sms(): void
    {
        $owner = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Phone org']);

        $this->actingAs($owner)->post('/clinic-cabinet/staff/invite', [
            'phone' => '+79001234567',
            'role' => OrganizationStaff::ROLE_MANAGER,
        ])->assertRedirect()->assertSessionHas('success');

        $this->assertDatabaseHas('staff_invitations', [
            'organization_id' => $org->id,
            'phone' => '+79001234567',
            'role' => OrganizationStaff::ROLE_MANAGER,
        ]);
    }

    public function test_content_manager_cannot_invite_staff(): void
    {
        $owner = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $org = Organization::create(['owner_id' => $owner->id, 'name' => 'Roles org']);
        $content = User::factory()->create(['role' => 'user', 'status' => 'active']);
        OrganizationStaff::query()->create([
            'organization_id' => $org->id,
            'user_id' => $content->id,
            'role' => OrganizationStaff::ROLE_CONTENT,
            'invited_at' => now(),
        ]);

        $this->actingAs($content)->post('/clinic-cabinet/staff/invite', [
            'email' => 'new@example.test',
            'role' => OrganizationStaff::ROLE_MANAGER,
        ])->assertForbidden();
    }

    public function test_registration_from_offer_requires_email_confirmation_before_claim(): void
    {
        Notification::fake();
        $offer = $this->draftOffer();

        $this->post('/register/clinic', [
            'name' => 'Пётр',
            'email' => 'claim@example.test',
            'phone' => '+79001112233',
            'password' => 'Password1',
            'password_confirmation' => 'Password1',
            'consent' => true,
            'offer_token' => $offer->token(),
        ])->assertRedirect(route('verification.notice'))
            ->assertSessionHas('url.intended', route('offer.claim.show', ['token' => $offer->token()]));

        $this->assertNull($offer->fresh()->clinic->organization->owner_id);
        $this->assertSame('ready', $offer->fresh()->status);
    }

    public function test_authenticated_user_can_claim_offer_with_confirmation(): void
    {
        $offer = $this->draftOffer();
        $user = User::factory()->create(['role' => 'user', 'status' => 'active', 'email' => 'owner2@example.test']);

        $this->actingAs($user)->post(route('offer.claim.store', ['token' => $offer->token()]), [
            'confirm' => '1',
            'agreement' => '1',
            'publish' => '1',
        ])->assertRedirect(route('cabinet.dashboard'));

        $this->assertSame('clinic_owner', $user->fresh()->role);
        $this->assertSame($user->id, $offer->fresh()->clinic->organization->owner_id);
    }

    private function draftOffer(): Offer
    {
        $parsed = ParsedOrganization::factory()->create(['city_id' => (int) City::query()->where('name', 'Краснодар')->value('id')]);
        $clinic = app(ParsedOrganizationImporter::class)->import($parsed, null, false);
        $template = OfferTemplate::factory()->create();

        return app(OfferService::class)->createFor($clinic, $template, null);
    }
}
