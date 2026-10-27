<?php

namespace Database\Factories;

use App\Models\ParserTask;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ParserTask>
 */
class ParserTaskFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'external_id' => fake()->uuid(),
            'type' => 'yandex.orgs',
            'purpose' => 'search',
            'input' => ['city' => 'Краснодар', 'category' => 'стоматология', 'maxResults' => 20],
            'status' => 'queued',
        ];
    }

    public function running(): static
    {
        return $this->state(fn () => ['status' => 'running', 'started_at' => now()]);
    }

    /** Сбор через `POST /api/v1/organizations/collect`. */
    public function collect(): static
    {
        return $this->state(fn () => [
            'type' => ParserTask::COLLECT,
            'input' => ['city' => 'Краснодар', 'category' => ParserTask::CATEGORY, 'count' => 45],
        ]);
    }
}
