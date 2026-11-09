<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Clinic;
use App\Models\ClinicClaimRequest;
use App\Models\Lead;
use App\Models\OfferTemplate;
use App\Models\Organization;
use App\Models\OrganizationContact;
use App\Models\OrganizationStaff;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\Offers\OfferService;
use App\Services\Offers\SmsSender;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\TestCase;

class ClinicClaimTest extends TestCase
{
    use RefreshDatabase;

    private Clinic $clinic;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
        Queue::fake();
        Storage::fake('local');

        // Карточка из парсера: опубликована, у организации нет владельца.
        $organization = Organization::create(['owner_id' => null, 'name' => 'Улыбка', 'status' => 'active']);
        $this->clinic = Clinic::create([
            'organization_id' => $organization->id,
            'city_id' => (int) City::query()->value('id'),
            'name' => 'Улыбка на Ленина',
            'slug' => 'ulybka-lenina',
            'address' => 'ул. Ленина, 1',
            'phone' => '+7 (900) 111-22-33',
            'lat' => 45.0,
            'lng' => 39.0,
            'status' => 'published',
        ]);
    }

    public function test_offer_can_be_created_and_claimed_for_published_ownerless_clinic(): void
    {
        $offer = app(OfferService::class)->createFor($this->clinic, OfferTemplate::factory()->create());
        $user = $this->verifiedUser();

        $this->actingAs($user)->post("/offer/{$offer->token()}/claim", ['confirm' => true, 'agreement' => true, 'publish' => true])
            ->assertRedirect(route('cabinet.dashboard'));

        $this->assertSame($user->id, $this->clinic->organization->fresh()->owner_id);
        $this->assertSame('published', $this->clinic->fresh()->status);
    }

    public function test_offer_is_not_created_for_clinic_with_owner(): void
    {
        $this->clinic->organization->update(['owner_id' => $this->verifiedUser()->id]);

        $this->expectException(RuntimeException::class);
        app(OfferService::class)->createFor($this->clinic->fresh(), OfferTemplate::factory()->create());
    }

    public function test_public_page_marks_ownerless_clinic_and_offers_claim(): void
    {
        $this->get('/clinics/ulybka-lenina')->assertInertia(fn ($page) => $page
            ->where('ownership.claimed', false)
            ->where('ownership.claim_url', route('clinics.claim.show', 'ulybka-lenina')));

        $this->clinic->organization->update(['owner_id' => $this->verifiedUser()->id]);
        $this->get('/clinics/ulybka-lenina')->assertInertia(fn ($page) => $page
            ->where('ownership.claimed', true)
            ->where('ownership.claim_url', null));
    }

    public function test_claim_request_requires_consent_document_and_verified_email(): void
    {
        $this->post('/clinics/ulybka-lenina/claim', $this->claimPayload())->assertRedirect('/login');

        $unverified = User::factory()->unverified()->create(['role' => 'user', 'status' => 'active']);
        $this->actingAs($unverified)->post('/clinics/ulybka-lenina/claim', $this->claimPayload())->assertRedirect(route('verification.notice'));

        $user = $this->verifiedUser();
        $this->actingAs($user)->post('/clinics/ulybka-lenina/claim', $this->claimPayload(['consent' => false, 'document' => null]))
            ->assertSessionHasErrors(['consent', 'document']);
        $this->assertSame(0, ClinicClaimRequest::query()->count());
    }

    public function test_moderator_approves_claim_and_competing_request_is_closed(): void
    {
        $moderator = User::factory()->create(['role' => 'moderator', 'status' => 'active']);
        $applicant = $this->verifiedUser();
        $other = $this->verifiedUser();

        $this->actingAs($applicant)->post('/clinics/ulybka-lenina/claim', $this->claimPayload())->assertSessionHas('success');
        $this->actingAs($other)->post('/clinics/ulybka-lenina/claim', $this->claimPayload());
        $this->assertSame(2, ClinicClaimRequest::query()->pending()->count());
        $this->assertDatabaseHas('user_notifications', ['user_id' => $moderator->id, 'type' => 'clinic_claim']);

        $request = ClinicClaimRequest::query()->where('user_id', $applicant->id)->sole();
        $this->actingAs($moderator)->get("/admin/moderation/claims/{$request->id}/document")->assertOk();
        $this->actingAs($moderator)->post("/admin/moderation/claim/{$request->id}", ['decision' => 'reject'])->assertSessionHasErrors('note');
        $this->actingAs($moderator)->post("/admin/moderation/claim/{$request->id}", ['decision' => 'approve'])->assertSessionHas('success');

        $this->assertSame($applicant->id, $this->clinic->organization->fresh()->owner_id);
        $this->assertSame('clinic_owner', $applicant->fresh()->role);
        $this->assertSame('published', $this->clinic->fresh()->status);
        $this->assertSame(ClinicClaimRequest::STATUS_REJECTED, ClinicClaimRequest::query()->where('user_id', $other->id)->sole()->status);
        $this->assertDatabaseHas('user_notifications', ['user_id' => $applicant->id, 'title' => 'Доступ к клинике открыт']);
    }

    public function test_claim_document_is_not_visible_to_regular_users(): void
    {
        $this->actingAs($this->verifiedUser())->post('/clinics/ulybka-lenina/claim', $this->claimPayload());
        $request = ClinicClaimRequest::query()->sole();

        $this->actingAs($this->verifiedUser())->get("/admin/moderation/claims/{$request->id}/document")->assertForbidden();
    }

    public function test_sms_code_to_clinic_phone_transfers_rights_immediately(): void
    {
        $sent = [];
        $this->app->instance(SmsSender::class, new class($sent) extends SmsSender
        {
            public function __construct(private array &$sent) {}

            public function configured(): bool
            {
                return true;
            }

            public function send(string $phone, string $text): string
            {
                $this->sent[] = $text;

                return 'ok';
            }
        });
        OrganizationContact::create(['clinic_id' => $this->clinic->id, 'type' => 'phone', 'value' => '+79001112233']);
        $user = $this->verifiedUser();

        $this->actingAs($user)->post('/clinics/ulybka-lenina/claim/code')->assertSessionHas('success');
        preg_match('/(\d{6})/', $sent[0], $m);

        $this->actingAs($user)->post('/clinics/ulybka-lenina/claim/sms', ['code' => '000000', 'authority' => true, 'agreement' => true])->assertSessionHasErrors('code');
        $this->actingAs($user)->post('/clinics/ulybka-lenina/claim/sms', ['code' => $m[1], 'authority' => true, 'agreement' => true])
            ->assertRedirect(route('cabinet.dashboard'));

        $this->assertSame($user->id, $this->clinic->organization->fresh()->owner_id);
    }

    public function test_owner_of_own_organization_takes_card_as_branch(): void
    {
        $owner = $this->verifiedUser(['role' => 'clinic_owner']);
        $own = Organization::create(['owner_id' => $owner->id, 'name' => 'Своя сеть', 'status' => 'active']);
        OrganizationStaff::create(['organization_id' => $own->id, 'user_id' => $owner->id, 'role' => OrganizationStaff::ROLE_OWNER, 'invited_at' => now()]);
        $moderator = User::factory()->create(['role' => 'superadmin', 'status' => 'active']);

        $this->actingAs($owner)->post('/clinics/ulybka-lenina/claim', $this->claimPayload())->assertSessionHas('success');
        $request = ClinicClaimRequest::query()->sole();
        $this->actingAs($moderator)->post("/admin/moderation/claim/{$request->id}", ['decision' => 'approve']);

        $this->assertSame($own->id, $this->clinic->fresh()->organization_id);
    }

    public function test_patient_lead_to_ownerless_clinic_reaches_platform_operators(): void
    {
        $operator = User::factory()->create(['role' => 'support_operator', 'status' => 'active']);

        $this->post('/leads', [
            'clinic' => 'ulybka-lenina', 'name' => 'Анна', 'phone' => '+7 (900) 555-44-33', 'consent' => true,
        ])->assertSessionHasNoErrors();

        $notification = UserNotification::query()->where('user_id', $operator->id)->where('type', 'lead_unclaimed')->sole();
        $this->assertStringNotContainsString('555', $notification->body);

        $lead = Lead::query()->sole();
        $this->actingAs($operator)->get('/admin/leads/unclaimed')
            ->assertInertia(fn ($page) => $page->where('leads.data.0.id', $lead->id)->where('active_count', 1));
        $this->actingAs($operator)->put("/admin/leads/unclaimed/{$lead->id}", ['status' => 'contacted', 'note' => 'Передали в клинику'])->assertSessionHas('success');
        $this->assertSame('contacted', $lead->fresh()->status);

        $this->actingAs($this->verifiedUser())->get('/admin/leads/unclaimed')->assertForbidden();
    }

    public function test_new_branch_matching_catalog_card_suggests_claim_instead_of_duplicate(): void
    {
        $owner = $this->verifiedUser(['role' => 'clinic_owner']);
        $own = Organization::create(['owner_id' => $owner->id, 'name' => 'Улыбка', 'status' => 'active']);
        OrganizationStaff::create(['organization_id' => $own->id, 'user_id' => $owner->id, 'role' => OrganizationStaff::ROLE_OWNER, 'invited_at' => now()]);
        $branch = [
            'name' => 'Стоматология Улыбка', 'city_id' => $this->clinic->city_id, 'address' => 'ул. Ленина, 1',
            'phone' => '+7 900 111-22-33', 'lat' => 45.0, 'lng' => 39.0,
        ];

        $this->actingAs($owner)->post('/clinic-cabinet/branches', $branch)
            ->assertSessionHas('duplicates', fn (array $d) => $d[0]['slug'] === 'ulybka-lenina');
        $this->assertSame(0, Clinic::query()->where('organization_id', $own->id)->count());

        $this->actingAs($owner)->post('/clinic-cabinet/branches', $branch + ['not_duplicate' => true])->assertRedirect(route('cabinet.branches'));
        $this->assertSame(1, Clinic::query()->where('organization_id', $own->id)->count());
    }

    public function test_registration_from_catalog_card_creates_only_account(): void
    {
        $this->post('/register/clinic', [
            'name' => 'Мария', 'email' => 'maria@example.com', 'password' => 'secret123A', 'password_confirmation' => 'secret123A',
            'consent' => true, 'claim_clinic' => 'ulybka-lenina',
        ])->assertRedirect(route('verification.notice'));

        $user = User::query()->where('email', 'maria@example.com')->sole();
        $this->assertSame(0, Organization::query()->where('owner_id', $user->id)->count());
        $this->assertSame(route('clinics.claim.show', 'ulybka-lenina'), session('url.intended'));
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function claimPayload(array $overrides = []): array
    {
        return array_merge([
            'position' => 'Главный врач',
            'phone' => '+7 (900) 777-88-99',
            'document' => UploadedFile::fake()->create('egrul.pdf', 120, 'application/pdf'),
            'authority' => true,
            'agreement' => true,
            'consent' => true,
        ], $overrides);
    }

    /** @param  array<string, mixed>  $attributes */
    private function verifiedUser(array $attributes = []): User
    {
        return User::factory()->create(['role' => 'user', 'status' => 'active', 'email_verified_at' => now(), ...$attributes]);
    }
}
