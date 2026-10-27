<?php

namespace App\Services;

use App\Models\SiteSetting;
use Illuminate\Support\Facades\Cache;

/** Глобальные переключатели модерации UGC клиник (ответы на отзывы, рекламные заказы). */
class ContentModerationSettings
{
    private const KEY = 'content_moderation.settings';

    private const CACHE_KEY = 'site_setting:content_moderation';

    public function moderateReviewReplies(): bool
    {
        return (bool) $this->all()['moderate_review_replies'];
    }

    public function moderatePromotions(): bool
    {
        return (bool) $this->all()['moderate_promotions'];
    }

    /** @return array{moderate_review_replies: bool, moderate_promotions: bool} */
    public function all(): array
    {
        $stored = Cache::rememberForever(self::CACHE_KEY, fn () => SiteSetting::query()->where('key', self::KEY)->value('value'));
        $decoded = is_string($stored) ? json_decode($stored, true) : null;

        return array_merge($this->defaults(), is_array($decoded) ? $decoded : []);
    }

    /** @param array<string, mixed> $payload */
    public function save(array $payload): void
    {
        $next = array_merge($this->all(), $payload);
        SiteSetting::query()->updateOrCreate(
            ['key' => self::KEY],
            ['value' => json_encode($next, JSON_UNESCAPED_UNICODE)],
        );
        Cache::forget(self::CACHE_KEY);
    }

    /** @return array{moderate_review_replies: bool, moderate_promotions: bool} */
    private function defaults(): array
    {
        return [
            'moderate_review_replies' => false,
            'moderate_promotions' => false,
        ];
    }
}
