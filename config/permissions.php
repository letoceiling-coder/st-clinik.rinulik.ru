<?php

/*
 * Права админ-панели. Каждое право открывает конкретные разделы (см. hint) и проверяется
 * одинаково в маршрутах и в меню. sensitive — чем опасно право: деньги, данные пациентов,
 * ключи интеграций или управление доступом.
 */
return [
    'groups' => [
        'work' => 'Ежедневная работа',
        'catalog' => 'Каталог и модерация',
        'sales' => 'Подключение клиник и продажи',
        'money' => 'Деньги и тарифы',
        'content' => 'Контент и SEO',
        'system' => 'Система и доступ',
    ],

    'catalog' => [
        'admin.dashboard' => ['label' => 'Вход в админ-панель и обзор', 'group' => 'work', 'hint' => 'Главная админки со сводными цифрами. Без этого права в админку не войти.'],
        'admin.appointments' => ['label' => 'Записи пациентов', 'group' => 'work', 'hint' => 'Раздел «Записи»: онлайн-записи всех клиник с именами и телефонами пациентов.', 'sensitive' => 'patients'],
        'admin.reports' => ['label' => 'Отчёты и выгрузки', 'group' => 'work', 'hint' => 'Раздел «Отчёты»: выгрузка заявок, записей и платежей в файлы.', 'sensitive' => 'patients'],
        'admin.analytics' => ['label' => 'Аналитика', 'group' => 'work', 'hint' => 'Раздел «Аналитика»: посещаемость, конверсии и воронка без персональных данных.'],
        'admin.assistant' => ['label' => 'AI-ассистент', 'group' => 'work', 'hint' => 'Настройки ассистента, база знаний и диалоги с пациентами.', 'sensitive' => 'patients'],

        'admin.clinics' => ['label' => 'Клиники', 'group' => 'catalog', 'hint' => 'Список клиник, добавление вручную, редактирование профиля, публикация и блокировка.'],
        'admin.doctors' => ['label' => 'Врачи', 'group' => 'catalog', 'hint' => 'Модерация и публикация врачей.'],
        'admin.reviews' => ['label' => 'Отзывы', 'group' => 'catalog', 'hint' => 'Модерация отзывов пациентов.'],
        'admin.complaints' => ['label' => 'Жалобы на отзывы', 'group' => 'catalog', 'hint' => 'Жалобы клиник и пользователей на отзывы.'],
        'admin.moderation' => ['label' => 'Очередь модерации', 'group' => 'catalog', 'hint' => 'Проверка изменений клиник, фото и документов (лицензии).'],
        'admin.duplicates' => ['label' => 'Дубликаты', 'group' => 'catalog', 'hint' => 'Поиск и объединение дублей клиник.'],

        'admin.parser' => ['label' => 'Парсер клиник', 'group' => 'sales', 'hint' => 'Сбор стоматологий с Яндекс Карт, контакты организаций и импорт в черновики.'],
        'offers.manage' => ['label' => 'КП, демо и кампании', 'group' => 'sales', 'hint' => 'Коммерческие предложения клиникам, демо-кабинеты, кампании отправки КП.'],
        'admin.broadcasts' => ['label' => 'Рассылки подписчикам', 'group' => 'sales', 'hint' => 'Рассылки пользователям платформы в MAX, VK, почту и push.'],

        'admin.promotions' => ['label' => 'Продвижение клиник', 'group' => 'money', 'hint' => 'Пакеты продвижения, бонусы и премиум-оформление карточек, заказы клиник.'],
        'admin.tariffs' => ['label' => 'Тарифы и пробный период', 'group' => 'money', 'hint' => 'Тарифы подписки клиник и условия пробного периода.', 'sensitive' => 'money'],
        'admin.finance' => ['label' => 'Финансы и возвраты', 'group' => 'money', 'hint' => 'Платежи клиник, настройки оплаты и возвраты денег.', 'sensitive' => 'money'],

        'admin.site_display' => ['label' => 'Сайт: карта и реклама', 'group' => 'content', 'hint' => 'Отображение карты и рекламных блоков на сайте.'],
        'admin.dictionaries' => ['label' => 'Справочники и география', 'group' => 'content', 'hint' => 'Регионы, города, районы, направления, услуги, «что беспокоит», свойства клиник.'],
        'admin.cms' => ['label' => 'CMS-страницы', 'group' => 'content', 'hint' => 'Тексты страниц: о сервисе, политика, соглашения.'],
        'admin.seo' => ['label' => 'SEO-шаблоны', 'group' => 'content', 'hint' => 'Шаблоны заголовков и описаний страниц.'],

        'admin.users' => ['label' => 'Пользователи', 'group' => 'system', 'hint' => 'Список пользователей, блокировка и назначение ролей (не выше собственных прав).', 'sensitive' => 'access'],
        'admin.roles' => ['label' => 'Роли и права', 'group' => 'system', 'hint' => 'Создание ролей и выдача прав (только тех, что есть у самого сотрудника).', 'sensitive' => 'access'],
        'admin.integrations' => ['label' => 'Интеграции', 'group' => 'system', 'hint' => 'Ключи и токены: почта, SMS, MAX, VK, оплата, OpenRouter, карты.', 'sensitive' => 'keys'],
        'admin.audit' => ['label' => 'Журнал аудита', 'group' => 'system', 'hint' => 'Кто и что менял в системе.'],
    ],

    'sensitive' => [
        'patients' => 'данные пациентов',
        'money' => 'деньги',
        'keys' => 'ключи и токены',
        'access' => 'управление доступом',
    ],

    /* Роли сайта и кабинета клиники: в админ-панель не пускают, права админки им не назначаются. */
    'site_roles' => ['user', 'clinic_owner'],

    'defaults' => [
        'user' => [
            'name' => 'Пользователь',
            'description' => 'Пациент на сайте: записи, заявки, избранное, отзывы.',
            'permissions' => [],
        ],
        'clinic_owner' => [
            'name' => 'Представитель клиники',
            'description' => 'Кабинет клиники: организация, филиалы, врачи, цены, заявки. Права сотрудников клиники настраиваются в самом кабинете.',
            'permissions' => [],
        ],
        'moderator' => [
            'name' => 'Модератор',
            'description' => 'Проверка клиник, врачей, отзывов, жалоб и документов.',
            'permissions' => [
                'admin.dashboard', 'admin.clinics', 'admin.doctors', 'admin.reviews',
                'admin.complaints', 'admin.moderation', 'admin.duplicates',
            ],
        ],
        'content_manager' => [
            'name' => 'Контент-менеджер',
            'description' => 'Справочники, тексты страниц, SEO, карта и реклама на сайте.',
            'permissions' => ['admin.dashboard', 'admin.dictionaries', 'admin.cms', 'admin.seo', 'admin.site_display', 'admin.analytics'],
        ],
        'sales_manager' => [
            'name' => 'Менеджер по подключению клиник',
            'description' => 'Парсер → КП и демо → кампании → пробный период → публикация клиники.',
            'permissions' => ['admin.dashboard', 'admin.parser', 'offers.manage', 'admin.clinics', 'admin.promotions', 'admin.analytics'],
        ],
        'support_operator' => [
            'name' => 'Оператор поддержки',
            'description' => 'Записи и заявки пациентов, диалоги AI-ассистента, жалобы на отзывы.',
            'permissions' => ['admin.dashboard', 'admin.appointments', 'admin.assistant', 'admin.complaints', 'admin.reviews'],
        ],
        'finance_manager' => [
            'name' => 'Финансист',
            'description' => 'Платежи и возвраты, тарифы и пробный период, финансовые отчёты.',
            'permissions' => ['admin.dashboard', 'admin.finance', 'admin.tariffs', 'admin.reports', 'admin.analytics'],
        ],
        'superadmin' => [
            'name' => 'Суперадмин',
            'description' => 'Полный доступ ко всем разделам, назначение суперадминов.',
            'permissions' => ['*'],
        ],
    ],
];
