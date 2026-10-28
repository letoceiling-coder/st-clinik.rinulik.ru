<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class MaxWebhookSyncTest extends TestCase
{
    use RefreshDatabase;

    private const API = 'https://platform-api.max.ru';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
        config(['services.max_bot.api_url' => self::API, 'app.url' => 'https://mirklinik.ru']);
        url()->forceRootUrl('https://mirklinik.ru');
        Cache::flush();
    }

    public function test_changing_bot_token_in_admin_reinstalls_webhook_and_cleans_old_subscriptions(): void
    {
        $this->fakeMaxApi([
            'old-token' => ['https://mirklinik.ru/webhooks/max', 'https://my.bots.example/max'],
            'new-token' => ['https://st-clinik.rinulik.ru/webhooks/max', 'https://my.bots.example/max'],
        ]);
        $admin = $this->superadmin();
        $this->actingAs($admin)->put('/admin/integrations/max_bot', ['bot_token' => 'old-token']);
        Http::fake();
        $this->fakeMaxApi([
            'old-token' => ['https://mirklinik.ru/webhooks/max', 'https://my.bots.example/max'],
            'new-token' => ['https://st-clinik.rinulik.ru/webhooks/max', 'https://my.bots.example/max'],
        ]);

        $this->actingAs($admin)->put('/admin/integrations/max_bot', ['bot_token' => 'new-token'])
            ->assertSessionHas('success', fn (string $message) => str_contains($message, 'Webhook MAX установлен на https://mirklinik.ru/webhooks/max'));

        Http::assertSent(fn (Request $r) => $r->method() === 'POST'
            && $r->header('Authorization')[0] === 'new-token'
            && $r['url'] === 'https://mirklinik.ru/webhooks/max');
        Http::assertSent(fn (Request $r) => $r->method() === 'DELETE'
            && $r->header('Authorization')[0] === 'new-token'
            && str_contains($r->url(), urlencode('https://st-clinik.rinulik.ru/webhooks/max')));
        Http::assertSent(fn (Request $r) => $r->method() === 'DELETE'
            && $r->header('Authorization')[0] === 'old-token'
            && str_contains($r->url(), urlencode('https://mirklinik.ru/webhooks/max')));
        Http::assertNotSent(fn (Request $r) => $r->method() === 'DELETE' && str_contains($r->url(), 'my.bots.example'));
    }

    public function test_command_skips_when_nothing_changed_and_reinstalls_after_domain_change(): void
    {
        config(['services.max_bot.token' => 'bot-token']);
        $this->fakeMaxApi(['bot-token' => []]);

        $this->artisan('max:sync-webhook')->assertSuccessful();
        Http::assertSentCount(2);

        $this->artisan('max:sync-webhook')->expectsOutputToContain('актуален')->assertSuccessful();
        Http::assertSentCount(2);

        url()->forceRootUrl('https://new-domain.ru');
        $this->artisan('max:sync-webhook')->assertSuccessful();
        Http::assertSent(fn (Request $r) => $r->method() === 'POST' && $r['url'] === 'https://new-domain.ru/webhooks/max');
    }

    public function test_webhook_secret_is_passed_to_max(): void
    {
        config(['services.max_bot.token' => 'bot-token', 'services.max_bot.webhook_secret' => 'secret_1234567890']);
        $this->fakeMaxApi(['bot-token' => []]);

        $this->artisan('max:sync-webhook', ['--force' => true])->assertSuccessful();

        Http::assertSent(fn (Request $r) => $r->method() === 'POST' && $r['secret'] === 'secret_1234567890');
    }

    /** @param  array<string, list<string>>  $subscriptionsByToken */
    private function fakeMaxApi(array $subscriptionsByToken): void
    {
        Http::fake(function (Request $request) use ($subscriptionsByToken) {
            if (! str_starts_with($request->url(), self::API)) {
                return Http::response([], 404);
            }
            $token = $request->header('Authorization')[0] ?? '';
            if ($request->method() === 'GET') {
                return Http::response(['subscriptions' => array_map(
                    fn (string $url) => ['url' => $url, 'update_types' => ['message_created']],
                    $subscriptionsByToken[$token] ?? [],
                )]);
            }

            return Http::response(['success' => true]);
        });
    }

    private function superadmin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['role' => 'superadmin', 'status' => 'active'])->save();

        return $admin;
    }
}
