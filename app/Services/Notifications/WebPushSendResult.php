<?php

namespace App\Services\Notifications;

final class WebPushSendResult
{
    public function __construct(
        public readonly bool $success,
        public readonly bool $subscriptionExpired = false,
        public readonly ?string $reason = null,
    ) {}

    public static function failed(?string $reason = null): self
    {
        return new self(success: false, reason: $reason);
    }

    public static function ok(): self
    {
        return new self(success: true);
    }
}
