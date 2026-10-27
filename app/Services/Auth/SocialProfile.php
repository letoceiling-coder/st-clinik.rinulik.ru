<?php

namespace App\Services\Auth;

readonly class SocialProfile
{
    /**
     * @param  array<string, mixed>|null  $raw
     */
    public function __construct(
        public string $provider,
        public string $providerUserId,
        public ?string $email,
        public ?string $phone,
        public ?string $name,
        public ?string $avatar,
        public ?string $accessToken = null,
        public ?string $refreshToken = null,
        public ?array $raw = null,
        public bool $emailVerified = false,
    ) {}

    public function normalizedEmail(): ?string
    {
        return $this->email !== null && $this->email !== ''
            ? strtolower(trim($this->email))
            : null;
    }
}
