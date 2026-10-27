<?php

namespace Tests\Feature;

use App\Jobs\GenerateAdminReportJob;
use App\Models\AdminReportExport;
use App\Models\AnalyticsEvent;
use App\Models\City;
use App\Models\User;
use App\Services\Admin\CityImportService;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminPhase12Test extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_admin_appointments_page_loads(): void
    {
        $admin = User::factory()->create(['role' => 'superadmin', 'status' => 'active']);

        $this->actingAs($admin)->get('/admin/appointments')->assertOk()->assertInertia(fn ($page) => $page->component('Admin/Appointments'));
    }

    public function test_admin_report_export_generates_csv(): void
    {
        Storage::fake('local');
        $admin = User::factory()->create(['role' => 'superadmin', 'status' => 'active']);

        $this->actingAs($admin)->post('/admin/reports', ['report_type' => 'users'])->assertRedirect();

        $export = AdminReportExport::query()->where('user_id', $admin->id)->firstOrFail();
        GenerateAdminReportJob::dispatchSync($export->id);

        $export->refresh();
        $this->assertSame(AdminReportExport::STATUS_READY, $export->status);
        $this->assertNotNull($export->file_path);
        Storage::disk('local')->assertExists($export->file_path);
        $this->assertStringEndsWith('.csv', (string) $export->file_path);
    }

    public function test_admin_report_export_generates_xlsx(): void
    {
        Storage::fake('local');
        $admin = User::factory()->create(['role' => 'superadmin', 'status' => 'active']);

        $this->actingAs($admin)->post('/admin/reports', [
            'report_type' => 'cities',
            'format' => AdminReportExport::FORMAT_XLSX,
        ])->assertRedirect();

        $export = AdminReportExport::query()->where('user_id', $admin->id)->firstOrFail();
        GenerateAdminReportJob::dispatchSync($export->id);

        $export->refresh();
        $this->assertSame(AdminReportExport::STATUS_READY, $export->status);
        $this->assertStringEndsWith('.xlsx', (string) $export->file_path);
        Storage::disk('local')->assertExists($export->file_path);
    }

    public function test_admin_dashboard_has_clinic_status_breakdown(): void
    {
        $admin = User::factory()->create(['role' => 'superadmin', 'status' => 'active']);

        $this->actingAs($admin)->get('/admin')->assertOk()->assertInertia(fn ($page) => $page
            ->component('Admin/Dashboard')
            ->has('clinics_by_status')
            ->has('kpi.revenue_30d'));
    }

    public function test_admin_analytics_page_loads(): void
    {
        $admin = User::factory()->create(['role' => 'superadmin', 'status' => 'active']);
        AnalyticsEvent::query()->create(['event' => AnalyticsEvent::EVENT_PAGE_VIEW]);

        $this->actingAs($admin)->get('/admin/analytics')->assertOk()->assertInertia(fn ($page) => $page
            ->component('Admin/Analytics')
            ->has('funnel'));
    }

    public function test_city_csv_import_creates_region_and_city(): void
    {
        $admin = User::factory()->create(['role' => 'superadmin', 'status' => 'active']);
        $csv = tempnam(sys_get_temp_dir(), 'csv');
        file_put_contents($csv, "name;slug;region;population;lat;lng;districts\nТестград;testgrad;Тестовая область;10000;55.1;37.2;Центр,Север\n");

        $file = new UploadedFile($csv, 'cities.csv', 'text/csv', null, true);
        $stats = app(CityImportService::class)->import($file);

        $this->assertSame(1, $stats['created']);
        $this->assertSame(1, $stats['regions']);
        $this->assertSame(2, $stats['districts']);
        $this->assertDatabaseHas('cities', ['slug' => 'testgrad']);
        $this->assertDatabaseHas('regions', ['slug' => 'testovaya-oblast']);

        $this->actingAs($admin)->get('/admin/geography')->assertOk()->assertInertia(fn ($page) => $page->component('Admin/Geography'));
    }

    public function test_analytics_event_api_accepts_valid_event(): void
    {
        $city = City::query()->firstOrFail();

        $this->postJson('/api/v1/analytics/event', [
            'event' => AnalyticsEvent::EVENT_SEARCH,
            'city_slug' => $city->slug,
            'session_id' => 'test-session',
        ])->assertOk();

        $this->assertDatabaseHas('analytics_events', ['event' => AnalyticsEvent::EVENT_SEARCH, 'city_id' => $city->id]);
    }
}
