<?php

namespace App\Http\Controllers;

use App\Models\BroadcastRecipient;
use App\Services\Broadcasts\BroadcastService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class BroadcastTrackingController extends Controller
{
    public function go(string $code, BroadcastService $broadcasts): RedirectResponse
    {
        $recipient = BroadcastRecipient::query()->where('track_code', $code)->firstOrFail();
        $broadcasts->recordClick($recipient);

        $target = $recipient->broadcast?->button_url;

        return redirect()->away(filled($target) ? (string) $target : url('/'));
    }

    public function unsubscribe(Request $request, string $code, BroadcastService $broadcasts): View
    {
        abort_unless($request->hasValidSignature(), 403);

        $recipient = BroadcastRecipient::query()->where('track_code', $code)->firstOrFail();
        $broadcasts->unsubscribe($recipient);

        return view('broadcast-unsubscribe', [
            'done' => true,
            'clinic' => false,
        ]);
    }

    public function clinicUnsubscribe(Request $request, string $code, BroadcastService $broadcasts): View
    {
        abort_unless($request->hasValidSignature(), 403);

        $recipient = BroadcastRecipient::query()->where('track_code', $code)->firstOrFail();
        $broadcasts->unsubscribeFromClinic($recipient);

        return view('broadcast-unsubscribe', [
            'done' => true,
            'clinic' => true,
        ]);
    }
}
