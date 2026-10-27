<?php

namespace App\Services\Auth;

use App\Services\Max\MaxBotClient;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class MaxLoginService
{
    private const TTL_SECONDS = 300;

    public function isEnabled(): bool
    {
        return filled(config('services.max_bot.token'))
            && (bool) config('services.max_bot.login_enabled');
    }

    public function botUsername(): ?string
    {
        $username = config('services.max_bot.username');

        return filled($username) ? ltrim((string) $username, '@') : null;
    }

    /**
     * @return array{code: string, bot_url: string|null, expires_in: int}
     */
    public function start(): array
    {
        $code = Str::random(32);
        Cache::put($this->sessionKey($code), [
            'status' => 'pending',
            'max_user_id' => null,
            'profile' => null,
            'started_at' => now()->toIso8601String(),
        ], self::TTL_SECONDS);

        $username = $this->botUsername();
        $botUrl = $username !== null
            ? 'https://max.ru/'.$username.'?start=login_'.$code
            : null;

        return [
            'code' => $code,
            'bot_url' => $botUrl,
            'expires_in' => self::TTL_SECONDS,
        ];
    }

    /**
     * @param  array<string, mixed>  $maxUser
     */
    public function attachFromWebhook(string $code, array $maxUser): bool
    {
        if (! str_starts_with($code, 'login_')) {
            $code = 'login_'.$code;
        }
        $plain = str_starts_with($code, 'login_') ? substr($code, 6) : $code;

        $key = $this->sessionKey($plain);
        $session = Cache::get($key);
        if (! is_array($session) || ($session['status'] ?? '') !== 'pending') {
            return false;
        }

        $providerUserId = (string) ($maxUser['user_id'] ?? $maxUser['id'] ?? '');
        if ($providerUserId === '') {
            return false;
        }

        $name = isset($maxUser['name']) ? (string) $maxUser['name'] : null;
        $phone = isset($maxUser['phone']) ? (string) $maxUser['phone'] : null;

        $profile = new SocialProfile(
            provider: 'max',
            providerUserId: $providerUserId,
            email: null,
            phone: $phone,
            name: $name,
            avatar: isset($maxUser['avatar_url']) ? (string) $maxUser['avatar_url'] : null,
            raw: $maxUser,
            emailVerified: false,
        );

        Cache::put($key, [
            'status' => 'ready',
            'max_user_id' => $providerUserId,
            'profile' => $this->serializeProfile($profile),
            'started_at' => $session['started_at'] ?? now()->toIso8601String(),
        ], self::TTL_SECONDS);

        return true;
    }

    /**
     * @return array{status: string, profile?: SocialProfile, complete_url?: string}
     */
    public function status(string $code): array
    {
        $session = Cache::get($this->sessionKey($code));
        if (! is_array($session)) {
            return ['status' => 'expired'];
        }

        $status = (string) ($session['status'] ?? 'pending');
        if ($status !== 'ready' || ! is_array($session['profile'] ?? null)) {
            return ['status' => $status === 'ready' ? 'pending' : $status];
        }

        $profile = $this->deserializeProfile($session['profile']);

        return [
            'status' => 'ready',
            'profile' => $profile,
            'complete_url' => URL::temporarySignedRoute(
                'auth.max.complete',
                now()->addMinutes(15),
                ['code' => $code],
            ),
        ];
    }

    public function consume(string $code): ?SocialProfile
    {
        $key = $this->sessionKey($code);
        $session = Cache::get($key);
        if (! is_array($session) || ($session['status'] ?? '') !== 'ready' || ! is_array($session['profile'] ?? null)) {
            return null;
        }

        Cache::forget($key);

        return $this->deserializeProfile($session['profile']);
    }

    public function sendLoginConfirmation(string $maxUserId, string $completeUrl): void
    {
        app(MaxBotClient::class)->sendToUser(
            (int) $maxUserId,
            'Вы вошли на сайт '.config('app.name').".\n\nОткрыть личный кабинет: {$completeUrl}",
            [
                [
                    ['type' => 'link', 'text' => 'Личный кабинет', 'url' => $completeUrl],
                    ['type' => 'request_contact', 'text' => 'Поделиться контактом'],
                ],
            ],
        );
    }

    private function sessionKey(string $code): string
    {
        return 'max_login:'.$code;
    }

    /** @return array<string, mixed> */
    private function serializeProfile(SocialProfile $profile): array
    {
        return [
            'provider' => $profile->provider,
            'provider_user_id' => $profile->providerUserId,
            'email' => $profile->email,
            'phone' => $profile->phone,
            'name' => $profile->name,
            'avatar' => $profile->avatar,
            'raw' => $profile->raw,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function deserializeProfile(array $data): SocialProfile
    {
        return new SocialProfile(
            provider: (string) $data['provider'],
            providerUserId: (string) $data['provider_user_id'],
            email: isset($data['email']) ? (string) $data['email'] : null,
            phone: isset($data['phone']) ? (string) $data['phone'] : null,
            name: isset($data['name']) ? (string) $data['name'] : null,
            avatar: isset($data['avatar']) ? (string) $data['avatar'] : null,
            raw: is_array($data['raw'] ?? null) ? $data['raw'] : null,
        );
    }
}
