<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\System\SystemHealth;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SystemHealthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
        Http::fake();
        config(['services.max_bot.token' => null, 'services.openrouter.api_key' => null, 'app.url' => 'http://localhost']);
    }

    public function test_superadmin_sees_all_checks_and_moderator_does_not(): void
    {
        $this->actingAs($this->user('superadmin'))->get('/admin/system')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/SystemHealth')
                ->where('checks', fn ($checks) => collect($checks)->pluck('key')->contains('scheduler') && collect($checks)->pluck('key')->contains('max_webhook'))
                ->has('overall'));

        $this->actingAs($this->user('moderator'))->get('/admin/system')->assertForbidden();
    }

    public function test_scheduler_heartbeat_controls_its_status(): void
    {
        Cache::forever(SystemHealth::SCHEDULER_BEAT_KEY, now()->subMinutes(30)->toIso8601String());
        $this->assertSame('fail', $this->check('scheduler')['status']);

        Cache::forever(SystemHealth::SCHEDULER_BEAT_KEY, now()->toIso8601String());
        $this->assertSame('ok', $this->check('scheduler')['status']);
    }

    public function test_command_alerts_superadmins_once_and_reports_recovery(): void
    {
        $admin = $this->user('superadmin');
        Cache::forever(SystemHealth::SCHEDULER_BEAT_KEY, now()->toIso8601String());
        $this->failJobs(25);

        $this->artisan('system:health-check')->assertSuccessful();
        $this->artisan('system:health-check')->assertSuccessful();

        $alerts = DB::table('user_notifications')->where('user_id', $admin->id)->where('type', 'system_health')->get();
        $this->assertCount(1, $alerts->where('title', 'Сбой на сайте'));
        $this->assertStringContainsString('Упавшие задачи', $alerts->firstWhere('title', 'Сбой на сайте')->body);

        DB::table('failed_jobs')->delete();
        $this->artisan('system:health-check')->assertSuccessful();

        $this->assertDatabaseHas('user_notifications', ['user_id' => $admin->id, 'title' => 'Работа восстановлена']);
    }

    /** @return array{key: string, status: string, value: string} */
    private function check(string $key): array
    {
        return collect(app(SystemHealth::class)->checks(fresh: true))->firstWhere('key', $key);
    }

    private function failJobs(int $count): void
    {
        for ($i = 0; $i < $count; $i++) {
            DB::table('failed_jobs')->insert([
                'uuid' => (string) Str::uuid(),
                'connection' => 'redis',
                'queue' => 'default',
                'payload' => '{}',
                'exception' => 'RuntimeException: test',
                'failed_at' => now(),
            ]);
        }
    }

    private function user(string $role): User
    {
        $user = User::factory()->create();
        $user->forceFill(['role' => $role, 'status' => 'active'])->save();

        return $user;
    }
}
