<?php

namespace App\Http\Controllers;

use App\Models\StaffInvitation;
use App\Services\Organization\OrganizationStaffService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StaffInvitationController extends Controller
{
    public function show(string $token): Response|RedirectResponse
    {
        $invitation = StaffInvitation::query()->where('token', $token)->firstOrFail();
        if (! $invitation->isPending()) {
            return redirect()->route('login')->with('error', 'Ссылка приглашения недействительна или уже использована.');
        }

        return Inertia::render('Auth/AcceptStaffInvite', [
            'email' => $invitation->email,
            'phone' => $invitation->phone,
            'organization' => $invitation->organization?->name,
            'role' => $invitation->role,
            'token' => $token,
        ]);
    }

    public function accept(Request $request, string $token, OrganizationStaffService $staff): RedirectResponse
    {
        $user = $request->user();
        abort_unless($user, 403, 'Войдите в аккаунт, чтобы принять приглашение.');

        $invitation = StaffInvitation::query()->where('token', $token)->firstOrFail();
        $staff->acceptInvitation($invitation, $user);

        return redirect()->route('cabinet.dashboard')->with('success', 'Вы присоединились к организации «'.$invitation->organization?->name.'».');
    }
}
