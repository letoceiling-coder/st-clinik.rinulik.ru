<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\ClinicService;
use App\Models\Doctor;
use App\Models\DoctorSchedule;
use App\Models\ScheduleException;
use App\Models\Service;
use App\Support\Schedule;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Свободные слоты: график врача (или часы филиала) минус исключения, перерывы и активные записи.
 * Кэш версионируется по организации: врач может работать в нескольких её филиалах.
 */
class SlotAvailabilityService
{
    public const DEFAULT_DURATION = 30;

    public const DEFAULT_STEP = 30;

    public const LEAD_MINUTES = 30;

    public const HORIZON_DAYS = 60;

    private const CACHE_TTL = 600;

    /** Врачи, к которым можно записаться в филиал: основные и работающие здесь по графику. */
    public function doctorsFor(Clinic $clinic): Collection
    {
        return Doctor::query()
            ->published()
            ->where(fn ($q) => $q->where('clinic_id', $clinic->id)
                ->orWhereIn('id', DoctorSchedule::query()->where('clinic_id', $clinic->id)->select('doctor_id')))
            ->orderBy('name')
            ->get();
    }

    public function doctorWorksAt(Clinic $clinic, int $doctorId): bool
    {
        return $this->doctorsFor($clinic)->contains('id', $doctorId);
    }

    public function durationFor(Clinic $clinic, ?int $serviceId): int
    {
        if (! $serviceId) {
            return self::DEFAULT_DURATION;
        }

        $clinicDuration = ClinicService::query()
            ->where('clinic_id', $clinic->id)
            ->where('service_id', $serviceId)
            ->value('duration_min');

        $duration = (int) ($clinicDuration ?: Service::query()->whereKey($serviceId)->value('duration_min') ?: self::DEFAULT_DURATION);

        return max(10, min($duration, 480));
    }

    /**
     * Слоты на день. Для «любого врача» объединяет слоты всех врачей филиала.
     *
     * @return list<array{time: string, doctor_ids: list<int>}>
     */
    public function slotsForDay(Clinic $clinic, ?int $doctorId, ?int $serviceId, CarbonInterface $date): array
    {
        $date = Carbon::parse($date->format('Y-m-d'));
        if (! $this->withinHorizon($date)) {
            return [];
        }

        $key = sprintf('slots:%d:%d:%s:%s:%s', $this->version($clinic), $clinic->id, $doctorId ?: 'any', $serviceId ?: '-', $date->toDateString());

        return Cache::remember($key, self::CACHE_TTL, fn () => $this->computeDay($clinic, $doctorId, $serviceId, $date));
    }

    /**
     * Количество свободных слотов по дням — для календаря выбора даты.
     *
     * @return list<array{date: string, count: int}>
     */
    public function availableDays(Clinic $clinic, ?int $doctorId, ?int $serviceId, CarbonInterface $from, int $days = 14): array
    {
        $from = Carbon::parse($from->format('Y-m-d'))->max(today());
        $result = [];

        for ($i = 0; $i < $days; $i++) {
            $date = $from->copy()->addDays($i);
            if (! $this->withinHorizon($date)) {
                break;
            }
            $result[] = ['date' => $date->toDateString(), 'count' => count($this->slotsForDay($clinic, $doctorId, $serviceId, $date))];
        }

        return $result;
    }

    /** Точная проверка без кэша — вызывается под блокировкой перед созданием записи. */
    public function isAvailable(Clinic $clinic, ?Doctor $doctor, Carbon $startsAt, int $duration, ?int $exceptAppointmentId = null): bool
    {
        if ($startsAt->lt(now()->addMinutes(self::LEAD_MINUTES)) || ! $this->withinHorizon($startsAt)) {
            return false;
        }

        $date = $startsAt->copy()->startOfDay();
        $start = $startsAt->hour * 60 + $startsAt->minute;
        $end = $start + $duration;

        $fits = collect($this->windows($clinic, $doctor, $date)['windows'])
            ->contains(fn (array $w) => $start >= $w[0] && $end <= $w[1]);

        return $fits && ! $this->overlapsBusy($this->busyIntervals($clinic, $doctor, $date, $exceptAppointmentId), $start, $end);
    }

