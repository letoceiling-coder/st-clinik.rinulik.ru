<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Auth\Concerns\HandlesSocialLogin;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Auth\SocialAuthService;
use App\Services\Seo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Response;

class SocialLinkController extends Controller
{
    use HandlesSocialLogin;

    public function __construct(private readonly Seo $seo) {}

    public function show(Request $request): Response|RedirectResponse
    {
        $pending = $request->session()->get('pending_social_link');
        if (! is_array($pending) || ($pending['expires_at'] ?? 0) < now()->timestamp) {
            return redirect()->route('login')->withErrors(['email' => 'Сессия привязки истекла. Повторите вход через соцсеть.']);
        }

        $user = User::query()->find($pending['user_id'] ?? 0);
        if ($user === null) {
            return redirect()->route('login');
        }

        $profile = $this->deserializeProfile($pending['profile']);

        return $this->page('Auth/LinkSocial', [
            'email' => $user->email,
            'provider' => $profile->provider,
        ], $this->seo->private('Привязка входа'));
    }

    public function confirm(Request $request, SocialAuthService $social): RedirectResponse
    {
        $pending = $request->session()->get('pending_social_link');
        if (! is_array($pending) || ($pending['expires_at'] ?? 0) < now()->timestamp) {
            return redirect()->route('login')->withErrors(['email' => 'Сессия привязки истекла.']);
        }

        $request->validate(['password' => 'required|string'], ['password.required' => 'Введите пароль.']);

        $user = User::query()->find($pending['user_id'] ?? 0);
        if ($user === null) {
            return redirect()->route('login');
        }

        $profile = $this->deserializeProfile($pending['profile']);

        try {
            $social->confirmLinkWithPassword($user, $profile, $request->string('password')->toString());
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors());
        }

        $request->session()->forget('pending_social_link');

        return $this->finishLogin($request, $user, 'auth.social_link_confirmed');
    }
}
