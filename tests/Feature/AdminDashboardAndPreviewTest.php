<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\User;
use App\Repositories\Contracts\CatalogRepository;
use App\Support\AuditActions;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AdminDashboardAndPreviewTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_staff_sees_preview_of_unpublished_clinic(): void
    {
        $clinic = $this->clinic('draft');

        $this->actingAs($this->superadmin())->get("/clinics/{$clinic->slug}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Clinics/Show')
                ->where('clinic.slug', $clinic->slug)
                ->where('preview.back_url', "/admin/clinics/{$clinic->id}")
                ->where('preview.note', fn (string $note) => str_contains($note, '«Черновик»'))
                ->where('seo.robots', fn (string $robots) => str_contains($robots, 'noindex')));

        $this->assertSame(0, (int) $clinic->fresh()->views_count);
    }

    public function test_visitors_still_get_404_for_unpublished_clinic(): void
    {
        $clinic = $this->clinic('draft');

        $this->get("/clinics/{$clinic->slug}")->assertNotFound();
        $patient = User::factory()->create();
        $patient->forceFill(['status' => 'active'])->save();
        $this->actingAs($patient)->get("/clinics/{$clinic->slug}")->assertNotFound();
    }

    public function test_published_clinic_page_has_no_preview_banner(): void
    {
        $clinic = $this->clinic('published');

        $this->actingAs($this->superadmin())->get("/clinics/{$clinic->slug}")
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Clinics/Show')->missing('preview'));
    }

    public function test_dashboard_shows_audit_actions_in_russian(): void
    {
        AuditLog::create(['action' => 'auth.social_login']);
        AuditLog::create(['action' => 'parser.imported']);

        $this->actingAs($this->superadmin())->get('/admin')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('audit.0.action', 'Парсер: импорт организаций')
                ->where('audit.1.action', 'Вход через соцсеть'));
    }

    public function test_audit_log_is_russian_and_filters_by_section(): void
    {
        $user = User::factory()->create();
        AuditLog::create(['action' => 'auth.login', 'result' => 'success', 'subject_type' => 'User', 'subject_id' => $user->id]);
        AuditLog::create(['action' => 'parser.imported']);

        $this->actingAs($this->superadmin())->get('/admin/audit?section=auth')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('logs.data', 1)
                ->where('logs.data.0.action', 'Вход по паролю')
                ->where('logs.data.0.result', 'Успешно')
                ->where('logs.data.0.subject', 'Пользователь № '.$user->id)
                ->where('sections.auth', 'Вход и регистрация'));
    }

    public function test_every_action_code_written_by_the_app_has_a_russian_label(): void
    {
        $codes = [];
        foreach (new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator(app_path())) as $file) {
            if ($file->getExtension() !== 'php') {
                continue;
            }
            preg_match_all("/Audit::log\\(\\s*'([a-z_]+\\.[a-z_.]+)'/", file_get_contents($file->getPathname()), $matches);
            array_push($codes, ...$matches[1]);
        }

        $this->assertNotEmpty($codes);
        foreach (array_unique($codes) as $code) {
            $this->assertNotSame('Действие в системе', AuditActions::label($code), "Нет русского названия для «{$code}»");
        }
    }

    public function test_dynamic_action_codes_are_translated(): void
    {
        $this->assertSame('Модерация: клиника — одобрено', AuditActions::label('moderation.clinic.approve'));
        $this->assertSame('Справочник: город — удалено', AuditActions::label('dictionary.cities.deleted'));
        $this->assertSame('Жалоба на отзыв удовлетворена', AuditActions::label('complaint.uphold'));
        $this->assertSame('Действие в системе', AuditActions::label('something.unknown'));
    }

    private function clinic(string $status): Clinic
    {
        $organization = Organization::create(['name' => 'Org '.uniqid(), 'status' => 'active']);

        return Clinic::create([
            'organization_id' => $organization->id,
            'city_id' => app(CatalogRepository::class)->defaultCity()->id,
            'name' => 'Дентал-Медиа',
            'slug' => 'dental-media-'.uniqid(),
            'address' => 'просп. Михаила Нагибина, 49',
            'phone' => '+7 (900) 000-00-00',
            'status' => $status,
        ]);
    }

    private function superadmin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['role' => 'superadmin', 'status' => 'active'])->save();

        return $admin;
    }
}
