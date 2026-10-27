<?php

namespace App\Http\Controllers;

use App\Models\Offer;
use App\Services\Organization\OrganizationClaimService;
use App\Services\Seo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClaimOfferController extends Controller
{
    public function show(Request $request, string $token, OrganizationClaimService $claims, Seo $seo): Response|RedirectResponse
    {
        $offer = $this->offer($token);
        $preview = $claims->preview($offer);

        if (! $preview['claimable']) {
            return redirect()->to($offer->url())->with('error', $preview['reason']);
        }

        return Inertia::render('Offer/Claim', [
            'seo' => $seo->private('Подключение клиники'),
            'offer_token' => $token,
            'clinic_name' => $preview['clinic_name'],
            'organization_name' => $preview['organization_name'],
            'authenticated' => $request->user() !== null,
            'register_url' => route('register.clinic', ['offer' => $token]),
        ]);
    }

    public function store(Request $request, string $token, OrganizationClaimService $claims): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 403);

        $request->validate(['confirm' => ['accepted']], [
            'confirm.accepted' => 'Подтвердите, что вы уполномочены управлять этой клиникой.',
        ]);

        $offer = $this->offer($token);
        $claims->claim($offer, $user, $request);

        return redirect()->route('cabinet.dashboard')
            ->with('success', 'Черновик привязан к вашему аккаунту. Заполните профиль и отправьте его на модерацию.');
    }

    private function offer(string $token): Offer
    {
        $offer = Offer::findByToken($token);
        abort_unless($offer, 404);

        return $offer;
    }
}
