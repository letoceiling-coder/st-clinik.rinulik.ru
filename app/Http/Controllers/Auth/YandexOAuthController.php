<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Auth\Concerns\HandlesSocialLogin;
use App\Http\Controllers\Controller;
use App\Services\Auth\SocialAuthService;
use App\Services\Auth\SocialProfile;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\Response;

class YandexOAuthController extends Controller
{
    use HandlesSocialLogin;

    public function redirect(Request $request): RedirectResponse|Response
    {
        abort_unless((bool) config('services.yandex_oauth.enabled') && filled(config('services.yandex_oauth.client_id')), 404);

        if ($request->user()) {
            $request->session()->put('social_link_intent', true);
        }

        $response = Socialite::driver('yandex')
            ->scopes(['login:email', 'login:info'])
            ->redirect();

        if ($request->header('X-Inertia')) {
            return Inertia::location($response->getTargetUrl());
        }

        return $response;
    }

    public function callback(Request $request, SocialAuthService $social): RedirectResponse
    {
        abort_unless((bool) config('services.yandex_oauth.enabled'), 404);

        try {
            $yandexUser = Socialite::driver('yandex')->user();
        } catch (\Throwable) {
            return redirect()->route('login')->withErrors(['email' => 'Не удалось авторизоваться через Яндекс.']);
        }

        $profile = new SocialProfile(
            provider: 'yandex',
            providerUserId: (string) $yandexUser->getId(),
            email: $yandexUser->getEmail(),
            phone: null,
            name: $yandexUser->getName(),
            avatar: $yandexUser->getAvatar(),
            accessToken: $yandexUser->token,
            refreshToken: $yandexUser->refreshToken,
            raw: ['user' => $yandexUser->user],
            emailVerified: filled($yandexUser->getEmail()),
        );

        $result = $social->resolveLogin($profile, $request->user());

        return $this->handleSocialResult($request, $social, $result, $profile);
    }
}
