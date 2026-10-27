<?php

namespace App\Services\Organization;

use App\Models\Organization;
use App\Models\OrganizationStaff;
use App\Models\StaffInvitation;
use App\Models\User;
use App\Notifications\StaffInvitationNotification;
use App\Services\Offers\SmsSender;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class OrganizationStaffService
{
    public function organizationFor(User $user): ?Organization
    {
        if ($user->role === 'clinic_owner') {
            return $user->organization;
        }

        $staff = OrganizationStaff::query()
            ->where('user_id', $user->id)
            ->whereNull('revoked_at')
            ->with('organization')
            ->first();

        return $staff?->organization;
    }

    public function roleFor(User $user, Organization $organization): ?string
    {
        if ($user->role === 'clinic_owner' && (int) $organization->owner_id === (int) $user->id) {
            return OrganizationStaff::ROLE_OWNER;
        }

        return OrganizationStaff::query()
            ->where('organization_id', $organization->id)
            ->where('user_id', $user->id)
            ->whereNull('revoked_at')
            ->value('role');
    }

    public function canAccessCabinet(User $user, Organization $organization): bool
    {
        return $this->roleFor($user, $organization) !== null;
    }

    public function canManageStaff(User $user, Organization $organization): bool
    {
        return in_array($this->roleFor($user, $organization), [
            OrganizationStaff::ROLE_OWNER,
            OrganizationStaff::ROLE_ADMIN,
        ], true);
    }

    public function invite(Organization $organization, User $inviter, ?string $email, ?string $phone, string $role): StaffInvitation
    {
        abort_unless($this->canManageStaff($inviter, $organization), 403);
        abort_if(! array_key_exists($role, OrganizationStaff::ROLES) || $role === OrganizationStaff::ROLE_OWNER, 422, 'Недопустимая роль.');

        $email = filled($email) ? strtolower(trim($email)) : null;
        $phone = filled($phone) ? $this->normalizePhone($phone) : null;

        if ($email === null && $phone === null) {
            throw ValidationException::withMessages([
                'email' => 'Укажите e-mail или телефон.',
            ]);
        }

        $invitation = StaffInvitation::query()->create([
            'organization_id' => $organization->id,
            'invited_by' => $inviter->id,
            'email' => $email,
            'phone' => $phone,
            'role' => $role,
            'token' => Str::random(48),
            'expires_at' => now()->addDays(7),
        ]);

        if ($email !== null) {
            Notification::route('mail', $email)->notify(new StaffInvitationNotification($invitation));
        }

        if ($phone !== null) {
            $this->sendPhoneInvitation($invitation);
        }

        return $invitation;
    }

    public function phoneInvitationSentViaSms(): bool
    {
        return app(SmsSender::class)->configured();
    }

    public function acceptInvitation(StaffInvitation $invitation, User $user): OrganizationStaff
    {
        abort_unless($invitation->isPending(), 422, 'Приглашение недействительно.');
        if ($invitation->email) {
            abort_if(strcasecmp($invitation->email, (string) $user->email) !== 0, 403, 'E-mail не совпадает с приглашением.');
        }

        if ($invitation->phone) {
            abort_if($this->normalizePhone((string) $user->phone) !== $invitation->phone, 403, 'Телефон аккаунта не совпадает с приглашением.');
        }

        return DB::transaction(function () use ($invitation, $user): OrganizationStaff {
            $invitation->update(['accepted_at' => now(), 'accepted_user_id' => $user->id]);

            return OrganizationStaff::query()->updateOrCreate(
                ['organization_id' => $invitation->organization_id, 'user_id' => $user->id],
                ['role' => $invitation->role, 'invited_at' => now(), 'revoked_at' => null],
            );
        });
    }

    public function revoke(Organization $organization, User $actor, OrganizationStaff $staff): void
    {
        abort_unless($this->canManageStaff($actor, $organization), 403);
        abort_if($staff->role === OrganizationStaff::ROLE_OWNER, 422, 'Нельзя отозвать доступ владельца.');
        abort_unless((int) $staff->organization_id === (int) $organization->id, 404);

        $staff->update(['revoked_at' => now()]);
    }

    private function sendPhoneInvitation(StaffInvitation $invitation): void
    {
        $sms = app(SmsSender::class);
        if (! $sms->configured()) {
            return;
        }

        $org = $invitation->organization?->name ?? 'клиника';
        $role = OrganizationStaff::ROLES[$invitation->role] ?? $invitation->role;
        $url = url('/invite/staff/'.$invitation->token);
        $sms->send((string) $invitation->phone, "Приглашение в кабинет «{$org}» ({$role}): {$url}");
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';
        if (strlen($digits) === 11 && str_starts_with($digits, '8')) {
            $digits = '7'.substr($digits, 1);
        }
        if (strlen($digits) === 10 && str_starts_with($digits, '9')) {
            $digits = '7'.$digits;
        }

        return '+'.$digits;
    }
}
