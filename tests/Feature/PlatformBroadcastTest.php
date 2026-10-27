<?php

namespace Tests\Feature;

use App\Models\Broadcast;
use App\Models\BroadcastRecipient;
use App\Models\User;
use App\Services\Broadcasts\BroadcastService;
use App\Services\Notifications\NotificationPreferenceService;
use App\Support\NotificationEvents;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class PlatformBroadcastTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_superadmin_can_create_broadcast_draft(): void
    {
        $admin = $this->superadmin();

        $this->actingAs($admin)->post('/admin/broadcasts', [
            'name' => 'Осенняя акция',
            'body' => 'Скидки на профилактику.',
            'channels' => ['email'],
            'filters' => ['roles' => ['user']],
        ])->assertRedirect();

        $this->assertDatabaseHas('broadcasts', [
            'name' => 'Осенняя акция',
            'sender_type' => 'platform',
            'status' => 'draft',
        ]);
    }

    public function test_build_recipients_respects_marketing_preference(): void
    {
        Mail::fake();

        $user = User::factory()->create([
            'role' => 'user',
            'status' => 'active',
            'notify_email' => true,
            'email_verified_at' => now(),
        ]);

        app(NotificationPreferenceService::class)
            ->update($user, NotificationEvents::PLATFORM_MARKETING, []);

        $broadcast = Broadcast::query()->create([
            'sender_type' => Broadcast::SENDER_PLATFORM,
            'name' => 'Test',
            'body' => 'Body',
            'channels' => ['email'],
            'filters' => ['roles' => ['user']],
            'status' => 'draft',
        ]);

        $result = app(BroadcastService::class)->buildRecipients($broadcast);

        $this->assertSame(0, $result['created']);
    }

    public function test_tracked_link_records_click(): void
    {
        $broadcast = Broadcast::query()->create([
            'sender_type' => Broadcast::SENDER_PLATFORM,
            'name' => 'Test',
            'body' => 'Body',
            'button_url' => 'https://example.com/promo',
            'channels' => ['email'],
            'status' => 'draft',
        ]);

        $recipient = BroadcastRecipient::query()->create([
            'broadcast_id' => $broadcast->id,
            'channel' => 'email',
            'track_code' => 'abc1234567',
            'status' => BroadcastRecipient::STATUS_SENT,
        ]);

        $this->get(route('broadcast.go', ['code' => 'abc1234567']))->assertRedirect('https://example.com/promo');

        $recipient->refresh();
        $this->assertNotNull($recipient->clicked_at);
    }

    public function test_unsubscribe_requires_valid_signature(): void
    {
        $broadcast = Broadcast::query()->create([
            'sender_type' => Broadcast::SENDER_PLATFORM,
            'name' => 'Test',
            'body' => 'Body',
            'channels' => ['email'],
            'status' => 'draft',
        ]);

        $recipient = BroadcastRecipient::query()->create([
            'broadcast_id' => $broadcast->id,
            'channel' => 'email',
            'contact' => 'user@example.com',
            'track_code' => 'xyz9876543',
            'status' => BroadcastRecipient::STATUS_SENT,
        ]);

        $this->get(route('broadcast.unsubscribe', ['code' => 'xyz9876543']))->assertForbidden();

        $url = URL::signedRoute('broadcast.unsubscribe', ['code' => 'xyz9876543']);
        $this->get($url)->assertOk();
        $this->assertSame(BroadcastRecipient::STATUS_UNSUBSCRIBED, $recipient->fresh()->status);
    }

    private function superadmin(): User
    {
        $admin = User::factory()->create();
        $admin->forceFill(['role' => 'superadmin', 'status' => 'active'])->save();

        return $admin;
    }
}
