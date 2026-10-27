<?php

namespace App\Services\Organization;

use App\Models\Clinic;
use App\Models\Organization;
use App\Services\Audit;
use App\Services\Seo;
use App\Support\ClinicNotificationEvents;
use Illuminate\Support\Facades\DB;

/** Блокировка организации и связанных филиалов (кабинет и каталог). */
class OrganizationModerationService
{
    public function __construct(
        private readonly ClinicStaffNotifier $notifier,
    ) {}

    public function block(Organization $organization, ?string $note = null): void
    {
        DB::transaction(function () use ($organization, $note): void {
            $organization->update(['status' => 'blocked']);

            Clinic::query()
                ->where('organization_id', $organization->id)
                ->whereNotIn('status', ['blocked', 'draft'])
                ->update([
                    'status' => 'blocked',
                    'moderation_note' => $note,
                ]);
        });

        $this->notifier->notify(
            $organization,
            ClinicNotificationEvents::MODERATION,
            'organization_blocked',
            'Организация заблокирована',
            trim($note ?? 'Доступ в кабинет и публикация в каталоге приостановлены. Обратитесь в поддержку.'),
            '/clinic-cabinet',
        );

        Audit::log('organization.blocked', $organization, ['note' => $note]);
        Seo::flush();
    }

    public function unblock(Organization $organization): void
    {
        $organization->update(['status' => 'active']);

        $this->notifier->notify(
            $organization,
            ClinicNotificationEvents::MODERATION,
            'organization_unblocked',
            'Блокировка снята',
            'Доступ в кабинет восстановлен. Опубликуйте филиалы вручную, если они были заблокированы.',
            '/clinic-cabinet/branches',
        );

        Audit::log('organization.unblocked', $organization);
    }

    public function notifyClinicBlocked(Clinic $clinic, ?string $note = null): void
    {
        $organization = $clinic->organization;
        if ($organization === null) {
            return;
        }

        $this->notifier->notify(
            $organization,
            ClinicNotificationEvents::MODERATION,
            'clinic_blocked',
            'Филиал заблокирован',
            '«'.$clinic->name.'»: '.trim($note ?? 'Карточка снята с публикации.'),
            '/clinic-cabinet/branches?branch='.$clinic->id,
        );
    }
}
