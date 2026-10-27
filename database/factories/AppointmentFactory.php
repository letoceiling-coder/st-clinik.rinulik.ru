<?php

namespace Database\Factories;

use App\Models\Appointment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Appointment>
 */
class AppointmentFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startsAt = now()->addDays(fake()->numberBetween(1, 10))->setTime(10, 0);

        return [
            'patient_name' => fake('ru_RU')->firstName(),
            'patient_phone' => '+7900'.fake()->numerify('#######'),
            'starts_at' => $startsAt,
            'ends_at' => $startsAt->copy()->addMinutes(30),
            'status' => 'new',
            'source' => 'online',
        ];
    }

    public function at(string $startsAt, int $minutes = 30): static
    {
        return $this->state(fn () => [
            'starts_at' => now()->parse($startsAt),
            'ends_at' => now()->parse($startsAt)->addMinutes($minutes),
        ]);
    }

    public function status(string $status): static
    {
        return $this->state(fn () => ['status' => $status]);
    }
}
