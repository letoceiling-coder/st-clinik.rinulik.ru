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

/** Передача черновика из КП новому владельцу организации. */
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
        $org = $clinic->organization;

        return [
            'claimable' => $this->claimableReason($offer, $clinic, $org, null) === null,
            'reason' => $this->claimableReason($offer, $clinic, $org, null),
            'clinic_name' => $clinic->name,
            'organization_name' => $org?->name ?? $clinic->name,
        ];
    }

    public function claim(Offer $offer, User $user, ?Request $request = null): Organization
    {
        $clinic = $offer->clinic()->with('organization')->firstOrFail();
        $org = $clinic->organization;
        abort_unless($org, 404, 'Организация не найдена.');

        $reason = $this->claimableReason($offer, $clinic, $org, $user);
        abort_if($reason !== null, 422, $reason);

        $organization = DB::transaction(function () use ($offer, $user, $org, $clinic): Organization {
            if ($user->role !== 'clinic_owner') {
                $user->forceFill(['role' => 'clinic_owner'])->save();
            }

            $org->update([
                'owner_id' => $user->id,
                'status' => $org->status === 'blocked' ? 'blocked' : 'active',
            ]);

            OrganizationStaff::query()->updateOrCreate(
                ['organization_id' => $org->id, 'user_id' => $user->id],
                ['role' => OrganizationStaff::ROLE_OWNER, 'invited_at' => now(), 'revoked_at' => null],
            );

            $this->offerService->markConnected($offer, $user);
            Audit::log('offers.claimed', $offer, ['user_id' => $user->id, 'clinic_id' => $clinic->id]);

            return $org->fresh();
        });

        if ($request !== null) {
            $this->demoSession->leave($request);
            $request->session()->put('cabinet_branch', $clinic->id);
        }

        return $organization;
    }

    private function claimableReason(Offer $offer, Clinic $clinic, ?Organization $org, ?User $user): ?string
    {
        if (! $offer->isAvailable()) {
            return 'Срок действия предложения истёк.';
        }
        if ($offer->status === 'connected') {
            return 'Клиника уже подключена к платформе.';
        }
        if ($clinic->status !== 'draft') {
            return 'Подключение доступно только для черновика клиники.';
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
            if ($existing !== null && (int) $existing->id !== (int) $org->id) {
                return 'У вашего аккаунта уже привязана другая организация.';
            }
        }

        return null;
    }
}
