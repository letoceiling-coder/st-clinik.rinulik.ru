<?php

namespace App\Services\Organization;

use App\Models\Organization;
use App\Models\OrganizationStaff;
use App\Models\User;
use App\Models\UserNotification;
use App\Notifications\ClinicStaffAlertNotification;
use App\Services\Notifications\NotificationPreferenceService;
use App\Support\ClinicNotificationEvents;

/** Уведомления активным сотрудникам организации: в кабинете и во внешних каналах (почта, MAX, push) по их настройкам. */
class ClinicStaffNotifier
{
    public function __construct(
        private readonly NotificationPreferenceService $preferences,
    ) {}

    /**
     * @param  list<string>|null  $roles  Ограничение по ролям (null — все активные сотрудники).
     */
    public function notify(
        Organization $organization,
        string $eventKey,
        string $type,
        string $title,
        string $body,
        string $url,
        ?array $roles = null,
    ): void {
        abort_unless(in_array($eventKey, ClinicNotificationEvents::all(), true), 422);

        $staffUsers = OrganizationStaff::query()
            ->where('organization_id', $organization->id)
            ->whereNull('revoked_at')
            ->when($roles !== null, fn ($q) => $q->whereIn('role', $roles))
            ->with('user')
            ->get()
            ->pluck('user')
            ->filter(fn (?User $user) => $user instanceof User);

        $owner = $organization->owner;
        if ($owner instanceof User && ($roles === null || in_array(OrganizationStaff::ROLE_OWNER, $roles, true))) {
            $staffUsers = $staffUsers->push($owner);
        }

        $staffUsers->unique('id')->each(function (User $user) use ($eventKey, $type, $title, $body, $url): void {
            if ($this->preferences->allows($user, $eventKey, 'in_app')) {
                UserNotification::query()->create([
                    'user_id' => $user->id,
                    'type' => $type,
                    'title' => $title,
                    'body' => trim($body),
                    'url' => $url,
                ]);
            }

            // Внешние каналы (почта, MAX, push) — по настройкам сотрудника; раньше они не доставлялись.
            $user->notify(new ClinicStaffAlertNotification($eventKey, $title, trim($body), $url));
        });
    }
}
