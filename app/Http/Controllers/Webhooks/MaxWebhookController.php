<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Services\Max\MaxBotConversation;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class MaxWebhookController extends Controller
{
    public function __invoke(Request $request, MaxBotConversation $conversation): Response
    {
        $secret = config('services.max_bot.webhook_secret');
        if (filled($secret)) {
            $header = $request->header('X-Max-Bot-Api-Secret');
            if (! hash_equals((string) $secret, (string) $header)) {
                abort(403);
            }
        }

        $conversation->handle($request->all());

        return response('ok', 200);
    }
}
