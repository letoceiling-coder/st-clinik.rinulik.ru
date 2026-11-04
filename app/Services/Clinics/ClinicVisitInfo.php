<?php

namespace App\Services\Clinics;

use App\Models\Clinic;
use App\Services\Leads\LeadResponseStats;
use App\Services\SlotAvailabilityService;
use Carbon\CarbonImmutable;

/**
 * Для пациента на странице клиники: когда можно прийти и как быстро клиника перезванивает.
 */
class ClinicVisitInfo
{
    /** Сколько дней вперёд ищем свободное окно. */
    private const SEARCH_DAYS = 7;

    public function __construct(
        private readonly SlotAvailabilityService $slots,
        private readonly LeadResponseStats $responses,
    ) {}

    /** @return array{next_slot: ?array{date: string, time: string, label: string}, response: ?string} */
    public function forClinic(Clinic $clinic): array
    {
        return [
            'next_slot' => $this->nextSlot($clinic),
            'response' => $this->response($clinic),
        ];
    }

    /** @return array{date: string, time: string, label: string}|null */
    private function nextSlot(Clinic $clinic): ?array
    {
        if (empty($clinic->schedule) && ! $clinic->is_24_7) {
            return null;
        }

        $today = CarbonImmutable::today();
        for ($i = 0; $i < self::SEARCH_DAYS; $i++) {
            $date = $today->addDays($i);
            $daySlots = $this->slots->slotsForDay($clinic, null, null, $date);
            if ($daySlots === []) {
                continue;
            }
            $time = (string) $daySlots[0]['time'];
            $day = match ($i) {
                0 => 'Сегодня',
                1 => 'Завтра',
                default => mb_convert_case($date->locale('ru')->translatedFormat('D, j M'), MB_CASE_TITLE),
            };

            return ['date' => $date->toDateString(), 'time' => $time, 'label' => "{$day} в {$time}"];
        }

        return null;
    }

    /** «Перезванивают в среднем за 12 мин» — только при честной выборке. */
    private function response(Clinic $clinic): ?string
    {
        $stats = $this->responses->forClinic($clinic->id);
        if (! $stats['reliable'] || $stats['median_minutes'] === null) {
            return null;
        }

        return 'Перезванивают в среднем за '.LeadResponseStats::humanize($stats['median_minutes']);
    }
}
