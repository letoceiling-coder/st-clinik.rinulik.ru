<?php

namespace App\Http\Controllers\Cabinet;

use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\DoctorSchedule;
use App\Models\ScheduleException;
use App\Support\Schedule;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Response;

class DoctorScheduleController extends CabinetController
{
    public function index(Request $request): Response
    {
        $branch = $this->branch($request);
        $orgClinicIds = Clinic::query()->where('organization_id', $branch->organization_id)->pluck('id');

        $doctors = Doctor::query()
            ->where(fn ($q) => $q
                ->whereIn('clinic_id', $orgClinicIds)
                ->orWhereIn('id', DoctorSchedule::query()->where('clinic_id', $branch->id)->select('doctor_id')))
            ->orderBy('name')
            ->get();

        $schedules = DoctorSchedule::query()->where('clinic_id', $branch->id)->get()->groupBy('doctor_id');
        $exceptions = ScheduleException::query()
            ->where('clinic_id', $branch->id)
            ->whereDate('date_to', '>=', today()->subDay())
            ->orderBy('date_from')
            ->get()
            ->groupBy('doctor_id');

        return $this->render($request, 'Cabinet/DoctorSchedules', 'Расписание врачей', [
            'weekdays' => collect(array_values(Schedule::DAYS))->map(fn (string $label, int $i) => ['n' => $i + 1, 'label' => $label])->values(),
            'slot_minutes' => DoctorSchedule::SLOT_MINUTES,
            'kinds' => ScheduleException::KINDS,
            'doctors' => $doctors->map(fn (Doctor $d) => [
                'id' => $d->id,
                'name' => $d->name,
                'position' => $d->position,
                'home' => (int) $d->clinic_id === (int) $branch->id,
                'days' => collect(range(1, 7))->map(function (int $n) use ($schedules, $d) {
                    $row = $schedules->get($d->id)?->firstWhere('weekday', $n);

                    return [
                        'weekday' => $n,
                        'enabled' => (bool) $row,
                        'start_time' => $row?->start_time ?? '09:00',
                        'end_time' => $row?->end_time ?? '18:00',
                        'break_start' => $row?->break_start ?? '',
                        'break_end' => $row?->break_end ?? '',
                        'slot_minutes' => $row?->slot_minutes ?? 30,
                    ];
                })->values(),
                'exceptions' => ($exceptions->get($d->id) ?? collect())->map(fn (ScheduleException $e) => [
                    'id' => $e->id,
                    'kind' => $e->kind,
                    'kind_label' => ScheduleException::KINDS[$e->kind] ?? $e->kind,
                    'date_from' => $e->date_from->toDateString(),
                    'date_to' => $e->date_to->toDateString(),
                    'start_time' => $e->start_time,
                    'end_time' => $e->end_time,
                    'comment' => $e->comment,
                ])->values(),
            ])->values(),
        ]);
    }

    public function update(Request $request, Doctor $doctor): RedirectResponse
    {
        $branch = $this->branch($request);
        $this->authorizeDoctor($request, $doctor);

        $data = $request->validate([
            'days' => ['required', 'array'],
            'days.*.enabled' => ['boolean'],
            'days.*.start_time' => ['nullable', 'regex:/^([01]\d|2[0-3]):[0-5]\d$/'],
            'days.*.end_time' => ['nullable', 'regex:/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/'],
            'days.*.break_start' => ['nullable', 'regex:/^([01]\d|2[0-3]):[0-5]\d$/'],
            'days.*.break_end' => ['nullable', 'regex:/^([01]\d|2[0-3]):[0-5]\d$/'],
            'days.*.slot_minutes' => ['nullable', 'integer', Rule::in(DoctorSchedule::SLOT_MINUTES)],
        ]);

        $keep = [];
        foreach (range(1, 7) as $weekday) {
            $day = $data['days'][$weekday] ?? $data['days'][(string) $weekday] ?? [];
            if (empty($day['enabled'])) {
                continue;
            }
            if (empty($day['start_time']) || empty($day['end_time']) || $day['start_time'] >= $day['end_time']) {
                return back()->withErrors(["days.$weekday.start_time" => 'Укажите корректные часы приёма.']);
            }
            $breakStart = $day['break_start'] ?? null;
            $breakEnd = $day['break_end'] ?? null;
            $breakStart = $breakStart ?: null;
            $breakEnd = $breakEnd ?: null;
            if (($breakStart xor $breakEnd) || ($breakStart && ($breakStart < $day['start_time'] || $breakEnd > $day['end_time'] || $breakStart >= $breakEnd))) {
                return back()->withErrors(["days.$weekday.break_start" => 'Перерыв должен быть внутри рабочего окна.']);
            }

            $row = DoctorSchedule::query()->updateOrCreate(
                ['doctor_id' => $doctor->id, 'clinic_id' => $branch->id, 'weekday' => $weekday],
                [
                    'start_time' => $day['start_time'],
                    'end_time' => $day['end_time'],
                    'break_start' => $breakStart,
                    'break_end' => $breakEnd,
                    'slot_minutes' => (int) ($day['slot_minutes'] ?? 30),
                ],
            );
            $keep[] = $row->id;
        }

        DoctorSchedule::query()
            ->where('doctor_id', $doctor->id)
            ->where('clinic_id', $branch->id)
            ->when($keep, fn ($q) => $q->whereNotIn('id', $keep), fn ($q) => $q)
            ->delete();

        return back()->with('success', 'Расписание «'.$doctor->name.'» сохранено.');
    }

    public function storeException(Request $request, Doctor $doctor): RedirectResponse
    {
        $branch = $this->branch($request);
        $this->authorizeDoctor($request, $doctor);

        $data = $request->validate([
            'kind' => ['required', Rule::in(array_keys(ScheduleException::KINDS))],
            'date_from' => ['required', 'date'],
            'date_to' => ['required', 'date', 'after_or_equal:date_from'],
            'start_time' => ['nullable', 'required_if:kind,hours', 'regex:/^([01]\d|2[0-3]):[0-5]\d$/'],
            'end_time' => ['nullable', 'required_if:kind,hours', 'regex:/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/'],
            'comment' => ['nullable', 'string', 'max:200'],
        ]);

        if ($data['kind'] === 'hours' && ($data['start_time'] ?? '') >= ($data['end_time'] ?? '')) {
            return back()->withErrors(['start_time' => 'Укажите корректные часы.']);
        }

        ScheduleException::create([
            'doctor_id' => $doctor->id,
            'clinic_id' => $branch->id,
            'kind' => $data['kind'],
            'date_from' => $data['date_from'],
            'date_to' => $data['date_to'],
            'start_time' => $data['kind'] === 'hours' ? $data['start_time'] : null,
            'end_time' => $data['kind'] === 'hours' ? $data['end_time'] : null,
            'comment' => $data['comment'] ?? null,
        ]);

        return back()->with('success', 'Исключение добавлено.');
    }

    public function destroyException(Request $request, ScheduleException $exception): RedirectResponse
    {
        $this->ownedBy($request, $exception);
        $exception->delete();

        return back()->with('success', 'Исключение удалено.');
    }

    private function authorizeDoctor(Request $request, Doctor $doctor): void
    {
        $branch = $this->branch($request);
        $orgClinicIds = Clinic::query()->where('organization_id', $branch->organization_id)->pluck('id');
        $worksHere = DoctorSchedule::query()->where('clinic_id', $branch->id)->where('doctor_id', $doctor->id)->exists();

        abort_unless($orgClinicIds->contains($doctor->clinic_id) || $worksHere, 404);
    }
}
