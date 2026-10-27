<?php

namespace App\Services\Auth;

use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class VkOAuthClient
{
    private const AUTHORIZE_URL = 'https://id.vk.com/authorize';

    private const TOKEN_URL = 'https://id.vk.com/oauth2/auth';

    private const USER_INFO_URL = 'https://id.vk.com/oauth2/user_info';

    private const STATE_TTL_SECONDS = 600;

    public function isConfigured(): bool
    {
        return filled(config('services.vk_oauth.client_id'))
            && (bool) config('services.vk_oauth.enabled');
    }

    public function redirectUri(): string
    {
        $configured = config('services.vk_oauth.redirect_uri');

        return filled($configured) ? (string) $configured : url('/auth/vk/callback');
    }

    /**
     * @return array{code: string, state: string, device_id: string}
     */
    public function parseCallback(Request $request): array
    {
        $code = $request->string('code')->toString();
        $state = $request->string('state')->toString();
        $deviceId = $request->string('device_id')->toString();

        $payloadRaw = $request->string('payload')->toString();
        if ($payloadRaw !== '') {
            $decoded = json_decode($payloadRaw, true);
            if (! is_array($decoded)) {
                $decoded = json_decode(urldecode($payloadRaw), true);
            }
            if (is_array($decoded)) {
                $code = $code !== '' ? $code : (string) ($decoded['code'] ?? '');
                $state = $state !== '' ? $state : (string) ($decoded['state'] ?? '');
                $deviceId = $deviceId !== '' ? $deviceId : (string) ($decoded['device_id'] ?? '');
            }
        }

        return [
            'code' => $code,
            'state' => $state,
            'device_id' => $deviceId,
        ];
    }

    /**
     * @param  array{intent?: string, user_id?: int|null}  $meta
     */
    public function authorizationUrl(array $meta = []): string
    {
        $verifier = Str::random(64);
        $challenge = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');
        $state = Str::random(40);

        Cache::put($this->stateKey($state), [
            'verifier' => $verifier,
            'intent' => $meta['intent'] ?? 'login',
            'user_id' => $meta['user_id'] ?? null,
        ], self::STATE_TTL_SECONDS);

        $query = http_build_query([
            'response_type' => 'code',
            'client_id' => config('services.vk_oauth.client_id'),
            'redirect_uri' => $this->redirectUri(),
            'state' => $state,
            'code_challenge' => $challenge,
            'code_challenge_method' => 'S256',
            'scope' => 'email phone',
        ]);

        return self::AUTHORIZE_URL.'?'.$query;
    }

    /**
     * @return array{profile: SocialProfile, intent: string, link_user_id: int|null}
     */
    public function exchange(string $code, string $state, string $deviceId): array
    {
        if ($deviceId === '') {
            throw new \InvalidArgumentException('device_id_required');
        }

        $payload = Cache::pull($this->stateKey($state));
        if (! is_array($payload) || ! isset($payload['verifier'])) {
            throw new \InvalidArgumentException('invalid_state');
        }

        $tokenBody = [
            'grant_type' => 'authorization_code',
            'code' => $code,
            'code_verifier' => $payload['verifier'],
            'client_id' => config('services.vk_oauth.client_id'),
            'device_id' => $deviceId,
            'redirect_uri' => $this->redirectUri(),
            'state' => $state,
        ];

        $secret = config('services.vk_oauth.client_secret');
        if (filled($secret)) {
            $tokenBody['client_secret'] = $secret;
        }

        $tokenResponse = Http::asForm()
            ->timeout(15)
            ->post(self::TOKEN_URL, $tokenBody)
            ->throw()
            ->json();

        $accessToken = (string) ($tokenResponse['access_token'] ?? '');
        if ($accessToken === '') {
            throw new RequestException(Http::response($tokenResponse, 400));
        }

        $providerUserId = (string) ($tokenResponse['user_id'] ?? '');
        $email = null;
        $phone = null;
        $name = null;
        $avatar = null;

        try {
            $userResponse = Http::asForm()
                ->timeout(15)
                ->post(self::USER_INFO_URL, [
                    'access_token' => $accessToken,
                    'client_id' => config('services.vk_oauth.client_id'),
                ])
                ->throw()
                ->json();

            $user = is_array($userResponse['user'] ?? null) ? $userResponse['user'] : $userResponse;
            if ($providerUserId === '') {
                $providerUserId = (string) ($user['user_id'] ?? $user['id'] ?? '');
            }
            $email = isset($user['email']) ? (string) $user['email'] : null;
            $phone = isset($user['phone']) ? (string) $user['phone'] : null;
            $name = trim(((string) ($user['first_name'] ?? '')).' '.((string) ($user['last_name'] ?? '')));
            $avatar = isset($user['avatar']) ? (string) $user['avatar'] : null;
        } catch (\Throwable) {
            $userResponse = [];
        }

        if ($providerUserId === '') {
            throw new \RuntimeException('vk_user_missing');
        }

        if ($name === '') {
            $name = 'Пользователь VK';
        }

        $profile = new SocialProfile(
            provider: 'vk',
            providerUserId: $providerUserId,
            email: $email,
            phone: $phone,
            name: $name,
            avatar: $avatar,
            accessToken: $accessToken,
            refreshToken: isset($tokenResponse['refresh_token']) ? (string) $tokenResponse['refresh_token'] : null,
            raw: ['token' => $tokenResponse, 'user' => $userResponse ?? []],
            emailVerified: filled($email),
        );

        return [
            'profile' => $profile,
            'intent' => (string) ($payload['intent'] ?? 'login'),
            'link_user_id' => isset($payload['user_id']) ? (int) $payload['user_id'] : null,
        ];
    }

    private function stateKey(string $state): string
    {
        return 'vk_oauth_state:'.$state;
    }
}
