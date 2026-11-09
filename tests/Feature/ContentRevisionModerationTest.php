<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Clinic;
use App\Models\ClinicPost;
use App\Models\ContentRevision;
use App\Models\Doctor;
use App\Models\Organization;
use App\Models\Service;
use App\Models\Specialty;
use App\Models\User;
use App\Services\ModerationQueue;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContentRevisionModerationTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private User $admin;

    private Organization $organization;

    private Clinic $clinic;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);

        $this->owner = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $this->admin = User::factory()->create(['role' => 'superadmin', 'status' => 'active']);
        $this->organization = Organization::create(['owner_id' => $this->owner->id, 'name' => 'Улыбка']);
        $this->clinic = Clinic::create([
            'organization_id' => $this->organization->id,
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

    public function test_published_branch_edit_waits_for_moderation_and_site_keeps_old_version(): void
    {
        $this->actingAs($this->owner)->put("/clinic-cabinet/branches/{$this->clinic->id}", $this->profile(['description' => 'Новое описание']))
            ->assertSessionHas('success');

        $this->assertNull($this->clinic->fresh()->description);
        $revision = ContentRevision::query()->sole();
        $this->assertSame(['description' => 'Новое описание'], $revision->payload);
        $this->assertSame(ContentRevision::MODE_PRE, $revision->mode);

        // The cabinet form shows what the clinic submitted.
        $this->actingAs($this->owner)->get("/clinic-cabinet/branches/{$this->clinic->id}/edit")
            ->assertInertia(fn ($page) => $page
                ->where('branchForm.description', 'Новое описание')
                ->where('pendingRevision.id', $revision->id));

        $this->actingAs($this->admin)->post("/admin/moderation/revision/{$revision->id}", ['decision' => 'approve'])
            ->assertSessionHas('success');

        $this->assertSame('Новое описание', $this->clinic->fresh()->description);
        $this->assertSame(ContentRevision::STATUS_APPROVED, $revision->fresh()->status);
        $this->assertDatabaseHas('user_notifications', ['user_id' => $this->owner->id, 'title' => 'Изменения одобрены']);
    }

    public function test_rejected_edit_keeps_published_data_and_requires_reason(): void
    {
        $this->actingAs($this->owner)->put("/clinic-cabinet/branches/{$this->clinic->id}", $this->profile(['name' => 'Лучшая клиника города']));
        $revision = ContentRevision::query()->sole();

        $this->actingAs($this->admin)->post("/admin/moderation/revision/{$revision->id}", ['decision' => 'reject'])
            ->assertSessionHasErrors('note');
        $this->actingAs($this->admin)->post("/admin/moderation/revision/{$revision->id}", ['decision' => 'reject', 'note' => 'Название должно совпадать с вывеской.']);

        $this->assertSame('Улыбка на Ленина', $this->clinic->fresh()->name);
        $this->assertSame(ContentRevision::STATUS_REJECTED, $revision->fresh()->status);
        $this->assertSame('Название должно совпадать с вывеской.', $revision->fresh()->moderation_note);
    }

    public function test_resubmitting_live_values_withdraws_the_pending_edit(): void
    {
        $this->actingAs($this->owner)->put("/clinic-cabinet/branches/{$this->clinic->id}", $this->profile(['metro' => 'Пушкинская']));
        $this->actingAs($this->owner)->put("/clinic-cabinet/branches/{$this->clinic->id}", $this->profile(['metro' => 'Чеховская']));
        $this->assertSame(1, ContentRevision::query()->pending()->count());
        $this->assertSame('Чеховская', ContentRevision::query()->pending()->sole()->payload['metro']);

        $this->actingAs($this->owner)->put("/clinic-cabinet/branches/{$this->clinic->id}", $this->profile());

        $this->assertSame(0, ContentRevision::query()->pending()->count());
    }

    public function test_draft_branch_is_saved_directly(): void
    {
        $this->clinic->update(['status' => 'draft']);

        $this->actingAs($this->owner)->put("/clinic-cabinet/branches/{$this->clinic->id}", $this->profile(['description' => 'Черновик']));

        $this->assertSame('Черновик', $this->clinic->fresh()->description);
        $this->assertSame(0, ContentRevision::query()->count());
    }

    public function test_price_changes_publish_immediately_and_go_to_post_moderation(): void
    {
        $services = Service::query()->limit(2)->pluck('id');

        $this->actingAs($this->owner)->post('/clinic-cabinet/prices', ['service_id' => $services[0], 'price_from' => 2500])->assertSessionHasNoErrors()->assertSessionHas('success');
        $this->actingAs($this->owner)->post('/clinic-cabinet/prices', ['service_id' => $services[1], 'price_from' => 4000])->assertSessionHasNoErrors();

        $this->assertSame(2, $this->clinic->clinicServices()->count());
        $revision = ContentRevision::query()->sole();
        $this->assertSame(ContentRevision::MODE_POST, $revision->mode);
        $this->assertSame('prices', $revision->section);

        $item = collect(app(ModerationQueue::class)->items())->firstWhere('type', 'revision');
        $this->assertCount(2, $item['diff']);
        $this->assertSame('—', $item['diff'][0]['before']);

        $this->actingAs($this->admin)->post("/admin/moderation/revision/{$revision->id}", ['decision' => 'approve']);
        $this->assertSame(2, $this->clinic->clinicServices()->count());
        $this->assertSame(ContentRevision::STATUS_APPROVED, $revision->fresh()->status);
    }

    public function test_schedule_change_publishes_immediately_with_post_moderation(): void
    {
        $days = ['mon' => ['enabled' => true, 'open' => '09:00', 'close' => '18:00']];

        $this->actingAs($this->owner)->put('/clinic-cabinet/schedule', ['days' => $days])->assertSessionHas('success');

        $this->assertSame('09:00', $this->clinic->fresh()->schedule['mon']['open']);
        $this->assertSame('schedule', ContentRevision::query()->sole()->section);
    }

    public function test_new_post_is_hidden_until_moderator_approves_it(): void
    {
        $this->actingAs($this->owner)->post('/clinic-cabinet/posts', [
            'type' => 'promo', 'title' => 'Скидка на чистку', 'body' => 'Профессиональная чистка со скидкой 20% до конца месяца.',
        ])->assertSessionHas('success');

        $post = ClinicPost::query()->sole();
        $this->assertSame('pending', $post->status);
        $this->assertSame(0, ClinicPost::query()->published()->count());

        $this->actingAs($this->admin)->post("/admin/moderation/post/{$post->id}", ['decision' => 'approve']);

        $this->assertSame('published', $post->fresh()->status);
    }

    public function test_published_doctor_edit_and_specialties_apply_after_approval(): void
    {
        $specialties = Specialty::query()->limit(2)->pluck('id');
        $doctor = Doctor::create([
            'clinic_id' => $this->clinic->id, 'name' => 'Иванов Иван', 'slug' => 'ivanov', 'position' => 'Терапевт',
            'experience_years' => 5, 'status' => 'published',
        ]);
        $doctor->specialties()->sync([$specialties[0]]);

        $this->actingAs($this->owner)->put("/clinic-cabinet/doctors/{$doctor->id}", [
            'name' => 'Иванов Иван', 'position' => 'Ортопед', 'experience_years' => 5, 'specialty_ids' => [$specialties[1]],
        ])->assertSessionHas('success');

        $this->assertSame('Терапевт', $doctor->fresh()->position);
        $revision = ContentRevision::query()->sole();

        $this->actingAs($this->admin)->post("/admin/moderation/revision/{$revision->id}", ['decision' => 'approve']);

        $this->assertSame('Ортопед', $doctor->fresh()->position);
        $this->assertSame([$specialties[1]], $doctor->specialties()->pluck('specialties.id')->all());
    }

    public function test_published_post_edit_keeps_old_text_until_approved(): void
    {
        $post = ClinicPost::create([
            'clinic_id' => $this->clinic->id, 'type' => 'news', 'title' => 'Открытие', 'slug' => 'otkrytie',
            'body' => 'Мы открылись на Ленина.', 'status' => 'published', 'sort' => 100,
        ]);

        $this->actingAs($this->owner)->put("/clinic-cabinet/posts/{$post->id}", [
            'type' => 'news', 'title' => 'Открытие', 'body' => 'Мы открылись на Ленина, 1 — ждём вас.',
        ])->assertSessionHas('success');

        $this->assertSame('Мы открылись на Ленина.', $post->fresh()->body);
        $this->assertSame('published', $post->fresh()->status);
        $this->assertSame('post', ContentRevision::query()->sole()->section);
    }

    public function test_approved_photo_caption_change_is_moderated(): void
    {
        $photo = $this->clinic->photos()->create(['kind' => 'interior', 'caption' => 'Холл', 'path' => 'clinic-photos/1/a.jpg', 'status' => 'approved']);

        $this->actingAs($this->owner)->put("/clinic-cabinet/photos/{$photo->id}", ['kind' => 'interior', 'caption' => 'Лучший холл'])
            ->assertSessionHas('success');

        $this->assertSame('Холл', $photo->fresh()->caption);
        $this->assertSame('approved', $photo->fresh()->status);
        $this->assertSame(['caption' => 'Лучший холл'], ContentRevision::query()->sole()->payload);
    }

    public function test_organization_requisites_of_published_clinic_need_moderation(): void
    {
        $this->actingAs($this->owner)->put('/clinic-cabinet/organization', ['name' => 'Улыбка', 'inn' => '2310000000']);

        $this->assertNull($this->organization->fresh()->inn);
        $this->assertSame('organization', ContentRevision::query()->sole()->section);
    }

    public function test_clinic_can_withdraw_own_edit_but_not_another_organizations(): void
    {
        $this->actingAs($this->owner)->put("/clinic-cabinet/branches/{$this->clinic->id}", $this->profile(['metro' => 'Пушкинская']));
        $revision = ContentRevision::query()->sole();

        $stranger = User::factory()->create(['role' => 'clinic_owner', 'status' => 'active']);
        $otherOrg = Organization::create(['owner_id' => $stranger->id, 'name' => 'Чужая']);
        Clinic::create(['organization_id' => $otherOrg->id, 'city_id' => $this->clinic->city_id, 'name' => 'Чужая клиника', 'slug' => 'other', 'address' => 'x', 'status' => 'draft']);
        $this->actingAs($stranger)->post("/clinic-cabinet/revisions/{$revision->id}/withdraw")->assertNotFound();

        $this->actingAs($this->owner)->post("/clinic-cabinet/revisions/{$revision->id}/withdraw")->assertSessionHas('success');
        $this->assertSame(ContentRevision::STATUS_WITHDRAWN, $revision->fresh()->status);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function profile(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Улыбка на Ленина',
            'city_id' => $this->clinic->city_id,
            'address' => 'ул. Ленина, 1',
            'phone' => '+7 (900) 111-22-33',
            'lat' => 45.0,
            'lng' => 39.0,
        ], $overrides);
    }
}
