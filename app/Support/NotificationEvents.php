<?php

namespace App\Support;

final class NotificationEvents
{
    public const APPOINTMENT_CREATED = 'appointment.created';

    public const APPOINTMENT_CONFIRMED = 'appointment.confirmed';

    public const APPOINTMENT_RESCHEDULED = 'appointment.rescheduled';

    public const APPOINTMENT_CANCELLED = 'appointment.cancelled';

    public const APPOINTMENT_REMINDER_24H = 'appointment.reminder_24h';

    public const APPOINTMENT_REMINDER_2H = 'appointment.reminder_2h';

    public const PLATFORM_MARKETING = 'platform.marketing';

    /** @return list<string> */
    public static function all(): array
    {
        return [
            self::APPOINTMENT_CREATED,
            self::APPOINTMENT_CONFIRMED,
            self::APPOINTMENT_RESCHEDULED,
            self::APPOINTMENT_CANCELLED,
            self::APPOINTMENT_REMINDER_24H,
            self::APPOINTMENT_REMINDER_2H,
            self::PLATFORM_MARKETING,
        ];
    }

    public static function label(string $key): string
    {
        return match ($key) {
            self::APPOINTMENT_CREATED => 'Запись создана',
            self::APPOINTMENT_CONFIRMED => 'Запись подтверждена',
            self::APPOINTMENT_RESCHEDULED => 'Запись перенесена',
            self::APPOINTMENT_CANCELLED => 'Запись отменена',
            self::APPOINTMENT_REMINDER_24H => 'Напоминание за 24 часа',
            self::APPOINTMENT_REMINDER_2H => 'Напоминание за 2 часа',
            self::PLATFORM_MARKETING => 'Новости и акции платформы',
            default => $key,
        };
    }

    public static function forAppointmentTransition(?string $from, string $to): ?string
    {
        if ($from === null && $to === 'new') {
            return self::APPOINTMENT_CREATED;
        }

        return match ($to) {
            'confirmed' => self::APPOINTMENT_CONFIRMED,
            'rescheduled' => self::APPOINTMENT_RESCHEDULED,
            'cancelled' => self::APPOINTMENT_CANCELLED,
            default => null,
        };
    }
}
