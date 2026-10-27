<?php

namespace Tests\Feature;

use App\Models\NotificationSubscription;
use App\Models\SocialAccount;
use App\Models\User;
use App\Services\Auth\SocialAuthService;
use App\Services\Auth\SocialProfile;
use App\Services\Max\MaxBotConversation;
use App\Services\Notifications\NotificationSubscriptionService;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
    }

    public function test_max_social_link_creates_active_subscription(): void
    {
        $user = User::factory()->create();

        app(SocialAuthService::class)->link($user, new SocialProfile(
            provider: 'max',
            providerUserId: '9001',
            email: null,
            phone: null,
            name: 'Test',
            avatar: null,
            raw: [],
            emailVerified: false,
        ));

        $this->assertDatabaseHas('notification_subscriptions', [
            'user_id' => $user->id,
            'channel' => NotificationSubscription::CHANNEL_MAX,
            'external_id' => '9001',
            'status' => NotificationSubscription::STATUS_ACTIVE,
        ]);
    }

    public function test_bot_stopped_revokes_max_subscription(): void
    {
        $user = User::factory()->create();
        app(NotificationSubscriptionService::class)->activateMax($user, '9002');

        app(MaxBotConversation::class)->handle([
            'update_type' => 'bot_stopped',
            'user' => ['user_id' => 9002],
        ]);

        $this->assertDatabaseHas('notification_subscriptions', [
            'external_id' => '9002',
            'status' => NotificationSubscription::STATUS_REVOKED,
        ]);
    }

    public function test_bot_started_syncs_subscription_for_linked_account(): void
    {
        $user = User::factory()->create();
        SocialAccount::query()->create([
            'user_id' => $user->id,
            'provider' => 'max',
            'provider_user_id' => '9003',
            'linked_at' => now(),
        ]);

        app(MaxBotConversation::class)->handle([
            'update_type' => 'bot_started',
            'user' => ['user_id' => 9003],
        ]);

        $this->assertDatabaseHas('notification_subscriptions', [
            'user_id' => $user->id,
            'external_id' => '9003',
            'status' => NotificationSubscription::STATUS_ACTIVE,
        ]);
    }
}
