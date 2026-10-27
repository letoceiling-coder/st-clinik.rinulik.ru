<?php

namespace Database\Factories;

use App\Models\SocialAccount;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SocialAccount>
 */
class SocialAccountFactory extends Factory
{
    protected $model = SocialAccount::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'provider' => fake()->randomElement(['yandex', 'vk', 'max']),
            'provider_user_id' => (string) fake()->unique()->numberBetween(1000, 999999),
            'email' => fake()->safeEmail(),
            'name' => fake()->name(),
            'linked_at' => now(),
        ];
    }
}
