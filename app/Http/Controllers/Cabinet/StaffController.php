<?php

namespace App\Http\Controllers\Cabinet;

use App\Models\OrganizationStaff;
use App\Models\StaffInvitation;
use App\Services\Organization\OrganizationStaffService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Response;

class StaffController extends CabinetController
{
    public function index(Request $request, OrganizationStaffService $staffService): Response
    {
        $org = $request->attributes->get('org');

        $members = OrganizationStaff::query()
            ->where('organization_id', $org->id)
            ->whereNull('revoked_at')
            ->with('user:id,name,email')
            ->get()
            ->map(fn (OrganizationStaff $s) => [
                'id' => $s->id,
                'role' => $s->role,
                'role_label' => OrganizationStaff::ROLES[$s->role] ?? $s->role,
                'name' => $s->user?->name,
                'email' => $s->user?->email,
            ]);

        $invitations = StaffInvitation::query()
            ->where('organization_id', $org->id)
            ->whereNull('accepted_at')
            ->where('expires_at', '>', now())
            ->latest()
            ->get()
            ->map(fn (StaffInvitation $i) => [
                'id' => $i->id,
                'email' => $i->email,
                'phone' => $i->phone,
                'role' => $i->role,
                'role_label' => OrganizationStaff::ROLES[$i->role] ?? $i->role,
                'expires_at' => $i->expires_at->format('d.m.Y'),
            ]);

        return $this->render($request, 'Cabinet/Staff', 'Сотрудники', [
            'members' => $members,
            'invitations' => $invitations,
            'roles' => collect(OrganizationStaff::ROLES)->except(OrganizationStaff::ROLE_OWNER)->all(),
            'can_manage' => $staffService->canManageStaff($request->user(), $org),
            'sms_invites_enabled' => $staffService->phoneInvitationSentViaSms(),
        ]);
    }

    public function invite(Request $request, OrganizationStaffService $staffService): RedirectResponse
    {
        $org = $request->attributes->get('org');
        $data = $request->validate([
            'email' => ['required', 'email', 'max:120'],
            'role' => ['required', Rule::in(array_keys(OrganizationStaff::ROLES))],
        ]);

        $invitation = $staffService->invite($org, $request->user(), $data['email'], $data['role']);

        return back()->with('success', 'Приглашение отправлено на '.$invitation->email.'.');
    }

    public function revoke(Request $request, OrganizationStaff $staffMember, OrganizationStaffService $staffService): RedirectResponse
    {
        $org = $request->attributes->get('org');
        $staffService->revoke($org, $request->user(), $staffMember);

        return back()->with('success', 'Доступ сотрудника отозван.');
    }
}
