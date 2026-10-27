<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Offer;
use App\Models\Organization;
use App\Models\OrganizationStaff;
use App\Models\User;
use App\Rules\RussianPhone;
use App\Services\Audit;
use App\Services\Organization\OrganizationClaimService;
use App\Services\Seo;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class RegisterClinicController extends Controller
{
    public function create(Request $request, OrganizationClaimService $claims, Seo $seo): Response
    {
        $offerToken = (string) $request->query('offer', '');
        $offerPreview = null;
        if ($offerToken !== '') {
            $offer = Offer::findByToken($offerToken);
            if ($offer !== null) {
                $preview = $claims->preview($offer);
                $offerPreview = [
                    'token' => $offerToken,
                    'claimable' => $preview['claimable'],
                    'reason' => $preview['reason'],
                    'organization_name' => $preview['organization_name'],
                    'clinic_name' => $preview['clinic_name'],
                ];
            }
        }

        return Inertia::render('Auth/RegisterClinic', [
            'seo' => $seo->private('Регистрация клиники'),
            'offer' => $offerPreview,
        ]);
    }

    public function store(Request $request, OrganizationClaimService $claims): RedirectResponse
    {
        $rules = [
            'name' => ['required', 'string', 'min:2', 'max:80'],
            'email' => ['required', 'email', 'max:120', 'unique:users,email'],
            'phone' => ['nullable', 'string', 'max:32', new RussianPhone],
            'password' => ['required', 'confirmed', Password::min(8)->letters()->numbers()],
            'consent' => ['accepted'],
            'offer_token' => ['nullable', 'string', 'min:40', 'max:64'],
        ];

        if (! $request->filled('offer_token')) {
            $rules['organization_name'] = ['required', 'string', 'min:2', 'max:160'];
        }

        $data = $request->validate($rules);

        $user = new User([
            'name' => $data['name'],
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'password' => $data['password'],
            'consent_at' => now(),
            'consent_version' => '2026-10',
        ]);
        $user->forceFill(['role' => 'clinic_owner', 'status' => 'active'])->save();

        if (! empty($data['offer_token'])) {
            $offer = Offer::findByToken($data['offer_token']);
            abort_unless($offer, 404);
            // Клиника передаётся только после подтверждения email и принятия соглашения на странице подключения.
            event(new Registered($user));
            Auth::login($user);
            $request->session()->regenerate();
            $request->session()->put('url.intended', route('offer.claim.show', ['token' => $data['offer_token']]));
            Audit::log('auth.register_clinic_offer', $offer, ['user_id' => $user->id]);

            return redirect()->route('verification.notice')
                ->with('success', 'Аккаунт создан. Подтвердите e-mail — после этого вы вернётесь к подключению клиники.');
        }

        $organization = Organization::query()->create([
            'owner_id' => $user->id,
            'name' => $data['organization_name'],
            'status' => 'active',
        ]);

        OrganizationStaff::query()->create([
            'organization_id' => $organization->id,
            'user_id' => $user->id,
            'role' => OrganizationStaff::ROLE_OWNER,
            'invited_at' => now(),
        ]);

        event(new Registered($user));
        Auth::login($user);
        $request->session()->regenerate();
        Audit::log('auth.register_clinic', $organization, ['user_id' => $user->id]);

        return redirect()->route('cabinet.branches.create')->with('success', 'Организация создана. Добавьте первый филиал клиники.');
    }
}
