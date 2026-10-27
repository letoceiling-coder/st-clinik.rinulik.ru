<?php

namespace App\Services\Broadcasts;

use App\Models\Broadcast;
use App\Models\Clinic;
use App\Models\ClinicPromotion;
use App\Models\SiteSetting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

/** Лимиты и правила рассылок клиник подписчикам (фаза 5.5). */
class ClinicBroadcastSettings
{
    private const KEY = 'broadcasts.clinic';

    private const CACHE_KEY = 'site_settings.broadcasts.clinic';

    /** @return array{enabled: bool, max_per_week: int, max_body_length: int, requires_active_promotion: bool} */
    public function all(): array
    {
        $defaults = [
            'enabled' => true,
            'max_per_week' => 2,
            'max_body_length' => 1200,
            'requires_active_promotion' => true,
        ];

        if (! Schema::hasTable('site_settings')) {
            return $defaults;
        }

        $stored = Cache::rememberForever(self::CACHE_KEY, fn () => SiteSetting::query()->where('key', self::KEY)->value('value'));
        if (! is_string($stored) || $stored === '') {
            return $defaults;
        }

        $decoded = json_decode($stored, true);
        if (! is_array($decoded)) {
            return $defaults;
        }

        return [
            'enabled' => (bool) ($decoded['enabled'] ?? $defaults['enabled']),
            'max_per_week' => max(1, (int) ($decoded['max_per_week'] ?? $defaults['max_per_week'])),
            'max_body_length' => max(200, (int) ($decoded['max_body_length'] ?? $defaults['max_body_length'])),
            'requires_active_promotion' => (bool) ($decoded['requires_active_promotion'] ?? $defaults['requires_active_promotion']),
        ];
    }

    /** @param array{enabled?: bool, max_per_week?: int, max_body_length?: int, requires_active_promotion?: bool} $patch */
    public function save(array $patch): void
    {
        $current = $this->all();
        $next = [
            'enabled' => (bool) ($patch['enabled'] ?? $current['enabled']),
            'max_per_week' => max(1, (int) ($patch['max_per_week'] ?? $current['max_per_week'])),
            'max_body_length' => max(200, (int) ($patch['max_body_length'] ?? $current['max_body_length'])),
            'requires_active_promotion' => (bool) ($patch['requires_active_promotion'] ?? $current['requires_active_promotion']),
        ];

        SiteSetting::query()->updateOrCreate(
            ['key' => self::KEY],
            ['value' => json_encode($next, JSON_UNESCAPED_UNICODE)],
        );
        Cache::forget(self::CACHE_KEY);
    }

    public function clinicMayBroadcast(Clinic $clinic): bool
    {
        $settings = $this->all();
        if (! $settings['enabled']) {
            return false;
        }

        if (! $settings['requires_active_promotion']) {
            return true;
        }

        return ClinicPromotion::query()
            ->where('clinic_id', $clinic->id)
            ->where('status', 'active')
            ->exists();
    }

    public function broadcastsThisWeek(Clinic $clinic): int
    {
        return Broadcast::query()
            ->where('sender_type', Broadcast::SENDER_CLINIC)
            ->where('clinic_id', $clinic->id)
            ->where('created_at', '>=', now()->startOfWeek())
            ->whereIn('moderation_status', ['pending', 'approved'])
            ->whereNotIn('status', ['cancelled'])
            ->count();
    }
}
