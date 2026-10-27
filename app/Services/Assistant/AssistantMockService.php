<?php

namespace App\Services\Assistant;

use App\Models\City;
use App\Services\SearchService;
use Illuminate\Support\Str;

/** Ответы ассистента без LLM: поиск по каталогу + шаблоны (до подключения OpenRouter). */
class AssistantMockService
{
    public function __construct(
        private readonly AssistantSettings $settings,
        private readonly SearchService $search,
    ) {}

    /**
     * @return array{
     *     reply: string,
     *     suggestions: list<string>,
     *     links: list<array{label: string, url: string}>
     * }
     */
    public function reply(string $message, City $city): array
    {
        $message = trim($message);
        if ($message === '') {
            return $this->emptyPrompt();
        }

        $lower = Str::lower($message);

        if ($this->matchesEmergency($lower)) {
            return [
                'reply' => "Похоже на неотложную ситуацию. Немедленно звоните 103 или 112.\n\n".$this->settings->get()['disclaimer'],
                'suggestions' => ['Найти клинику', 'Как записаться онлайн'],
                'links' => [],
            ];
        }

        if (str_contains($lower, 'запис') || str_contains($lower, 'онлайн')) {
            return [
                'reply' => "Онлайн-запись: откройте карточку клиники → «Записаться». Выберите врача, услугу и время.\n\n".
                    "В {$city->name_in} можно посмотреть каталог клиник с актуальными ценами.",
                'suggestions' => ['Клиники '.$city->name_in, 'Имплантация', 'Детский стоматолог'],
                'links' => [
                    ['label' => 'Каталог клиник', 'url' => route('city.clinics', $city->slug)],
                ],
            ];
        }

        $results = $this->search->suggest($message, $city);
        $links = [];
        $lines = [];

        foreach (array_slice($results['clinics']->all(), 0, 3) as $clinic) {
            $links[] = ['label' => $clinic['name'], 'url' => $clinic['url']];
            $rating = isset($clinic['rating']) ? number_format((float) $clinic['rating'], 1, ',', '') : '';
            $lines[] = '• '.$clinic['name'].($rating !== '' ? " ({$rating})" : '');
        }

        foreach (array_slice($results['services']->all(), 0, 2) as $service) {
            $links[] = ['label' => $service['name'], 'url' => $service['url']];
        }

        if ($lines !== []) {
            return [
                'reply' => "В {$city->name_in} нашёл:\n\n".implode("\n", $lines)."\n\nОткройте ссылку, чтобы записаться или посмотреть цены.",
                'suggestions' => ['Другие клиники', 'Как записаться'],
                'links' => $links,
            ];
        }

        return [
            'reply' => "Пока я работаю в демо-режиме и ищу по каталогу опубликованных клиник.\n\n".
                "Уточните услугу или симптом (например: «болит зуб», «имплантация», «детский стоматолог»).\n\n".
                $this->settings->get()['disclaimer'],
            'suggestions' => ['Клиники '.$city->name_in, 'Записаться онлайн'],
            'links' => [
                ['label' => 'Каталог', 'url' => route('city.clinics', $city->slug)],
                ['label' => 'Поиск', 'url' => route('search').'?q='.urlencode($message)],
            ],
        ];
    }

    /** @return array{reply: string, suggestions: list<string>, links: list<array{label: string, url: string}>} */
    private function emptyPrompt(): array
    {
        return [
            'reply' => 'Напишите вопрос текстом — например, какая услуга нужна или что беспокоит.',
            'suggestions' => ['Имплантация', 'Отбеливание', 'Детский стоматолог'],
            'links' => [],
        ];
    }

    private function matchesEmergency(string $lower): bool
    {
        foreach (['103', '112', 'неотлож', 'кровотеч', 'сильная боль', 'отёк горл', 'травм'] as $needle) {
            if (str_contains($lower, $needle)) {
                return true;
            }
        }

        return false;
    }
}
