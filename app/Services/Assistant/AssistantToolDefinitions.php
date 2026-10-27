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
                'Поиск опубликованных стоматологических клиник в текущем городе пользователя.',
                [
                    'type' => 'object',
                    'properties' => [
                        'query' => ['type' => 'string', 'description' => 'Услуга, симптом или название клиники'],
                        'limit' => ['type' => 'integer', 'description' => 'Сколько клиник вернуть (1–8)', 'minimum' => 1, 'maximum' => 8],
                    ],
                    'required' => ['query'],
                ],
            ),
            self::tool(
                'get_clinic',
                'Карточка одной опубликованной клиники по slug из каталога.',
                [
                    'type' => 'object',
                    'properties' => [
                        'slug' => ['type' => 'string', 'description' => 'Slug клиники из search_clinics'],
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
                'Создать заявку на звонок клиники после явного согласия пользователя на обработку ПД (consent=true).',
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
