<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationSubscription extends Model
{
    public const CHANNEL_MAX = 'max';

    public const CHANNEL_VK = 'vk';

    public const CHANNEL_EMAIL = 'email';

    public const CHANNEL_WEB_PUSH = 'web_push';

    public const CHANNEL_SMS = 'sms';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_REVOKED = 'revoked';

    public const STATUS_BLOCKED = 'blocked';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'allowed_at' => 'datetime',
            'revoked_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }
}
