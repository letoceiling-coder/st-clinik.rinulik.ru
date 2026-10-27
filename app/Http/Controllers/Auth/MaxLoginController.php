<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Auth\Concerns\HandlesSocialLogin;
use App\Http\Controllers\Controller;
use App\Services\Auth\MaxLoginService;
use App\Services\Auth\SocialAuthService;
use App\Services\Seo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class MaxLoginController extends Controller
{
    use HandlesSocialLogin;

    public function __construct(private readonly Seo $seo) {}

    public function start(Request $request, MaxLoginService $max): Response|RedirectResponse
    {
        abort_unless($max->isEnabled(), 404);

        $session = $max->start();

        return $this->page('Auth/MaxLogin', [
            'code' => $session['code'],
            'bot_url' => $session['bot_url'],
            'expires_in' => $session['expires_in'],
        ], $this->seo->private('Вход через MAX'));
    }

    public function status(string $code, MaxLoginService $max): JsonResponse
    {
        abort_unless($max->isEnabled(), 404);

        $payload = $max->status($code);

        return response()->json([
            'status' => $payload['status'],
            'complete_url' => $payload['complete_url'] ?? null,
        ]);
    }

    public function complete(Request $request, string $code, MaxLoginService $max, SocialAuthService $social): RedirectResponse
    {
        abort_unless($max->isEnabled(), 404);
        if (! $request->hasValidSignature()) {
            abort(403);
        }

        $profile = $max->consume($code);
        if ($profile === null) {
            return redirect()->route('login')->withErrors(['email' => 'Код входа MAX просрочен или уже использован.']);
        }

        $result = $social->resolveLogin($profile, $request->user());
        if ($result['action'] === 'link_prompt' && isset($result['user'])) {
            return $this->handleSocialResult($request, $social, $result, $profile);
        }

        if (! isset($result['user'])) {
            return redirect()->route('login')->withErrors(['email' => 'Не удалось выполнить вход через MAX.']);
        }

        return $this->finishLogin($request, $result['user'], 'auth.max_login');
    }
}
