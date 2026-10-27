<?php

namespace Database\Factories;

use App\Models\DoctorSchedule;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DoctorSchedule>
 */
class DoctorScheduleFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'weekday' => fake()->numberBetween(1, 5),
            'start_time' => '09:00',
            'end_time' => '18:00',
            'break_start' => '13:00',
            'break_end' => '14:00',
            'slot_minutes' => 30,
        ];
    }

    public function withoutBreak(): static
    {
        return $this->state(fn () => ['break_start' => null, 'break_end' => null]);
    }
}
