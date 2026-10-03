<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\Audit;
use App\Services\Seo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;
use Inertia\Response;

class AuthController extends Controller
{
    public function showLogin(Seo $seo): Response
    {
        return $this->page('Auth/Login', [], $seo->private('Вход'));
    }

    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ], ['email.required' => 'Введите e-mail.', 'email.email' => 'Некорректный e-mail.', 'password.required' => 'Введите пароль.']);

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            return back()->withErrors(['email' => 'Неверный e-mail или пароль.'])->onlyInput('email');
        }

        $user = $request->user();
        if (! $user->isActive()) {
            Auth::logout();

            return back()->withErrors(['email' => 'Учётная запись заблокирована. Обратитесь в поддержку.']);
        }

        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()])->save();
        Audit::log('auth.login', $user);

        return redirect()->intended($this->home($user));
    }

    public function showRegister(Seo $seo): Response
    {
        return $this->page('Auth/Register', [], $seo->private('Регистрация'));
    }

    public function register(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['required', 'email', 'max:120', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'regex:/^\+?[0-9\s\-\(\)]{10,18}$/'],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
            'consent' => ['accepted'],
        ], [
            'name.required' => 'Введите имя.',
            'email.required' => 'Введите e-mail.',
            'email.unique' => 'Этот e-mail уже зарегистрирован.',
            'phone.regex' => 'Введите телефон в формате +7 (900) 000-00-00.',
            'password.confirmed' => 'Пароли не совпадают.',
            'password.min' => 'Пароль — не менее 8 символов.',
            'consent.accepted' => 'Необходимо согласие на обработку персональных данных.',
        ]);

        $user = new User([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => $data['password'],
            'city_id' => $this->city()->id,
            'consent_at' => now(),
            'consent_version' => '2026-10',
        ]);
        $user->forceFill(['role' => 'user', 'status' => 'active'])->save();

        Auth::login($user);
        $request->session()->regenerate();
        Audit::log('auth.register', $user);

        return redirect()->intended($this->home($user))->with('success', 'Добро пожаловать в '.config('app.name').'!');
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    private function home(User $user): string
    {
        return match (true) {
            $user->role === 'clinic_owner' => route('cabinet.dashboard'),
            $user->hasAnyAdminPermission() => route('admin.dashboard'),
            default => route('account.overview'),
        };
    }
}
