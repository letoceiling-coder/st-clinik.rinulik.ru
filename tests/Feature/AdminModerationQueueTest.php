<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\ClinicDocument;
use App\Models\ClinicPhoto;
use App\Models\Organization;
use App\Models\Review;
use App\Models\User;
use App\Repositories\Contracts\CatalogRepository;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminModerationQueueTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_photo_without_file_shows_demo_illustration_with_explanation(): void
    {
        $clinic = $this->clinic();
        ClinicPhoto::create(['clinic_id' => $clinic->id, 'kind' => 'office', 'path' => null, 'art_seed' => 7, 'status' => 'pending']);

        $this->actingAs($this->superadmin())->get('/admin/moderation?type=photo')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('queue.0.type_label', 'Фото')
                ->where('queue.0.title', 'Фото: кабинет')
                ->where('queue.0.clinic.name', $clinic->name)
                ->where('queue.0.media.kind', 'photo_art')
                ->where('queue.0.media.seed', 7)
                ->where('queue.0.note_required', false));
    }

    public function test_uploaded_document_can_be_viewed_inline(): void
    {
        Storage::fake('local');
        $clinic = $this->clinic();
        $path = UploadedFile::fake()->create('license.pdf', 20, 'application/pdf')->store('clinic-docs/'.$clinic->id, 'local');
        $document = ClinicDocument::create([
            'clinic_id' => $clinic->id, 'type' => 'license', 'title' => 'Лицензия', 'number' => 'Л041-01', 'path' => $path, 'status' => 'pending',
        ]);
        $admin = $this->superadmin();

        $this->actingAs($admin)->get('/admin/moderation?type=document')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('queue.0.media.kind', 'pdf')
                ->where('queue.0.media.url', "/admin/moderation/documents/{$document->id}/view")
                ->where('queue.0.facts.0', ['label' => 'Тип', 'value' => 'Лицензия'])
                ->where('queue.0.links.0.label', 'Проверить в реестре лицензий'));

        $response = $this->actingAs($admin)->get("/admin/moderation/documents/{$document->id}/view")->assertOk();
        $this->assertStringStartsWith('inline', (string) $response->headers->get('Content-Disposition'));
    }

    public function test_document_without_file_explains_what_to_do(): void
    {
        $clinic = $this->clinic();
        ClinicDocument::create(['clinic_id' => $clinic->id, 'type' => 'certificate', 'title' => 'Сертификат', 'path' => null, 'status' => 'pending']);

        $this->actingAs($this->superadmin())->get('/admin/moderation?type=document')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('queue.0.media.kind', 'missing')
                ->where('queue.0.links', []));
    }

    public function test_review_flags_are_shown_in_russian(): void
    {
        $clinic = $this->clinic();
        Review::create([
            'clinic_id' => $clinic->id, 'rating' => 2, 'body' => 'Звоните мне', 'author_name' => 'Анна',
            'status' => 'pending', 'flags' => ['phone', 'abusive'],
        ]);

        $this->actingAs($this->superadmin())->get('/admin/moderation?type=review')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('queue.0.flags', ['номер телефона', 'грубые выражения'])
                ->where('queue.0.rating', 2)
                ->where('queue.0.body', 'Звоните мне'));
    }

    public function test_viewing_documents_requires_moderation_access(): void
    {
        $clinic = $this->clinic();
        $document = ClinicDocument::create(['clinic_id' => $clinic->id, 'type' => 'license', 'title' => 'Лицензия', 'status' => 'pending']);
        $patient = User::factory()->create();
        $patient->forceFill(['status' => 'active'])->save();

        $this->actingAs($patient)->get("/admin/moderation/documents/{$document->id}/view")->assertForbidden();
    }

    private function clinic(): Clinic
    {
        $organization = Organization::create(['name' => 'Org '.uniqid(), 'status' => 'active']);

        return Clinic::create([
            'organization_id' => $organization->id,
            'city_id' => app(CatalogRepository::class)->defaultCity()->id,
            'name' => 'Стоматология «Новая»',
            'slug' => 'novaya-'.uniqid(),
            'address' => 'ул. Тестовая, 1',
            'status' => 'published',
        ]);
    }

    private function superadmin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['role' => 'superadmin', 'status' => 'active'])->save();

        return $admin;
    }
}
