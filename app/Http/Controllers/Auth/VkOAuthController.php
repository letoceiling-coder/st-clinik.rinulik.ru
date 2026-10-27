<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Auth\Concerns\HandlesSocialLogin;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Auth\SocialAuthService;
use App\Services\Auth\VkOAuthClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class VkOAuthController extends Controller
{
    use HandlesSocialLogin;

    public function redirect(Request $request, VkOAuthClient $vk): RedirectResponse|Response
    {
        abort_unless($vk->isConfigured(), 404);

        $meta = ['intent' => 'login'];
        if ($request->user()) {
            $meta = ['intent' => 'link', 'user_id' => $request->user()->id];
        }

        $url = $vk->authorizationUrl($meta);
        if ($request->header('X-Inertia')) {
            return Inertia::location($url);
        }

        return redirect()->away($url);
    }

    public function callback(Request $request, VkOAuthClient $vk, SocialAuthService $social): RedirectResponse
    {
        abort_unless($vk->isConfigured(), 404);

        $parsed = $vk->parseCallback($request);
        if ($parsed['code'] === '' || $parsed['state'] === '') {
            return redirect()->route('login')->withErrors(['email' => 'VK ID: неполный ответ авторизации.']);
        }

        try {
            $exchange = $vk->exchange($parsed['code'], $parsed['state'], $parsed['device_id']);
        } catch (\InvalidArgumentException $e) {
            $message = $e->getMessage() === 'device_id_required'
                ? 'VK ID не передал идентификатор устройства. Попробуйте войти ещё раз.'
                : 'Сессия VK ID истекла или state подменён. Попробуйте снова.';

            return redirect()->route('login')->withErrors(['email' => $message]);
        } catch (\Throwable) {
            return redirect()->route('login')->withErrors(['email' => 'Не удалось авторизоваться через VK ID. Проверьте Redirect URL и ключ приложения.']);
        }

        $profile = $exchange['profile'];
        $current = $request->user();
        if ($current === null && $exchange['intent'] === 'link' && $exchange['link_user_id']) {
            $current = User::query()->find($exchange['link_user_id']);
        }

        $result = $social->resolveLogin($profile, $current);

        return $this->handleSocialResult($request, $social, $result, $profile);
    }
}
