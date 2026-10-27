<?php

namespace App\Services;

use App\Models\Appointment;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Support\Schedule;
use Carbon\Carbon;

class DemoAppointmentSeeder
{
    private const DEMO_NOTE = 'demo-calendar';

    /** @var list<string> */
    private array $names = [
        'Анна Иванова', 'Пётр Сидоров', 'Мария Козлова', 'Дмитрий Волков', 'Елена Морозова',
        'Игорь Новиков', 'Ольга Фёдорова', 'Сергей Павлов', 'Наталья Смирнова', 'Алексей Кузнецов',
    ];

    public function seed(Clinic $clinic, float $fillRatio = 0.7, int $monthsBefore = 3, int $monthsAfter = 3, bool $replace = true): int
    {
        if ($replace) {
            Appointment::query()
                ->where('clinic_id', $clinic->id)
                ->where('notes', self::DEMO_NOTE)
                ->delete();
        }

        $from = now()->subMonths($monthsBefore)->startOfDay();
        $to = now()->addMonths($monthsAfter)->endOfDay();

        $doctors = Doctor::query()
            ->where('clinic_id', $clinic->id)
            ->where('status', 'published')
            ->pluck('id')
            ->all();

        $created = 0;
        $cursor = $from->copy();

        while ($cursor->lte($to)) {
            $created += $this->seedDay($clinic, $cursor->copy(), $fillRatio, $doctors);
            $cursor->addDay();
        }

        return $created;
    }

    /** @param  list<int>  $doctorIds */
    private function seedDay(Clinic $clinic, Carbon $date, float $fillRatio, array $doctorIds): int
    {
        $schedule = $this->scheduleSlot($clinic, $date);
        if ($schedule === null) {
            return 0;
        }

        [$open, $close] = $schedule;
        $slots = [];
        $step = 30;
        for ($min = $open; $min + $step <= $close; $min += $step) {
            $slots[] = $min;
        }

        if ($slots === []) {
            return 0;
        }

        shuffle($slots);
        $take = (int) max(1, round(count($slots) * $fillRatio));
        $selected = array_slice($slots, 0, min($take, count($slots)));

        $created = 0;
        foreach ($selected as $startMin) {
            $startsAt = $date->copy()->startOfDay()->addMinutes($startMin);
            if (Appointment::query()
                ->where('clinic_id', $clinic->id)
                ->where('starts_at', $startsAt)
                ->exists()) {
                continue;
            }

            $endsAt = $startsAt->copy()->addMinutes(30);
            $isPast = $startsAt->isPast();

            Appointment::query()->create([
                'clinic_id' => $clinic->id,
                'doctor_id' => $doctorIds !== [] ? $doctorIds[array_rand($doctorIds)] : null,
                'patient_name' => $this->names[array_rand($this->names)],
                'patient_phone' => '+7900'.random_int(1000000, 9999999),
                'starts_at' => $startsAt,
                'ends_at' => $endsAt,
                'status' => $this->randomStatus($isPast),
                'source' => 'manual',
                'notes' => self::DEMO_NOTE,
            ]);
            $created++;
        }

        return $created;
    }

    /** @return array{0: int, 1: int}|null */
    private function scheduleSlot(Clinic $clinic, Carbon $date): ?array
    {
        if ($clinic->is_24_7) {
            return [9 * 60, 20 * 60];
        }

        $schedule = $clinic->schedule ?? [];
        $weekday = Schedule::weekdayKey($date);
        $slot = $schedule[$weekday] ?? null;

        if (! $slot) {
            return null;
        }

        return [Schedule::timeToMinutes($slot['open']), Schedule::timeToMinutes($slot['close'])];
    }

    private function randomStatus(bool $isPast): string
    {
        if ($isPast) {
            $pool = array_merge(
                array_fill(0, 60, 'completed'),
                array_fill(0, 15, 'cancelled'),
                array_fill(0, 10, 'no_show'),
                array_fill(0, 15, 'confirmed'),
            );

            return $pool[array_rand($pool)];
        }

        return random_int(0, 1) === 0 ? 'new' : 'confirmed';
    }
}
