<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/** Временный публичный вход в кабинет/админку под демо-пользователями. */
class DemoAccessController extends Controller
{
    public function cabinet(Request $request): RedirectResponse
    {
        return $this->enter($request, 'cabinet');
    }

    public function admin(Request $request): RedirectResponse
    {
        return $this->enter($request, 'admin');
    }

    private function enter(Request $request, string $persona): RedirectResponse
    {
        abort_unless(config('demo.enabled'), 404);

        /** @var array{email: string, redirect: string, label: string}|null $demo */
        $demo = config("demo.personas.{$persona}");
        abort_unless(is_array($demo) && isset($demo['email'], $demo['redirect']), 404);

        $user = User::query()
            ->where('email', strtolower($demo['email']))
            ->where('status', 'active')
            ->first();

        abort_unless($user, 503, 'Демо-доступ временно недоступен. Обратитесь к разработчику.');

        Auth::login($user);
        $request->session()->regenerate();
        $request->session()->put('demo_mode', $persona);

        return redirect()->route($demo['redirect']);
    }
}
