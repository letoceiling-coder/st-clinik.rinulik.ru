<?php

namespace App\Support;

/** События уведомлений для сотрудников клиники (кабинет). */
final class ClinicNotificationEvents
{
    public const LEAD_NEW = 'clinic.lead.new';

    public const APPOINTMENT = 'clinic.appointment';

    public const MODERATION = 'clinic.moderation';

    public const REVIEW = 'clinic.review';

    /** @return list<string> */
    public static function all(): array
    {
        return [
            self::LEAD_NEW,
            self::APPOINTMENT,
            self::MODERATION,
            self::REVIEW,
        ];
    }

    public static function label(string $key): string
    {
        return match ($key) {
            self::LEAD_NEW => 'Новые заявки и лиды ассистента',
            self::APPOINTMENT => 'Онлайн-запись и изменения записей',
            self::MODERATION => 'Модерация филиала и документов',
            self::REVIEW => 'Отзывы и жалобы',
            default => $key,
        };
    }
}
