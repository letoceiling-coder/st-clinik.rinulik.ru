<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Support\Schedule;
use Carbon\Carbon;

class SameDayAvailabilityService
{
    private const SLOT_MINUTES = 30;

    public function hasAvailableSlotToday(Clinic $clinic): bool
    {
        if (! $clinic->same_day) {
            return false;
        }

        $today = now()->startOfDay();
        $schedule = $this->daySchedule($clinic, $today);
        if ($schedule === null) {
            return false;
        }

        [$openMinutes, $closeMinutes] = $schedule;
        $earliest = $this->earliestBookableMinute($openMinutes, $closeMinutes);
        if ($earliest === null) {
            return false;
        }

        $busy = Appointment::query()
            ->where('clinic_id', $clinic->id)
            ->whereDate('starts_at', $today)
            ->whereIn('status', Appointment::ACTIVE)
            ->get(['starts_at', 'ends_at']);

        for ($start = $earliest; $start + self::SLOT_MINUTES <= $closeMinutes; $start += self::SLOT_MINUTES) {
            if (! $this->slotOverlaps($today, $start, self::SLOT_MINUTES, $busy)) {
                return true;
            }
        }

        return false;
    }

    /** @return array{0: int, 1: int}|null */
    private function daySchedule(Clinic $clinic, Carbon $day): ?array
    {
        if ($clinic->is_24_7) {
            return [9 * 60, 21 * 60];
        }

        $schedule = $clinic->schedule ?? [];
        $weekday = Schedule::weekdayKey($day);
        $slot = $schedule[$weekday] ?? null;
        if (! $slot) {
            return null;
        }

        return [Schedule::timeToMinutes($slot['open']), Schedule::timeToMinutes($slot['close'])];
    }

    private function earliestBookableMinute(int $openMinutes, int $closeMinutes): ?int
    {
        $nowMinutes = now()->hour * 60 + now()->minute;
        $rounded = (int) (ceil($nowMinutes / self::SLOT_MINUTES) * self::SLOT_MINUTES);
        $start = max($openMinutes, $rounded);

        if ($start + self::SLOT_MINUTES > $closeMinutes) {
            return null;
        }

        return $start;
    }

    /** @param  iterable<int, Appointment>  $busy */
    private function slotOverlaps(Carbon $day, int $startMinutes, int $duration, iterable $busy): bool
    {
        $slotStart = $day->copy()->addMinutes($startMinutes);
        $slotEnd = $slotStart->copy()->addMinutes($duration);

        foreach ($busy as $appointment) {
            if ($appointment->starts_at < $slotEnd && $appointment->ends_at > $slotStart) {
                return true;
            }
        }

        return false;
    }
}
