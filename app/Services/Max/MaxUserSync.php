<?php

namespace App\Services\Max;

use App\Models\MaxUser;
use App\Models\SocialAccount;

class MaxUserSync
{
    /** @param  array<string, mixed>  $maxUser */
    public function touch(string $maxUserId, array $maxUser, ?string $chatId = null): MaxUser
    {
        $account = SocialAccount::query()
            ->where('provider', 'max')
            ->where('provider_user_id', $maxUserId)
            ->first();

        $name = isset($maxUser['name']) ? (string) $maxUser['name'] : null;
        if ($name === null || $name === '') {
            $name = trim(implode(' ', array_filter([
                $maxUser['first_name'] ?? '',
                $maxUser['last_name'] ?? '',
            ])));
        }

        return MaxUser::query()->updateOrCreate(
            ['max_user_id' => $maxUserId],
            [
                'user_id' => $account?->user_id,
                'chat_id' => $chatId,
                'username' => isset($maxUser['username']) ? (string) $maxUser['username'] : null,
                'display_name' => $name !== '' ? $name : null,
                'last_seen_at' => now(),
                'is_blocked' => false,
            ],
        );
    }

    public function markBlocked(string $maxUserId): void
    {
        MaxUser::query()->where('max_user_id', $maxUserId)->update([
            'is_blocked' => true,
            'last_seen_at' => now(),
        ]);
    }
}
