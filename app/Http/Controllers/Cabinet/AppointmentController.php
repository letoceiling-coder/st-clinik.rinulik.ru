<?php

namespace App\Http\Controllers\Cabinet;

use App\Http\Controllers\BookingController;
use App\Models\Appointment;
use App\Models\AppointmentStatusChange;
use App\Models\Clinic;
use App\Models\ClinicService;
use App\Models\Doctor;
use App\Services\AppointmentBookingService;
use App\Services\SlotAvailabilityService;
use App\Support\Schedule;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Response;

class AppointmentController extends CabinetController
{
    public const DURATIONS = [15, 30, 45, 60, 90, 120];

    public function index(Request $request, SlotAvailabilityService $slots): Response
    {
        $branch = $this->branch($request);
        $view = $request->query('view', 'week');
        $view = in_array($view, ['week', 'day', 'month'], true) ? $view : 'week';

        $anchor = Carbon::parse(
            $request->query('anchor', $request->query('week', $request->query('day', now()->toDateString())))
        )->startOfDay();

        $focusDay = Carbon::parse($request->query('day', $anchor->toDateString()))->startOfDay();
        $doctorId = $request->filled('doctor_id') ? (int) $request->query('doctor_id') : null;

        [$periodStart, $periodEnd, $days, $periodMeta] = match ($view) {
            'day' => $this->buildDayView($focusDay),
            'month' => $this->buildMonthView($anchor),
            default => $this->buildWeekView($anchor),
        };

        $appointments = $this->appointmentsForRange($branch, $periodStart, $periodEnd, $doctorId);

        $days = collect($days)->map(function (array $day) use ($appointments, $branch) {
            $date = Carbon::parse($day['date']);
            $scheduleSlot = $this->scheduleForDate($branch, $date);

            return array_merge($day, [
                'schedule' => $scheduleSlot,
                'appointments' => $appointments
                    ->filter(fn (Appointment $a) => $a->starts_at->toDateString() === $day['date'])
                    ->map(fn (Appointment $a) => $this->appointmentPayload($a))
                    ->values()
                    ->all(),
            ]);
        })->all();

        $grid = $view === 'month'
            ? ['start_minutes' => 9 * 60, 'end_minutes' => 21 * 60, 'step_minutes' => 30]
            : $this->calendarGrid($branch, $days);

        $doctors = $slots->doctorsFor($branch)->map(fn (Doctor $d) => ['id' => $d->id, 'name' => $d->name])->values();

        $requests = Appointment::query()
            ->where('clinic_id', $branch->id)
            ->where('status', 'pending')
            ->whereNotNull('requested_starts_at')
            ->with(['doctor:id,name', 'service:id,name', 'history'])
            ->orderBy('requested_starts_at')
            ->limit(20)
            ->get()
            ->map(fn (Appointment $a) => $this->appointmentPayload($a));

        $services = ClinicService::query()
            ->where('clinic_id', $branch->id)
            ->with('service:id,name')
            ->orderBy('price_from')
            ->get()
            ->map(fn (ClinicService $cs) => ['id' => $cs->service_id, 'name' => $cs->service?->name])
            ->filter(fn ($s) => $s['name'])
            ->unique('id')
            ->values();

        $focusLabel = $focusDay->locale('ru')->isoFormat('dddd, D MMMM Y');

        return $this->render($request, 'Cabinet/Calendar', 'Календарь записей', [
            'anchor' => $anchor->toDateString(),
            'week_start' => $periodMeta['week_start'],
            'week_end' => $periodMeta['week_end'],
            'week_label' => $periodMeta['week_label'],
            'period_label' => $periodMeta['period_label'],
            'month_start' => $periodMeta['month_start'] ?? null,
            'focus_day' => $focusDay->toDateString(),
            'focus_label' => mb_convert_case($focusLabel, MB_CASE_TITLE, 'UTF-8'),
            'view' => $view,
            'doctor_id' => $doctorId,
            'days' => $days,
            'doctors' => $doctors,
            'services' => $services,
            'statuses' => Appointment::STATUSES,
            'transitions' => Appointment::TRANSITIONS,
            'reschedule_requests' => $requests,
            'durations' => self::DURATIONS,
            'grid' => $grid,
        ]);
    }

