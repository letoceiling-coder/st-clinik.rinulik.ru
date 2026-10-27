<?php

namespace App\Http\Controllers\Auth\Concerns;

use App\Models\User;
use App\Services\Audit;
use App\Services\Auth\SocialAuthService;
use App\Services\Auth\SocialProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

trait HandlesSocialLogin
{
    protected function home(User $user): string
    {
        return match (true) {
            $user->role === 'clinic_owner' => route('cabinet.dashboard'),
            $user->hasAnyAdminPermission() => route('admin.dashboard'),
            default => route('account.overview'),
        };
    }

    protected function finishLogin(Request $request, User $user, string $auditEvent): RedirectResponse
    {
        if (! $user->isActive()) {
            return redirect()->route('login')->withErrors(['email' => 'Учётная запись заблокирована.']);
        }

        Auth::login($user, true);
        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()])->save();
        Audit::log($auditEvent, $user);

        return redirect()->intended($this->home($user));
    }

    /**
     * @param  array{action: string, user?: User}  $result
     */
    protected function handleSocialResult(Request $request, SocialAuthService $social, array $result, SocialProfile $profile): RedirectResponse
    {
        if ($result['action'] === 'link_prompt' && isset($result['user'])) {
            $request->session()->put('pending_social_link', [
                'user_id' => $result['user']->id,
                'profile' => $this->serializeProfile($profile),
                'expires_at' => now()->addMinutes(15)->timestamp,
            ]);

            return redirect()->route('auth.social.link')->with('success', 'Аккаунт с таким e-mail уже есть. Войдите паролем, чтобы привязать '.$profile->provider.'.');
        }

        if (! isset($result['user'])) {
            return redirect()->route('login')->withErrors(['email' => 'Не удалось выполнить вход.']);
        }

        return $this->finishLogin($request, $result['user'], 'auth.social_login');
    }

    /** @return array<string, mixed> */
    protected function serializeProfile(SocialProfile $profile): array
    {
        return [
            'provider' => $profile->provider,
            'provider_user_id' => $profile->providerUserId,
            'email' => $profile->email,
            'phone' => $profile->phone,
            'name' => $profile->name,
            'avatar' => $profile->avatar,
            'access_token' => $profile->accessToken,
            'refresh_token' => $profile->refreshToken,
            'raw' => $profile->raw,
            'email_verified' => $profile->emailVerified,
        ];
    }

    protected function deserializeProfile(array $data): SocialProfile
    {
        return new SocialProfile(
            provider: (string) $data['provider'],
            providerUserId: (string) $data['provider_user_id'],
            email: isset($data['email']) ? (string) $data['email'] : null,
            phone: isset($data['phone']) ? (string) $data['phone'] : null,
            name: isset($data['name']) ? (string) $data['name'] : null,
            avatar: isset($data['avatar']) ? (string) $data['avatar'] : null,
            accessToken: isset($data['access_token']) ? (string) $data['access_token'] : null,
            refreshToken: isset($data['refresh_token']) ? (string) $data['refresh_token'] : null,
            raw: is_array($data['raw'] ?? null) ? $data['raw'] : null,
            emailVerified: (bool) ($data['email_verified'] ?? false),
        );
    }
}
