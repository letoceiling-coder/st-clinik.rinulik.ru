<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnalyticsEvent;
use App\Services\Analytics\AnalyticsTracker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AnalyticsController extends Controller
{
    public function store(Request $request, AnalyticsTracker $tracker): JsonResponse
    {
        $data = $request->validate([
            'event' => ['required', 'string', Rule::in(array_keys(AnalyticsEvent::LABELS))],
            'city_slug' => ['nullable', 'string', 'max:120'],
            'session_id' => ['nullable', 'string', 'max:128'],
            'meta' => ['nullable', 'array'],
        ]);

        $tracker->track(
            $data['event'],
            $data['meta'] ?? [],
            $data['city_slug'] ?? null,
            $data['session_id'] ?? null,
        );

        return response()->json(['ok' => true]);
    }
}