    /** @return array{0: Carbon, 1: Carbon, 2: list<array<string, mixed>>, 3: array<string, mixed>} */
    private function buildWeekView(Carbon $anchor): array
    {
        $weekStart = $anchor->copy()->startOfWeek(Carbon::MONDAY);
        $weekEnd = $weekStart->copy()->endOfWeek(Carbon::SUNDAY);
        $days = $this->daySkeletons($weekStart, $weekEnd);

        return [
            $weekStart->copy()->startOfDay(),
            $weekEnd->copy()->endOfDay(),
            $days,
            $this->periodMeta($weekStart, $weekEnd, $weekStart->locale('ru')->isoFormat('D MMM').' — '.$weekEnd->locale('ru')->isoFormat('D MMM Y')),
        ];
    }

    /** @return array{0: Carbon, 1: Carbon, 2: list<array<string, mixed>>, 3: array<string, mixed>} */
    private function buildDayView(Carbon $focusDay): array
    {
        $days = $this->daySkeletons($focusDay->copy(), $focusDay->copy());

        return [
            $focusDay->copy()->startOfDay(),
            $focusDay->copy()->endOfDay(),
            $days,
            $this->periodMeta(
                $focusDay->copy()->startOfWeek(Carbon::MONDAY),
                $focusDay->copy()->endOfWeek(Carbon::SUNDAY),
                mb_convert_case($focusDay->locale('ru')->isoFormat('dddd, D MMMM Y'), MB_CASE_TITLE, 'UTF-8'),
            ),
        ];
    }

    /** @return array{0: Carbon, 1: Carbon, 2: list<array<string, mixed>>, 3: array<string, mixed>} */
    private function buildMonthView(Carbon $anchor): array
    {
        $monthStart = $anchor->copy()->startOfMonth();
        $monthEnd = $anchor->copy()->endOfMonth();
        $gridStart = $monthStart->copy()->startOfWeek(Carbon::MONDAY);
        $gridEnd = $monthEnd->copy()->endOfWeek(Carbon::SUNDAY);

        $days = $this->daySkeletons($gridStart, $gridEnd, $monthStart, $monthEnd);

        return [
            $gridStart->copy()->startOfDay(),
            $gridEnd->copy()->endOfDay(),
            $days,
            array_merge(
                $this->periodMeta(
                    $monthStart->copy()->startOfWeek(Carbon::MONDAY),
                    $monthEnd->copy()->endOfWeek(Carbon::SUNDAY),
                    mb_convert_case($monthStart->locale('ru')->isoFormat('MMMM Y'), MB_CASE_TITLE, 'UTF-8'),
                ),
                ['month_start' => $monthStart->toDateString()],
            ),
        ];
    }

    /** @return list<array{date: string, label: string, is_today: bool, in_month: bool}> */
    private function daySkeletons(Carbon $from, Carbon $to, ?Carbon $monthStart = null, ?Carbon $monthEnd = null): array
    {
        $days = [];
        $cursor = $from->copy();

        while ($cursor->lte($to)) {
            $inMonth = true;
            if ($monthStart && $monthEnd) {
                $inMonth = $cursor->between($monthStart->copy()->startOfDay(), $monthEnd->copy()->endOfDay());
            }

            $days[] = [
                'date' => $cursor->toDateString(),
                'label' => $cursor->locale('ru')->isoFormat('dd, D MMM'),
                'label_short' => (string) $cursor->day,
                'weekday_short' => $cursor->locale('ru')->isoFormat('dd'),
                'is_today' => $cursor->isToday(),
                'in_month' => $inMonth,
            ];
            $cursor->addDay();
        }

        return $days;
    }

