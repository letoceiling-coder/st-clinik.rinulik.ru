<?php

namespace App\Support;

final class Schedule
{
    public const DAYS = ['mon' => 'Пн', 'tue' => 'Вт', 'wed' => 'Ср', 'thu' => 'Чт', 'fri' => 'Пт', 'sat' => 'Сб', 'sun' => 'Вс'];

    private static function todayKey(): string
    {
        return array_keys(self::DAYS)[(int) now()->format('N') - 1];
    }

    public static function hours(?array $day): string
    {
        if (! $day) {
            return 'Выходной';
        }
        if (($day['open'] ?? null) === '00:00' && ($day['close'] ?? null) === '24:00') {
            return 'Круглосуточно';
        }

        return ($day['open'] ?? '').'–'.($day['close'] ?? '');
    }

    public static function today(?array $schedule, bool $is247 = false): string
    {
        if ($is247) {
            return 'Круглосуточно, без выходных';
        }
        if (! $schedule) {
            return 'График уточняйте по телефону';
        }
        $day = $schedule[self::todayKey()] ?? null;

        return $day ? 'Сегодня '.self::hours($day) : 'Сегодня выходной';
    }

    /** @return list<array{key:string,day:string,hours:string,today:bool}> */
    public static function week(?array $schedule): array
    {
        $today = self::todayKey();

        return collect(self::DAYS)->map(fn ($label, $key) => [
            'key' => $key,
            'day' => $label,
            'hours' => $schedule ? self::hours($schedule[$key] ?? null) : '—',
            'today' => $key === $today,
        ])->values()->all();
    }

    /** Для schema.org openingHoursSpecification. */
    public static function openingSpec(?array $schedule): array
    {
        if (! $schedule) {
            return [];
        }
        $names = ['mon' => 'Monday', 'tue' => 'Tuesday', 'wed' => 'Wednesday', 'thu' => 'Thursday', 'fri' => 'Friday', 'sat' => 'Saturday', 'sun' => 'Sunday'];
        $spec = [];
        foreach ($names as $key => $name) {
            $d = $schedule[$key] ?? null;
            if ($d) {
                $spec[] = ['@type' => 'OpeningHoursSpecification', 'dayOfWeek' => $name, 'opens' => $d['open'], 'closes' => $d['close'] === '24:00' ? '23:59' : $d['close']];
            }
        }

        return $spec;
    }
}
