<?php

namespace App\Http\Controllers;

use App\Models\Clinic;
use App\Rules\RussianPhone;
use App\Services\Monetization\ClinicTrialService;
use App\Services\Monetization\MonetizationSettings;
use App\Services\Organization\ClaimVerification;
use App\Services\Organization\ClinicClaimRequestService;
use App\Services\Organization\OrganizationClaimService;
use App\Services\Seo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

/**
 * «Это ваша клиника?» на странице карточки без владельца: вход, подтверждение e-mail,
 * затем SMS-код на номер из карточки (права сразу) или заявка с документом на проверку модератору.
 */
class ClinicClaimController extends Controller
{
    public function show(Request $request, string $slug, OrganizationClaimService $claims, ClaimVerification $verification, ClinicClaimRequestService $requests, ClinicTrialService $trials, MonetizationSettings $monetization, Seo $seo): Response|RedirectResponse
    {
        $clinic = $this->clinic($slug);
        $user = $request->user();
        $reason = $claims->reasonFor($clinic, $user);
        if ($reason !== null && ! $clinic->isClaimable()) {
            return redirect()->route('clinics.show', $clinic->slug)->with('error', 'У этой клиники уже есть представитель на сайте. Если это ошибка — напишите в поддержку.');
        }

        if ($user !== null && ! $user->hasVerifiedEmail()) {
            $request->session()->put('url.intended', route('clinics.claim.show', $clinic->slug));
        }
        $pending = $user ? $requests->pendingFor($clinic, $user) : null;
        $trialReason = $clinic->organization ? $trials->ineligibleReason($clinic->organization, $clinic) : null;

        return Inertia::render('Clinics/Claim', [
            'seo' => $seo->private('Это ваша клиника?'),
            'clinic' => [
                'name' => $clinic->name,
                'slug' => $clinic->slug,
                'address' => $clinic->address,
                'city' => $clinic->city?->name,
            ],
            'authenticated' => $user !== null,
            'email_verified' => (bool) $user?->hasVerifiedEmail(),
            'email' => $user?->email,
            'blocked_reason' => $user ? $reason : null,
            'register_url' => route('register.clinic', ['claim' => $clinic->slug]),
            'verify_url' => route('verification.notice'),
            'agreement_url' => $trials->agreementUrl(),
            'privacy_url' => url('/privacy'),
            'trial' => [
                'enabled' => $monetization->trialEnabled() && $trialReason === null,
                'days' => $monetization->trialDays(),
            ],
            'sms' => [
                'available' => $user !== null && $verification->required($clinic),
                'phone' => $verification->maskedPhone($clinic),
            ],
            'pending' => $pending ? [
                'submitted_at' => $pending->updated_at?->format('d.m.Y H:i'),
                'position' => $pending->position,
                'has_document' => (bool) $pending->document_path,
            ] : null,
        ]);
    }

    /** Заявка с документом — на проверку модератору. */
    public function store(Request $request, string $slug, ClinicClaimRequestService $requests): RedirectResponse
    {
        $clinic = $this->clinic($slug);
        $user = $request->user();
        $data = $request->validate([
            'position' => ['required', 'string', 'min:2', 'max:120'],
            'phone' => ['required', 'string', 'max:32', new RussianPhone],
            'comment' => ['nullable', 'string', 'max:1000'],
            'document' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:8192'],
            'authority' => ['accepted'],
            'agreement' => ['accepted'],
            'consent' => ['accepted'],
        ], [
            'position.required' => 'Укажите вашу должность в клинике.',
            'phone.required' => 'Укажите телефон для связи с модератором.',
            'document.required' => 'Приложите документ, подтверждающий ваши полномочия.',
            'document.mimes' => 'Допустимые форматы: PDF, JPG, PNG.',
            'document.max' => 'Размер файла — не более 8 МБ.',
            'authority.accepted' => 'Подтвердите, что уполномочены представлять клинику.',
            'agreement.accepted' => 'Нужно принять соглашение с клиникой.',
            'consent.accepted' => 'Необходимо согласие на обработку персональных данных.',
        ]);

        try {
            $requests->submit($clinic, $user, [
                'position' => trim($data['position']),
                'phone' => RussianPhone::normalize($data['phone']),
                'comment' => $data['comment'] ?? null,
            ], $request->file('document'));
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Заявка отправлена. Модератор проверит документ — обычно в течение рабочего дня — и мы сообщим о решении.');
    }

    public function sendCode(Request $request, string $slug, ClaimVerification $verification, OrganizationClaimService $claims): RedirectResponse
    {
        $clinic = $this->clinic($slug);
        abort_unless($verification->required($clinic), 404);
        if (($reason = $claims->reasonFor($clinic, $request->user())) !== null) {
            return back()->with('error', $reason);
        }

        try {
            $verification->send($clinic, $request->user());
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Код отправлен на номер клиники '.$verification->maskedPhone($clinic).'.');
    }

    /** Код из SMS на номер из карточки: права передаются сразу. */
    public function confirmSms(Request $request, string $slug, ClaimVerification $verification, ClinicClaimRequestService $requests): RedirectResponse
    {
        $clinic = $this->clinic($slug);
        abort_unless($verification->required($clinic), 404);
        $request->validate([
            'code' => ['required', 'string', 'max:10'],
            'authority' => ['accepted'],
            'agreement' => ['accepted'],
        ], [
            'code.required' => 'Введите код из SMS.',
            'authority.accepted' => 'Подтвердите, что уполномочены представлять клинику.',
            'agreement.accepted' => 'Нужно принять соглашение с клиникой.',
        ]);

        $user = $request->user();
        try {
            if (! $verification->verified($clinic, $user) && ! $verification->verify($clinic, $user, (string) $request->input('code'))) {
                return back()->withErrors(['code' => 'Неверный код из SMS.']);
            }
        } catch (RuntimeException $e) {
            return back()->withErrors(['code' => $e->getMessage()]);
        }

        $requests->claimBySms($clinic, $user);
        $request->session()->put('cabinet_branch', $clinic->id);

        return redirect()->route('cabinet.dashboard')->with('success', 'Готово: вы управляете карточкой клиники. Изменения публикуются после проверки модератором.');
    }

    private function clinic(string $slug): Clinic
    {
        return Clinic::query()->where('slug', $slug)->with(['organization', 'city'])->firstOrFail();
    }
}