    /** @return array{week_start: string, week_end: string, week_label: string, period_label: string} */
    private function periodMeta(Carbon $weekStart, Carbon $weekEnd, string $periodLabel): array
    {
        return [
            'week_start' => $weekStart->toDateString(),
            'week_end' => $weekEnd->toDateString(),
            'week_label' => $weekStart->locale('ru')->isoFormat('D MMM').' — '.$weekEnd->locale('ru')->isoFormat('D MMM Y'),
            'period_label' => $periodLabel,
        ];
    }

    /** @return Collection<int, Appointment> */
    private function appointmentsForRange(Clinic $branch, Carbon $start, Carbon $end, ?int $doctorId): Collection
    {
        return Appointment::query()
            ->where('clinic_id', $branch->id)
            ->whereBetween('starts_at', [$start, $end])
            ->when($doctorId, fn ($q) => $q->where('doctor_id', $doctorId))
            ->with(['doctor:id,name', 'service:id,name', 'lead:id,name', 'history'])
            ->orderBy('starts_at')
            ->get();
    }

    /** @param  list<array<string, mixed>>  $days
     * @return array{start_minutes: int, end_minutes: int, step_minutes: int}
     */
    private function calendarGrid(Clinic $branch, array $days): array
    {
        $openMinutes = [];
        $closeMinutes = [];

        foreach ($days as $day) {
            $schedule = $day['schedule'] ?? null;
            if (! is_array($schedule) || empty($schedule['is_working'])) {
                continue;
            }
            $openMinutes[] = (int) $schedule['open_minutes'];
            $closeMinutes[] = (int) $schedule['close_minutes'];
        }

        if ($openMinutes === []) {
            return ['start_minutes' => 9 * 60, 'end_minutes' => 21 * 60, 'step_minutes' => 30];
        }

        return [
            'start_minutes' => min($openMinutes),
            'end_minutes' => max($closeMinutes),
            'step_minutes' => 30,
        ];
    }

    /** @return array{is_working: bool, open: ?string, close: ?string, open_minutes: int, close_minutes: int, hours_label: string} */
    private function scheduleForDate(Clinic $branch, Carbon $date): array
    {
        if ($branch->is_24_7) {
            return [
                'is_working' => true,
                'open' => '00:00',
                'close' => '24:00',
                'open_minutes' => 0,
                'close_minutes' => 24 * 60,
                'hours_label' => 'Круглосуточно',
            ];
        }

        $schedule = $branch->schedule ?? [];
        $weekday = Schedule::weekdayKey($date);
        $slot = $schedule[$weekday] ?? null;

        if (! $slot) {
            return [
                'is_working' => false,
                'open' => null,
                'close' => null,
                'open_minutes' => 0,
                'close_minutes' => 0,
                'hours_label' => 'Выходной',
            ];
        }

        return [
            'is_working' => true,
            'open' => $slot['open'],
            'close' => $slot['close'],
            'open_minutes' => Schedule::timeToMinutes($slot['open']),
            'close_minutes' => Schedule::timeToMinutes($slot['close']),
            'hours_label' => Schedule::hours($slot),
        ];
    }

    public function store(Request $request, AppointmentBookingService $booking): RedirectResponse
    {
        $branch = $this->branch($request);
        $this->normalizeIds($request);
        $data = $this->validated($request);

        $booking->createManual($branch, $data, $request->user());

        return back()->with('success', 'Запись добавлена в календарь.');
    }

    public function update(Request $request, Appointment $appointment, AppointmentBookingService $booking): RedirectResponse
    {
        $this->ownedBy($request, $appointment);
        $this->normalizeIds($request);
        $data = $this->validated($request, $appointment);

        $booking->update($appointment, $data, $request->user());

        return back()->with('success', 'Запись обновлена.');
    }

