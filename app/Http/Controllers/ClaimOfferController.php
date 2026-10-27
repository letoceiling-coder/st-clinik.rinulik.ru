<?php

namespace App\Http\Controllers;

use App\Models\Offer;
use App\Services\Monetization\ClinicTrialService;
use App\Services\Monetization\MonetizationSettings;
use App\Services\Organization\ClaimVerification;
use App\Services\Organization\OrganizationClaimService;
use App\Services\Seo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

/**
 * Подключение клиники по КП: вход, подтверждение email (и SMS-код, если доступен), принятие соглашения
 * и согласие на публикацию. Клиника уходит на модерацию, пробный период включается после одобрения.
 */
class ClaimOfferController extends Controller
{
    public function show(Request $request, string $token, OrganizationClaimService $claims, ClaimVerification $verification, ClinicTrialService $trials, MonetizationSettings $monetization, Seo $seo): Response|RedirectResponse
    {
        $offer = $this->offer($token);
        $preview = $claims->preview($offer);

        if (! $preview['claimable']) {
            return redirect()->to($offer->url())->with('error', $preview['reason']);
        }
        $user = $request->user();
        $offer->loadMissing('clinic.organization');
        $trialReason = $offer->clinic->organization ? $trials->ineligibleReason($offer->clinic->organization, $offer->clinic) : null;

        if ($user !== null && ! $user->hasVerifiedEmail()) {
            $request->session()->put('url.intended', route('offer.claim.show', ['token' => $token]));
        }

        return Inertia::render('Offer/Claim', [
            'seo' => $seo->private('Подключение клиники'),
            'offer_token' => $token,
            'clinic_name' => $preview['clinic_name'],
            'organization_name' => $preview['organization_name'],
            'authenticated' => $user !== null,
            'email_verified' => (bool) $user?->hasVerifiedEmail(),
            'email' => $user?->email,
            'register_url' => route('register.clinic', ['offer' => $token]),
            'verify_url' => route('verification.notice'),
            'agreement_url' => $trials->agreementUrl(),
            'trial' => [
                'enabled' => $monetization->trialEnabled() && $trialReason === null,
                'days' => $monetization->trialDays(),
                'reason' => $monetization->trialEnabled() ? $trialReason : null,
            ],
            'sms' => [
                'required' => $user !== null && $verification->required($offer),
                'phone' => $verification->maskedPhone($offer),
                'verified' => $user !== null && $verification->verified($offer, $user),
            ],
        ]);
    }

    /** Отправить SMS-код на мобильный номер клиники из карточки. */
    public function sendCode(Request $request, string $token, ClaimVerification $verification): RedirectResponse
    {
        $offer = $this->offer($token);
        abort_unless($verification->required($offer), 404);

        try {
            $verification->send($offer, $request->user());
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Код отправлен на номер клиники '.$verification->maskedPhone($offer).'.');
    }

    public function store(Request $request, string $token, OrganizationClaimService $claims, ClaimVerification $verification, ClinicTrialService $trials): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 403);

        $request->validate([
            'confirm' => ['accepted'],
            'agreement' => ['accepted'],
            'publish' => ['accepted'],
            'code' => ['nullable', 'string', 'max:10'],
        ], [
            'confirm.accepted' => 'Подтвердите, что вы уполномочены управлять этой клиникой.',
            'agreement.accepted' => 'Нужно принять соглашение с клиникой.',
            'publish.accepted' => 'Нужно согласие на публикацию карточки после проверки.',
        ]);

        if (! $user->hasVerifiedEmail()) {
            $request->session()->put('url.intended', route('offer.claim.show', ['token' => $token]));

            return redirect()->route('verification.notice')->with('error', 'Сначала подтвердите e-mail — так мы убедимся, что доступ к кабинету получите именно вы.');
        }

        $offer = $this->offer($token);
        if ($verification->required($offer) && ! $verification->verified($offer, $user)) {
            try {
                if (! $request->filled('code') || ! $verification->verify($offer, $user, (string) $request->input('code'))) {
                    return back()->withErrors(['code' => 'Неверный код из SMS.']);
                }
            } catch (RuntimeException $e) {
                return back()->withErrors(['code' => $e->getMessage()]);
            }
        }

        $organization = $claims->claim($offer, $user, $request);
        $trial = $trials->request($organization, $offer->clinic->fresh(), $user, $request);

        return redirect()->route('cabinet.dashboard')->with('success', $trial
            ? 'Клиника подключена и отправлена на проверку. Пробный период начнётся сразу после одобрения модератором.'
            : 'Клиника подключена и отправлена на проверку. После одобрения опубликуйте карточку в кабинете.');
    }

    private function offer(string $token): Offer
    {
        $offer = Offer::findByToken($token);
        abort_unless($offer, 404);

        return $offer;
    }
}
