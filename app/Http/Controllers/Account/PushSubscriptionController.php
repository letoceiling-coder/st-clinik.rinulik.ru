<?php

namespace App\Http\Controllers\Account;

use App\Http\Controllers\Controller;
use App\Services\Notifications\NotificationSubscriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PushSubscriptionController extends Controller
{
    public function store(Request $request, NotificationSubscriptionService $subscriptions): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'url', 'max:2048'],
            'keys' => ['required', 'array'],
            'keys.auth' => ['required', 'string', 'max:512'],
            'keys.p256dh' => ['required', 'string', 'max:512'],
        ]);

        $subscriptions->activateWebPush($request->user(), $data);

        return response()->json(['ok' => true]);
    }

    public function destroy(Request $request, NotificationSubscriptionService $subscriptions): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => ['required', 'url', 'max:2048'],
        ]);

        $subscriptions->revokeWebPush((string) $data['endpoint']);

        return response()->json(['ok' => true]);
    }
}