    public function status(Request $request, Appointment $appointment, AppointmentBookingService $booking): RedirectResponse
    {
        $this->ownedBy($request, $appointment);
        $data = $request->validate([
            'status' => ['required', Rule::in(array_keys(Appointment::STATUSES))],
            'comment' => ['nullable', 'string', 'max:300'],
        ]);

        $booking->changeStatus($appointment, $data['status'], $request->user(), 'clinic', $data['comment'] ?? null);

        return back()->with('success', 'Статус записи: '.mb_strtolower(Appointment::STATUSES[$data['status']]).'.');
    }

    public function approveReschedule(Request $request, Appointment $appointment, AppointmentBookingService $booking): RedirectResponse
    {
        $this->ownedBy($request, $appointment);
        $booking->approveReschedule($appointment, $request->user());

        return back()->with('success', 'Перенос подтверждён.');
    }

    public function rejectReschedule(Request $request, Appointment $appointment, AppointmentBookingService $booking): RedirectResponse
    {
        $this->ownedBy($request, $appointment);
        $data = $request->validate(['comment' => ['nullable', 'string', 'max:300']]);
        $booking->rejectReschedule($appointment, $request->user(), $data['comment'] ?? null);

        return back()->with('success', 'Перенос отклонён, запись осталась на прежнем времени.');
    }

    /** @return array<string, mixed> */
    private function appointmentPayload(Appointment $a): array
    {
        return [
            'id' => $a->id,
            'patient_name' => $a->patient_name,
            'patient_phone' => $a->patient_phone,
            'starts_at' => $a->starts_at->format('Y-m-d\TH:i'),
            'ends_at' => $a->ends_at->format('H:i'),
            'time_label' => $a->starts_at->format('H:i').'–'.$a->ends_at->format('H:i'),
            'status' => $a->status,
            'status_label' => Appointment::STATUSES[$a->status] ?? $a->status,
            'is_past' => $a->starts_at->isPast(),
            'source' => $a->source,
            'doctor' => $a->doctor?->name,
            'doctor_id' => $a->doctor_id,
            'service' => $a->service?->name,
            'service_id' => $a->service_id,
            'lead_id' => $a->lead_id,
            'notes' => $a->notes,
            'is_child' => (bool) $a->is_child,
            'cancel_reason' => $a->cancel_reason,
            'requested_starts_at' => $a->requested_starts_at?->format('Y-m-d H:i'),
            'requested_label' => $a->requested_starts_at?->locale('ru')->isoFormat('D MMM, HH:mm'),
            'date_label' => $a->starts_at->locale('ru')->isoFormat('D MMM, HH:mm'),
            'duration_minutes' => $a->starts_at->diffInMinutes($a->ends_at),
            'history' => $a->relationLoaded('history')
                ? $a->history->map(fn (AppointmentStatusChange $h) => BookingController::historyRow($h))->values()
                : [],
        ];
    }

    private function normalizeIds(Request $request): void
    {
        $request->merge([
            'doctor_id' => $request->filled('doctor_id') ? (int) $request->input('doctor_id') : null,
            'service_id' => $request->filled('service_id') ? (int) $request->input('service_id') : null,
        ]);
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Appointment $appointment = null): array
    {
        return $request->validate([
            'patient_name' => [$appointment ? 'sometimes' : 'required', 'string', 'min:2', 'max:80'],
            'patient_phone' => [$appointment ? 'sometimes' : 'required', 'string', 'regex:/^\+?[0-9\s\-\(\)]{10,18}$/'],
            'starts_at' => array_merge(
                [$appointment ? 'sometimes' : 'required', 'date'],
                $appointment ? [] : ['after_or_equal:today'],
            ),
            'duration_minutes' => ['nullable', 'integer', Rule::in(self::DURATIONS)],
            'doctor_id' => ['nullable', 'integer', 'exists:doctors,id'],
            'service_id' => ['nullable', 'integer', 'exists:services,id'],
            'status' => ['nullable', Rule::in(array_keys(Appointment::STATUSES))],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);
    }
}
