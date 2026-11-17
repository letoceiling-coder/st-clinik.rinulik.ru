<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\SocialAccount;
use App\Services\Notifications\NotificationSubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** Callback API сообщества VK: подтверждение адреса, message_allow / message_deny / message_new. */
class VkWebhookController extends Controller
{
    public function __invoke(Request $request, NotificationSubscriptionService $subscriptions): Response
    {
        $payload = $request->json()->all();
        $type = (string) ($payload['type'] ?? '');

        $groupId = config('services.vk_community.group_id');
        if (filled($groupId) && (string) ($payload['group_id'] ?? '') !== (string) $groupId) {
            abort(403);
        }

        $secret = config('services.vk_community.callback_secret');
        if (filled($secret) && ! hash_equals((string) $secret, (string) ($payload['secret'] ?? ''))) {
            abort(403);
        }

        if ($type === 'confirmation') {
            return response((string) config('services.vk_community.confirmation_code'), 200)
                ->header('Content-Type', 'text/plain; charset=UTF-8');
        }

        $object = (array) ($payload['object'] ?? []);
        $vkUserId = (string) ($object['user_id'] ?? $object['message']['from_id'] ?? '');

        if ($vkUserId !== '' && ctype_digit($vkUserId)) {
            match ($type) {
                'message_allow', 'message_new' => $this->allow($subscriptions, $vkUserId),
                'message_deny' => $subscriptions->revokeVk($vkUserId),
                default => null,
            };
        }

        // VK требует строго «ok» на любое событие, иначе повторяет доставку.
        return response('ok', 200)->header('Content-Type', 'text/plain; charset=UTF-8');
    }

    private function allow(NotificationSubscriptionService $subscriptions, string $vkUserId): void
    {
        $account = SocialAccount::query()
            ->where('provider', 'vk')
            ->where('provider_user_id', $vkUserId)
            ->with('user')
            ->first();

        if ($account?->user !== null) {
            $subscriptions->activateVk($account->user, $vkUserId);
        }
    }
}
