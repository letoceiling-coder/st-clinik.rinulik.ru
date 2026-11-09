<?php

namespace App\Services\Organization;

use App\Models\Clinic;
use App\Models\Offer;
use App\Models\Organization;
use App\Models\OrganizationStaff;
use App\Models\User;
use App\Services\Audit;
use App\Services\Offers\DemoSession;
use App\Services\Offers\OfferService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Передача карточки без владельца (черновика или опубликованной) новому владельцу организации — по КП или одобренной заявке. */
class OrganizationClaimService
{
    public function __construct(
        private readonly OrganizationStaffService $staffService,
        private readonly OfferService $offerService,
        private readonly DemoSession $demoSession,
    ) {}

    /**
     * @return array{claimable: bool, reason: string|null, clinic_name: string, organization_name: string}
     */
    public function preview(Offer $offer): array
    {
        $clinic = $offer->clinic()->with('organization')->firstOrFail();
        $reason = $this->offerReason($offer) ?? $this->clinicReason($clinic, $clinic->organization, null);

        return [
            'claimable' => $reason === null,
            'reason' => $reason,
            'clinic_name' => $clinic->name,
            'organization_name' => $clinic->organization?->name ?? $clinic->name,
        ];
    }

    /** Подключение по КП. */
    public function claim(Offer $offer, User $user, ?Request $request = null): Organization
    {
        $clinic = $offer->clinic()->with('organization')->firstOrFail();
        $organization = $this->transfer($clinic, $user, $offer);

        if ($request !== null) {
            $this->demoSession->leave($request);
            $request->session()->put('cabinet_branch', $clinic->id);
        }

        return $organization;
    }

    /** Передача по одобренной модератором заявке «Это ваша клиника?». */
    public function claimClinic(Clinic $clinic, User $user): Organization
    {
        return $this->transfer($clinic->loadMissing('organization'), $user, null);
    }

    /** Почему карточку нельзя передать этому пользователю (или вообще), либо null. */
    public function reasonFor(Clinic $clinic, ?User $user): ?string
    {
        return $this->clinicReason($clinic, $clinic->loadMissing('organization')->organization, $user);
    }

    private function transfer(Clinic $clinic, User $user, ?Offer $offer): Organization
    {
        $org = $clinic->organization;
        abort_unless($org, 404, 'Организация не найдена.');

        $reason = ($offer ? $this->offerReason($offer) : null) ?? $this->clinicReason($clinic, $org, $user);
        abort_if($reason !== null, 422, $reason);

        return DB::transaction(function () use ($offer, $user, $org, $clinic): Organization {
            // Две одновременные попытки забрать одну карточку: вторая увидит уже назначенного владельца.
            $org = Organization::query()->lockForUpdate()->findOrFail($org->id);
            if ($offer !== null) {
                $offer = Offer::query()->lockForUpdate()->findOrFail($offer->id);
            }
            $reason = ($offer ? $this->offerReason($offer) : null) ?? $this->clinicReason($clinic, $org, $user);
            abort_if($reason !== null, 422, $reason);

            if ($user->role !== 'clinic_owner') {
                $user->forceFill(['role' => 'clinic_owner'])->save();
            }

            // У заявителя уже своя организация (зарегистрировался сам или это сеть): карточка становится её филиалом.
            $own = $this->staffService->organizationFor($user);
            if ($own !== null && (int) $own->id !== (int) $org->id) {
                $clinic->forceFill(['organization_id' => $own->id])->save();
                $this->logTransfer($offer, $clinic, $user);
                if ($offer !== null) {
                    $this->offerService->markConnected($offer, $user);
                }

                return $own->fresh();
            }

            $org->update([
                'owner_id' => $user->id,
                'status' => $org->status === 'blocked' ? 'blocked' : 'active',
            ]);

            OrganizationStaff::query()->updateOrCreate(
                ['organization_id' => $org->id, 'user_id' => $user->id],
                ['role' => OrganizationStaff::ROLE_OWNER, 'invited_at' => now(), 'revoked_at' => null],
            );

            if ($offer !== null) {
                $this->offerService->markConnected($offer, $user);
            }
            $this->logTransfer($offer, $clinic, $user);

            return $org->fresh();
        });
    }

    private function logTransfer(?Offer $offer, Clinic $clinic, User $user): void
    {
        $offer !== null
            ? Audit::log('offers.claimed', $offer, ['user_id' => $user->id, 'clinic_id' => $clinic->id])
            : Audit::log('clinic.claimed', $clinic, ['user_id' => $user->id]);
    }

    private function offerReason(Offer $offer): ?string
    {
        if (! $offer->isAvailable()) {
            return 'Срок действия предложения истёк.';
        }
        if ($offer->status === 'connected') {
            return 'Клиника уже подключена к платформе.';
        }

        return null;
    }

    private function clinicReason(Clinic $clinic, ?Organization $org, ?User $user): ?string
    {
        if (! in_array($clinic->status, Clinic::CLAIMABLE_STATUSES, true)) {
            return 'Эту карточку сейчас нельзя подключить: '.mb_strtolower(Clinic::STATUS_LABELS[$clinic->status] ?? $clinic->status).'.';
        }
        if ($org === null) {
            return 'У клиники нет организации.';
        }
        if ($org->owner_id !== null) {
            if ($user !== null && (int) $org->owner_id === (int) $user->id) {
                return null;
            }

            return 'У этой организации уже есть владелец.';
        }
        if ($user !== null) {
            $existing = $this->staffService->organizationFor($user);
            // Филиал в свою организацию добавляет только её владелец, не сотрудник.
            if ($existing !== null && (int) $existing->id !== (int) $org->id && (int) $existing->owner_id !== (int) $user->id) {
                return 'Забрать карточку может только владелец вашей организации в кабинете.';
            }
        }

        return null;
    }
}
