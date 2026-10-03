<?php

return [
    'catalog' => [
        'admin.dashboard' => 'Панель и статистика',
        'admin.users' => 'Пользователи',
        'admin.clinics' => 'Клиники',
        'admin.doctors' => 'Врачи',
        'admin.reviews' => 'Отзывы',
        'admin.complaints' => 'Жалобы на отзывы',
        'admin.moderation' => 'Очередь модерации',
        'admin.duplicates' => 'Дубликаты',
        'admin.dictionaries' => 'Справочники',
        'admin.cms' => 'CMS-страницы',
        'admin.seo' => 'SEO-шаблоны',
        'admin.roles' => 'Роли и права',
        'admin.audit' => 'Журнал аудита',
    ],

    'defaults' => [
        'user' => [
            'name' => 'Пользователь',
            'description' => 'Пациент: заявки, избранное, отзывы.',
            'permissions' => [],
        ],
        'clinic_owner' => [
            'name' => 'Представитель клиники',
            'description' => 'Управляет своей организацией, филиалами и врачами.',
            'permissions' => [],
        ],
        'moderator' => [
            'name' => 'Модератор',
            'description' => 'Проверка клиник, врачей, отзывов и жалоб.',
            'permissions' => [
                'admin.dashboard', 'admin.clinics', 'admin.doctors', 'admin.reviews',
                'admin.complaints', 'admin.moderation', 'admin.duplicates',
            ],
        ],
        'content_manager' => [
            'name' => 'Контент-менеджер',
            'description' => 'Справочники, CMS и SEO.',
            'permissions' => ['admin.dashboard', 'admin.dictionaries', 'admin.cms', 'admin.seo'],
        ],
        'superadmin' => [
            'name' => 'Суперадмин',
            'description' => 'Полный доступ ко всем разделам.',
            'permissions' => ['*'],
        ],
    ],
];