    /** Врачи филиала, свободные в указанное время, — для режима «любой свободный». */
    public function freeDoctorsAt(Clinic $clinic, Carbon $startsAt, int $duration): Collection
    {
        return $this->doctorsFor($clinic)
            ->filter(fn (Doctor $d) => $this->isAvailable($clinic, $d, $startsAt, $duration))
            ->values();
    }

    public function usesDoctors(Clinic $clinic): bool
    {
        return $this->doctorsFor($clinic)->isNotEmpty();
    }

    public function invalidate(Clinic|int|null $clinic): void
    {
        $clinic = $clinic instanceof Clinic ? $clinic : ($clinic ? Clinic::query()->find($clinic) : null);
        if (! $clinic) {
            return;
        }

        Cache::forever($this->versionKey($clinic), $this->version($clinic) + 1);
    }

    /** @return list<array{time: string, doctor_ids: list<int>}> */
    private function computeDay(Clinic $clinic, ?int $doctorId, ?int $serviceId, Carbon $date): array
    {
        $duration = $this->durationFor($clinic, $serviceId);

        if ($doctorId) {
            $doctor = $this->doctorsFor($clinic)->firstWhere('id', $doctorId);

            return $doctor ? $this->tag($this->doctorSlots($clinic, $doctor, $date, $duration), $doctor->id) : [];
        }

        $doctors = $this->doctorsFor($clinic);
        if ($doctors->isEmpty()) {
            return $this->tag($this->doctorSlots($clinic, null, $date, $duration), null);
        }

        $merged = [];
        foreach ($doctors as $doctor) {
            foreach ($this->doctorSlots($clinic, $doctor, $date, $duration) as $time) {
                $merged[$time][] = $doctor->id;
            }
        }
        ksort($merged);

        return collect($merged)->map(fn (array $ids, string $time) => ['time' => $time, 'doctor_ids' => $ids])->values()->all();
    }

    /** @return list<string> */
    private function doctorSlots(Clinic $clinic, ?Doctor $doctor, Carbon $date, int $duration): array
    {
        ['windows' => $windows, 'step' => $step] = $this->windows($clinic, $doctor, $date);
        if (! $windows) {
            return [];
        }

        $busy = $this->busyIntervals($clinic, $doctor, $date);
        $earliest = $date->isToday() ? now()->addMinutes(self::LEAD_MINUTES) : null;
        $earliestMinute = $earliest ? ($earliest->isSameDay($date) ? $earliest->hour * 60 + $earliest->minute : 24 * 60) : 0;

        $slots = [];
        foreach ($windows as [$from, $to]) {
            for ($t = $from; $t + $duration <= $to; $t += $step) {
                if ($t < $earliestMinute || $this->overlapsBusy($busy, $t, $t + $duration)) {
                    continue;
                }
                $slots[] = sprintf('%02d:%02d', intdiv($t, 60), $t % 60);
            }
        }

        return $slots;
    }

    /**
     * Рабочие окна в минутах от начала дня и шаг сетки.
     *
     * @return array{windows: list<array{0: int, 1: int}>, step: int}
     */
    private function windows(Clinic $clinic, ?Doctor $doctor, Carbon $date): array
    {
        $none = ['windows' => [], 'step' => self::DEFAULT_STEP];
        $clinicHours = $this->clinicHours($clinic, $date);

        if (! $doctor) {
            return $clinicHours ? ['windows' => [$clinicHours], 'step' => self::DEFAULT_STEP] : $none;
        }

        $exception = ScheduleException::query()
            ->where('doctor_id', $doctor->id)
            ->where(fn ($q) => $q->whereNull('clinic_id')->orWhere('clinic_id', $clinic->id))
            ->whereDate('date_from', '<=', $date)
            ->whereDate('date_to', '>=', $date)
            ->orderByRaw("case when kind = 'hours' then 1 else 0 end")
            ->first();

        $template = DoctorSchedule::query()
            ->where('doctor_id', $doctor->id)
            ->where('clinic_id', $clinic->id)
            ->where('weekday', (int) $date->format('N'))
            ->first();

        if ($exception && $exception->kind !== 'hours') {
            return $none;
        }

        $step = $template?->slot_minutes ?: self::DEFAULT_STEP;

        if ($exception) {
            return ['windows' => $this->window($exception->start_time, $exception->end_time), 'step' => $step];
        }

        if ($template) {
            return ['windows' => $this->withoutBreak($template), 'step' => $step];
        }

        if (DoctorSchedule::query()->where('doctor_id', $doctor->id)->exists() || $doctor->clinic_id !== $clinic->id) {
            return $none;
        }

        $days = $doctor->schedule_days ?? [];
        if ($days && ! in_array(Schedule::DAYS[Schedule::weekdayKey($date)], $days, true)) {
            return $none;
        }

        return $clinicHours ? ['windows' => [$clinicHours], 'step' => self::DEFAULT_STEP] : $none;
    }

