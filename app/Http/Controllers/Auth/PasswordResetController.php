<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Seo;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Inertia\Response;

class PasswordResetController extends Controller
{
    public function __construct(private readonly Seo $seo) {}

    public function requestForm(): Response
    {
        return $this->page('Auth/ForgotPassword', [], $this->seo->private('Восстановление пароля'));
    }

    public function sendLink(Request $request): RedirectResponse
    {
        $request->validate(['email' => 'required|email'], [
            'email.required' => 'Введите e-mail.',
            'email.email' => 'Некорректный e-mail.',
        ]);

        $status = Password::sendResetLink(['email' => strtolower($request->string('email')->toString())]);

        return $status === Password::RESET_LINK_SENT
            ? back()->with('success', 'Если аккаунт с таким e-mail существует, мы отправили ссылку для сброса пароля.')
            : back()->withErrors(['email' => 'Не удалось отправить письмо. Попробуйте позже.']);
    }

    public function resetForm(Request $request, string $token): Response
    {
        return $this->page('Auth/ResetPassword', [
            'token' => $token,
            'email' => $request->string('email')->toString(),
        ], $this->seo->private('Новый пароль'));
    }

    public function reset(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => ['required', 'confirmed', PasswordRule::min(8)->letters()->numbers()],
        ], [
            'password.confirmed' => 'Пароли не совпадают.',
        ]);

        $status = Password::reset(
            [
                'email' => strtolower($request->string('email')->toString()),
                'password' => $request->string('password')->toString(),
                'password_confirmation' => $request->string('password_confirmation')->toString(),
                'token' => $request->string('token')->toString(),
            ],
            function ($user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            },
        );

        return $status === Password::PASSWORD_RESET
            ? redirect()->route('login')->with('success', 'Пароль обновлён. Войдите с новым паролем.')
            : back()->withErrors(['email' => 'Ссылка недействительна или просрочена.']);
    }
}
