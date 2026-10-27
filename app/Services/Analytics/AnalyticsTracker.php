<?php

namespace App\Services\Analytics;

use App\Models\AnalyticsEvent;
use App\Models\City;
use Illuminate\Support\Facades\Auth;

class AnalyticsTracker
{
    /** @param array<string, mixed> $meta */
    public function track(string $event, array $meta = [], ?string $citySlug = null, ?string $sessionId = null): void
    {
        if (! array_key_exists($event, AnalyticsEvent::LABELS)) {
            return;
        }

        $cityId = null;
        if ($citySlug !== null && $citySlug !== '') {
            $cityId = City::query()->where('slug', $citySlug)->value('id');
        }

        AnalyticsEvent::query()->create([
            'event' => $event,
            'city_id' => $cityId,
            'user_id' => Auth::id(),
            'session_hash' => $sessionId ? hash('sha256', $sessionId) : null,
            'meta' => $meta ?: null,
        ]);
    }
}
