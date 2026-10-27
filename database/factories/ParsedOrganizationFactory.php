<?php

namespace Database\Factories;

use App\Models\ParsedOrganization;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ParsedOrganization>
 */
class ParsedOrganizationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $externalId = (string) fake()->unique()->numberBetween(1_000_000_000, 9_999_999_999);
        $name = 'Стоматология «'.fake()->lastName().'»';
        $phone = '+7861'.fake()->numerify('#######');

        return [
            'external_id' => $externalId,
            'source' => 'yandex',
            'name' => $name,
            'city_name' => 'Краснодар',
            'address' => 'ул. Красная, '.fake()->numberBetween(1, 200),
            'lat' => 45.03 + fake()->randomFloat(4, 0, 0.05),
            'lng' => 38.97 + fake()->randomFloat(4, 0, 0.05),
            'phones' => [$phone],
            'website' => null,
            'socials' => [],
            'categories' => ['Стоматологическая клиника'],
            'rating' => 4.8,
            'reviews_count' => 50,
            'raw' => [
                'externalId' => $externalId,
                'name' => $name,
                'city' => 'Краснодар',
                'phones' => [$phone],
            ],
            'status' => 'new',
            'last_synced_at' => now(),
        ];
    }
}
