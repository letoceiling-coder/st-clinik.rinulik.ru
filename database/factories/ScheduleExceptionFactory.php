<?php

namespace Database\Factories;

use App\Models\ScheduleException;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ScheduleException>
 */
class ScheduleExceptionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $from = now()->addDays(fake()->numberBetween(1, 20))->startOfDay();

        return [
            'date_from' => $from->toDateString(),
            'date_to' => $from->toDateString(),
            'kind' => 'day_off',
            'start_time' => null,
            'end_time' => null,
            'comment' => null,
        ];
    }

    public function vacation(int $days = 7): static
    {
        return $this->state(fn (array $attributes) => [
            'kind' => 'vacation',
            'date_to' => now()->parse($attributes['date_from'])->addDays($days - 1)->toDateString(),
        ]);
    }

    public function hours(string $start, string $end): static
    {
        return $this->state(fn () => ['kind' => 'hours', 'start_time' => $start, 'end_time' => $end]);
    }
}
