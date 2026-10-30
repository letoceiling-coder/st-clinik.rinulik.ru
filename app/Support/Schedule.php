<?php

namespace App\Support;

use Carbon\CarbonImmutable;

final class Schedule
{
    public const DAYS = ['mon' => 'Пн', 'tue' => 'Вт', 'wed' => 'Ср', 'thu' => 'Чт', 'fri' => 'Пт', 'sat' => 'Сб', 'sun' => 'Вс'];

    private static function todayKey(): string
    {
        return array_keys(self::DAYS)[(int) now()->format('N') - 1];
    }

    public static function weekdayKey(\DateTimeInterface $date): string
    {
        return array_keys(self::DAYS)[(int) $date->format('N') - 1];
    }

    public static function timeToMinutes(string $time): int
    {
        if ($time === '24:00') {
            return 24 * 60;
        }

        [$hours, $minutes] = array_map('intval', explode(':', $time));

        return $hours * 60 + $minutes;
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

    /**
     * «Открыто до 21:00», «Закроется в 21:00», «Закрыто · откроется завтра в 09:00».
     * null — график не заполнен.
     *
     * @return array{open: bool, closing_soon: bool, label: string}|null
     */
    public static function openState(?array $schedule, bool $is247 = false, ?\DateTimeInterface $at = null): ?array
    {
        if ($is247) {
            return ['open' => true, 'closing_soon' => false, 'label' => 'Открыто круглосуточно'];
        }
        if (! $schedule) {
            return null;
        }

        $now = CarbonImmutable::instance($at ?? now())->timezone(config('app.timezone'));
        $minutes = $now->hour * 60 + $now->minute;
        $today = $schedule[self::weekdayKey($now)] ?? null;

        if ($today && isset($today['open'], $today['close'])) {
            $open = self::timeToMinutes($today['open']);
            $close = self::timeToMinutes($today['close']);
            if ($minutes >= $open && $minutes < $close) {
                $soon = $close - $minutes <= 60 && $close < 24 * 60;

                return ['open' => true, 'closing_soon' => $soon, 'label' => ($soon ? 'Закроется в ' : 'Открыто до ').$today['close']];
            }
            if ($minutes < $open) {
                return ['open' => false, 'closing_soon' => false, 'label' => 'Закрыто · откроется в '.$today['open']];
            }
        }

        $names = ['mon' => 'в пн', 'tue' => 'во вт', 'wed' => 'в ср', 'thu' => 'в чт', 'fri' => 'в пт', 'sat' => 'в сб', 'sun' => 'в вс'];
        for ($i = 1; $i <= 7; $i++) {
            $day = $now->addDays($i);
            $key = self::weekdayKey($day);
            if (! empty($schedule[$key]['open'])) {
                $when = $i === 1 ? 'завтра' : $names[$key];

                return ['open' => false, 'closing_soon' => false, 'label' => "Закрыто · откроется {$when} в {$schedule[$key]['open']}"];
            }
        }

        return ['open' => false, 'closing_soon' => false, 'label' => 'Закрыто'];
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
