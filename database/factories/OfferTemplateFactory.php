<?php

namespace Database\Factories;

use App\Models\OfferTemplate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<OfferTemplate>
 */
class OfferTemplateFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'Шаблон КП '.fake()->unique()->numberBetween(1, 9999),
            'is_active' => true,
            'current_version' => 1,
        ];
    }

    /** Шаблон сразу с первой версией содержимого. */
    public function configure(): static
    {
        return $this->afterCreating(fn (OfferTemplate $template) => $template->versions()->create([
            'version' => 1,
            'web_title' => '{org.name} на СтомКлиник',
            'web_body' => "Здравствуйте, {org.name}!\n\nРейтинг {org.rating}, отзывов {org.reviews}. Демо: {demo_link}",
            'email_subject' => 'Предложение для {org.name}',
            'email_body' => "Здравствуйте!\n\nКП для {org.name} из города {city}: {offer_link}",
            'sms_text' => '{org.name}: КП {offer_link}',
            'messenger_text' => 'Здравствуйте! КП для {org.name}: {offer_link}',
            'call_script' => 'Позвонить в {org.name}, предложить {offer_link}',
        ]));
    }
}
