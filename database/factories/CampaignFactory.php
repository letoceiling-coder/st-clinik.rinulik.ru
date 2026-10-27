<?php

namespace Database\Factories;

use App\Models\Campaign;
use App\Models\OfferTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Campaign>
 */
class CampaignFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Кампания '.fake()->unique()->numberBetween(1, 9999),
            'offer_template_id' => OfferTemplate::factory(),
            'channels' => ['email', 'sms'],
            'filters' => [],
            'status' => 'draft',
        ];
    }
}
