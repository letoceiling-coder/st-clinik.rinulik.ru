<?php

namespace App\Services\Assistant;

/** JSON-схемы инструментов OpenRouter (function calling). */
class AssistantToolDefinitions
{
    /** @return list<array<string, mixed>> */
    public static function all(): array
    {
        return [
            self::tool(
                'search_clinics',
                'Подобрать опубликованные стоматологические клиники в городе пользователя. Понимает услугу или симптом («имплантация», «болит зуб», «брекеты»), название клиники, метро. Возвращает рейтинг, отзывы, адрес, метро, район, цену на услугу, особенности и ссылки на запись. Вызывай перед любыми рекомендациями — не придумывай клиники и цены.',
                [
                    'type' => 'object',
                    'properties' => [
                        'query' => ['type' => 'string', 'description' => 'Услуга, симптом, название клиники или метро словами пользователя. Можно пусто, если нужны просто лучшие клиники.'],
                        'district' => ['type' => 'string', 'description' => 'Район города из списка районов, если пользователь его назвал'],
                        'max_price' => ['type' => 'integer', 'description' => 'Верхняя граница цены услуги в рублях, если пользователь назвал бюджет'],
                        'rating_min' => ['type' => 'number', 'description' => 'Минимальный рейтинг, например 4.5'],
                        'children' => ['type' => 'boolean', 'description' => 'Нужен приём детей'],
                        'sort' => ['type' => 'string', 'enum' => ['relevance', 'rating', 'reviews', 'price_asc'], 'description' => 'price_asc — сначала дешевле, rating — лучшие по рейтингу'],
                        'limit' => ['type' => 'integer', 'description' => 'Сколько клиник вернуть (1–6), обычно 3', 'minimum' => 1, 'maximum' => 6],
                    ],
                ],
            ),
            self::tool(
                'get_clinic',
                'Подробности одной клиники по slug: услуги с ценами и service_id, врачи с id, особенности, оплата, ссылка на запись.',
                [
                    'type' => 'object',
                    'properties' => [
                        'slug' => ['type' => 'string', 'description' => 'Slug клиники из search_clinics или из списка показанных клиник'],
                        'service' => ['type' => 'string', 'description' => 'Интересующая услуга — её цена окажется первой в списке'],
                    ],
                    'required' => ['slug'],
                ],
            ),
            self::tool(
                'search_doctors',
                'Поиск опубликованных врачей в городе пользователя.',
                [
                    'type' => 'object',
                    'properties' => [
                        'query' => ['type' => 'string', 'description' => 'ФИО, специальность или услуга'],
                        'limit' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 8],
                    ],
                    'required' => ['query'],
                ],
            ),
            self::tool(
                'get_available_days',
                'Дни с хотя бы одним свободным слотом онлайн-записи в клинике.',
                [
                    'type' => 'object',
                    'properties' => [
                        'slug' => ['type' => 'string', 'description' => 'Slug клиники'],
                        'days' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 21],
                        'doctor_id' => ['type' => 'integer', 'description' => 'ID врача, если известен'],
                        'service_id' => ['type' => 'integer', 'description' => 'ID услуги для длительности слота'],
                    ],
                    'required' => ['slug'],
                ],
            ),
            self::tool(
                'get_slots',
                'Свободные интервалы онлайн-записи в клинике на конкретную дату (YYYY-MM-DD).',
                [
                    'type' => 'object',
                    'properties' => [
                        'slug' => ['type' => 'string'],
                        'date' => ['type' => 'string', 'description' => 'Дата YYYY-MM-DD'],
                        'doctor_id' => ['type' => 'integer'],
                        'service_id' => ['type' => 'integer'],
                    ],
                    'required' => ['slug', 'date'],
                ],
            ),
            self::tool(
                'create_lead',
                'Отправить заявку в клинику: клиника перезвонит пациенту и подтвердит запись. Только после того, как пользователь назвал имя и телефон и явно согласился на обработку персональных данных (consent=true). clinic — slug выбранной клиники; broadcast=true — если пользователь не выбрал клинику и просит подобрать любую подходящую.',
                [
                    'type' => 'object',
                    'properties' => [
                        'name' => ['type' => 'string'],
                        'phone' => ['type' => 'string'],
                        'clinic' => ['type' => 'string', 'description' => 'Slug клиники или пусто при broadcast'],
                        'broadcast' => ['type' => 'boolean', 'description' => 'Отправить нескольким клиникам города'],
                        'comment' => ['type' => 'string'],
                        'consent' => ['type' => 'boolean', 'description' => 'Должно быть true после согласия пользователя'],
                    ],
                    'required' => ['name', 'phone', 'consent'],
                ],
            ),
            self::tool(
                'search_knowledge',
                'FAQ сервиса и фрагменты каталога (клиники, врачи) — запись, цены, правила.',
                [
                    'type' => 'object',
                    'properties' => [
                        'query' => ['type' => 'string', 'description' => 'Вопрос пользователя'],
                        'limit' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 5],
                    ],
                    'required' => ['query'],
                ],
            ),
        ];
    }

    /**
     * @param  array<string, mixed>  $parameters
     * @return array<string, mixed>
     */
    private static function tool(string $name, string $description, array $parameters): array
    {
        return [
            'type' => 'function',
            'function' => [
                'name' => $name,
                'description' => $description,
                'parameters' => $parameters,
            ],
        ];
    }
}
