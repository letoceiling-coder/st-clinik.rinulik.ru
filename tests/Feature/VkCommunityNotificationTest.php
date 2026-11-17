<?php

namespace Tests\Feature;

use App\Models\NotificationSubscription;
use App\Models\SocialAccount;
use App\Models\User;
use App\Services\Notifications\NotificationPreferenceService;
use App\Services\Notifications\NotificationSubscriptionService;
use App\Services\Vk\VkCommunityClient;
use App\Services\Vk\VkSendException;
use Database\Seeders\FoundationSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class VkCommunityNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(FoundationSeeder::class);
        config([
            'services.vk_community.group_id' => '777',
            'services.vk_community.callback_secret' => 'cb-secret',
            'services.vk_community.confirmation_code' => 'abc123',
            'services.vk_community.access_token' => 'vk-token',
        ]);
    }

    public function test_events_are_ignored_while_the_integration_is_not_configured(): void
    {
        config(['services.vk_community.group_id' => null]);
        $user = User::factory()->create();
        SocialAccount::factory()->create(['user_id' => $user->id, 'provider' => 'vk', 'provider_user_id' => '4242']);

        $this->postJson('/webhooks/vk', ['type' => 'message_allow', 'object' => ['user_id' => 4242]])->assertOk();

        $this->assertNull(app(NotificationSubscriptionService::class)->activeVkUserId($user));
    }

    public function test_callback_confirmation_returns_code(): void
    {
        $this->postJson('/webhooks/vk', ['type' => 'confirmation', 'group_id' => 777, 'secret' => 'cb-secret'])
            ->assertOk()
            ->assertSeeText('abc123');
    }

    public function test_callback_with_wrong_secret_is_rejected(): void
    {
        $this->postJson('/webhooks/vk', ['type' => 'message_allow', 'group_id' => 777, 'secret' => 'bad', 'object' => ['user_id' => 5]])
            ->assertForbidden();
    }

    public function test_message_allow_and_deny_toggle_subscription_for_linked_vk_user(): void
    {
        $user = User::factory()->create();
        SocialAccount::factory()->create(['user_id' => $user->id, 'provider' => 'vk', 'provider_user_id' => '4242']);

        $this->postJson('/webhooks/vk', ['type' => 'message_allow', 'group_id' => 777, 'secret' => 'cb-secret', 'object' => ['user_id' => 4242]])
            ->assertOk()->assertSeeText('ok');

        $this->assertSame('4242', app(NotificationSubscriptionService::class)->activeVkUserId($user));
        $this->assertContains(NotificationSubscription::CHANNEL_VK, app(NotificationPreferenceService::class)->availableOutboundChannels($user));

        $this->postJson('/webhooks/vk', ['type' => 'message_deny', 'group_id' => 777, 'secret' => 'cb-secret', 'object' => ['user_id' => 4242]])
            ->assertOk();

        $this->assertNull(app(NotificationSubscriptionService::class)->activeVkUserId($user));
    }

    public function test_message_allow_from_unknown_vk_user_is_ignored(): void
    {
        $this->postJson('/webhooks/vk', ['type' => 'message_allow', 'group_id' => 777, 'secret' => 'cb-secret', 'object' => ['user_id' => 999]])
            ->assertOk();

        $this->assertDatabaseCount('notification_subscriptions', 0);
    }

    public function test_client_sends_message_and_blocked_user_error_is_reported(): void
    {
        Http::fake([
            'api.vk.com/method/messages.send' => Http::sequence()
                ->push(['response' => 1])
                ->push(['error' => ['error_code' => 901, 'error_msg' => 'Can\'t send messages for users without permission']]),
        ]);

        $client = app(VkCommunityClient::class);
        $client->sendToUser(4242, 'Привет');
        Http::assertSent(fn ($request) => $request['user_id'] === 4242 && $request['message'] === 'Привет');

        try {
            $client->sendToUser(4242, 'Привет');
            $this->fail('Ожидалось исключение');
        } catch (VkSendException $e) {
            $this->assertTrue($e->userBlockedMessages());
        }
    }
}
