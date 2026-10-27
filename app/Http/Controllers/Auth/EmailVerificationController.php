<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\Seo;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class EmailVerificationController extends Controller
{
    public function __construct(private readonly Seo $seo) {}

    public function notice(Request $request): Response|RedirectResponse
    {
        if ($request->user()?->hasVerifiedEmail()) {
            return redirect()->route('account.overview');
        }

        $user = $request->user();

        return $this->page('Auth/VerifyEmail', [
            'status' => $request->session()->get('status'),
            'email' => $user->email,
            'placeholder_email' => $user->usesPlaceholderEmail(),
        ], $this->seo->private('Подтверждение e-mail'));
    }

    public function verify(EmailVerificationRequest $request): RedirectResponse
    {
        $request->fulfill();

        return redirect()->route('account.overview')->with('success', 'E-mail подтверждён.');
    }

    public function send(Request $request): RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->route('account.overview');
        }

        $request->user()->sendEmailVerificationNotification();

        return back()->with('status', 'verification-link-sent');
    }
}