    /** @return array{0: int, 1: int}|null */
    private function clinicHours(Clinic $clinic, Carbon $date): ?array
    {
        if ($clinic->is_24_7) {
            return [0, 24 * 60];
        }

        $day = ($clinic->schedule ?? [])[Schedule::weekdayKey($date)] ?? null;
        if (! $day || empty($day['open']) || empty($day['close'])) {
            return null;
        }

        $window = $this->window($day['open'], $day['close']);

        return $window[0] ?? null;
    }

    /** @return list<array{0: int, 1: int}> */
    private function withoutBreak(DoctorSchedule $template): array
    {
        $windows = $this->window($template->start_time, $template->end_time);
        if (! $windows || ! $template->break_start || ! $template->break_end) {
            return $windows;
        }

        [$from, $to] = $windows[0];
        $breakFrom = Schedule::timeToMinutes($template->break_start);
        $breakTo = Schedule::timeToMinutes($template->break_end);

        return array_values(array_filter([
            [$from, min($to, $breakFrom)],
            [max($from, $breakTo), $to],
        ], fn (array $w) => $w[1] > $w[0]));
    }

    /** @return list<array{0: int, 1: int}> */
    private function window(?string $start, ?string $end): array
    {
        if (! $start || ! $end) {
            return [];
        }

        $from = Schedule::timeToMinutes($start);
        $to = Schedule::timeToMinutes($end);

        return $to > $from ? [[$from, $to]] : [];
    }

    /** @return list<array{0: int, 1: int}> */
    private function busyIntervals(Clinic $clinic, ?Doctor $doctor, Carbon $date, ?int $exceptId = null): array
    {
        $dayStart = $date->copy()->startOfDay();
        $dayEnd = $dayStart->copy()->addDay();

        return Appointment::query()
            ->active()
            ->when(
                $doctor,
                fn ($q) => $q->where('doctor_id', $doctor->id),
                fn ($q) => $q->where('clinic_id', $clinic->id)->whereNull('doctor_id'),
            )
            ->when($exceptId, fn ($q) => $q->whereKeyNot($exceptId))
            ->where('starts_at', '<', $dayEnd)
            ->where('ends_at', '>', $dayStart)
            ->get(['starts_at', 'ends_at'])
            ->map(fn (Appointment $a) => [
                $a->starts_at->lt($dayStart) ? 0 : $a->starts_at->hour * 60 + $a->starts_at->minute,
                $a->ends_at->gte($dayEnd) ? 24 * 60 : $a->ends_at->hour * 60 + $a->ends_at->minute,
            ])
            ->all();
    }

    /** @param  list<array{0: int, 1: int}>  $busy */
    private function overlapsBusy(array $busy, int $start, int $end): bool
    {
        foreach ($busy as [$from, $to]) {
            if ($start < $to && $end > $from) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  list<string>  $times
     * @return list<array{time: string, doctor_ids: list<int>}>
     */
    private function tag(array $times, ?int $doctorId): array
    {
        return array_map(fn (string $t) => ['time' => $t, 'doctor_ids' => $doctorId ? [$doctorId] : []], $times);
    }

    private function withinHorizon(CarbonInterface $date): bool
    {
        return ! $date->copy()->startOfDay()->lt(today()) && $date->lt(today()->addDays(self::HORIZON_DAYS + 1));
    }

    private function version(Clinic $clinic): int
    {
        return (int) Cache::get($this->versionKey($clinic), 1);
    }

    private function versionKey(Clinic $clinic): string
    {
        return 'slots:ver:org:'.($clinic->organization_id ?: 'c'.$clinic->id);
    }
}
