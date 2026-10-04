<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Карточки интеграций в админ-панели
    |--------------------------------------------------------------------------
    |
    | key — префикс полей в БД (integration_settings.key).
    | config — dot-пути config(), которые перезаписываются из БД при boot.
    |
    | @return array<string, array<string, mixed>>
    */
    'groups' => [
        'yookassa' => [
            'title' => 'ЮKassa',
            'description' => 'Приём оплаты за продвижение клиник в личном кабинете.',
            'docs_url' => 'https://yookassa.ru/developers',
            'fields' => [
                'shop_id' => ['label' => 'Shop ID (идентификатор магазина)', 'type' => 'text', 'secret' => false],
                'secret_key' => ['label' => 'Secret Key (секретный ключ)', 'type' => 'password', 'secret' => true],
                'return_url' => ['label' => 'Return URL после оплаты', 'type' => 'url', 'secret' => false],
            ],
            'config' => [
                'shop_id' => 'yookassa.shop_id',
                'secret_key' => 'yookassa.secret_key',
                'return_url' => 'yookassa.return_url',
            ],
            'instructions' => <<<'MD'
1. Зарегистрируйте магазин в [личном кабинете ЮKassa](https://yookassa.ru/).
2. В разделе **Интеграция → Ключи API** скопируйте **shopId** и **Секретный ключ**.
3. Укажите **Return URL**: `https://ваш-домен/clinic-cabinet/promotions/return/{order}` — система подставит ID заказа автоматически; можно указать базовый URL без `{order}`.
4. В **HTTP-уведомлениях** добавьте webhook: `https://ваш-домен/payments/yookassa/webhook`, события `payment.succeeded` и `payment.canceled`.
5. Сохраните настройки здесь и проверьте оплату тестовым платежом из кабинета клиники → **Продвижение**.
MD,
        ],

        'yandex_maps' => [
            'title' => 'Яндекс Карты',
            'description' => 'Карта клиник в каталоге и на странице филиала.',
            'docs_url' => 'https://yandex.ru/dev/maps/jsapi/doc/2.1/quick-start/index.html',
            'fields' => [
                'api_key' => ['label' => 'API-ключ JavaScript API', 'type' => 'password', 'secret' => true],
            ],
            'config' => [
                'api_key' => 'services.yandex.maps_api_key',
            ],
            'instructions' => <<<'MD'
1. Откройте [Кабинет разработчика Яндекса](https://developer.tech.yandex.ru/).
2. Создайте ключ для **JavaScript API и HTTP Геокодер**.
3. В ограничениях укажите домены сайта (например `st-clinik.rinulik.ru`, `*.rinulik.ru`).
4. Вставьте ключ в поле выше и сохраните — карта появится в каталоге и на страницах клиник.
MD,
        ],

        'yandex_oauth' => [
            'title' => 'Яндекс ID',
            'description' => 'Быстрый вход пациентов через Яндекс (OAuth 2.0).',
            'docs_url' => 'https://yandex.ru/dev/id/doc/ru/',
            'fields' => [
                'client_id' => ['label' => 'Client ID', 'type' => 'text', 'secret' => false],
                'client_secret' => ['label' => 'Client Secret', 'type' => 'password', 'secret' => true],
                'redirect_uri' => ['label' => 'Redirect URI', 'type' => 'url', 'secret' => false],
                'enabled' => ['label' => 'Включить вход через Яндекс', 'type' => 'checkbox', 'secret' => false],
            ],
            'config' => [
                'client_id' => 'services.yandex_oauth.client_id',
                'client_secret' => 'services.yandex_oauth.client_secret',
                'redirect_uri' => 'services.yandex_oauth.redirect_uri',
                'enabled' => 'services.yandex_oauth.enabled',
            ],
            'instructions' => <<<'MD'
1. Создайте приложение в [Яндекс OAuth](https://oauth.yandex.ru/client/new).
2. Платформа: **Веб-сервисы**. Redirect URI: `https://ваш-домен/auth/yandex/callback`.
3. Запросите права: `login:email`, `login:info`.
4. Скопируйте **ID** и **Пароль** приложения в поля выше.
5. После включения кнопка «Войти через Яндекс» появится на странице входа (требуется доработка маршрута OAuth на backend).
MD,
        ],

        'vk_oauth' => [
            'title' => 'VK ID',
            'description' => 'Быстрый вход через VK ID (OAuth 2.1).',
            'docs_url' => 'https://id.vk.com/about/business/go/docs/ru/vkid/latest/vk-id/connection/create-application',
            'fields' => [
                'client_id' => ['label' => 'App ID (client_id)', 'type' => 'text', 'secret' => false],
                'client_secret' => ['label' => 'Защищённый ключ', 'type' => 'password', 'secret' => true],
                'redirect_uri' => ['label' => 'Redirect URI', 'type' => 'url', 'secret' => false],
                'enabled' => ['label' => 'Включить вход через VK', 'type' => 'checkbox', 'secret' => false],
            ],
            'config' => [
                'client_id' => 'services.vk_oauth.client_id',
                'client_secret' => 'services.vk_oauth.client_secret',
                'redirect_uri' => 'services.vk_oauth.redirect_uri',
                'enabled' => 'services.vk_oauth.enabled',
            ],
            'instructions' => <<<'MD'
1. Создайте приложение в [кабинете VK ID](https://id.vk.com/about/business/go).
2. Тип: **Web**. Базовый домен и Redirect URI: `https://ваш-домен/auth/vk/callback`.
3. Скопируйте **ID приложения** и **Защищённый ключ**.
4. Включите интеграцию — кнопка входа будет доступна после подключения OAuth-маршрутов.
MD,
        ],

        'max_oauth' => [
            'title' => 'MAX',
            'description' => 'Быстрая авторизация через мессенджер MAX (OAuth).',
            'docs_url' => 'https://dev.max.ru/',
            'fields' => [
                'client_id' => ['label' => 'Client ID', 'type' => 'text', 'secret' => false],
                'client_secret' => ['label' => 'Client Secret', 'type' => 'password', 'secret' => true],
                'redirect_uri' => ['label' => 'Redirect URI', 'type' => 'url', 'secret' => false],
                'enabled' => ['label' => 'Включить вход через MAX', 'type' => 'checkbox', 'secret' => false],
            ],
            'config' => [
                'client_id' => 'services.max_oauth.client_id',
                'client_secret' => 'services.max_oauth.client_secret',
                'redirect_uri' => 'services.max_oauth.redirect_uri',
                'enabled' => 'services.max_oauth.enabled',
            ],
            'instructions' => <<<'MD'
1. Зарегистрируйте приложение в [кабинете разработчика MAX](https://dev.max.ru/).
2. Укажите Redirect URI: `https://ваш-домен/auth/max/callback`.
3. Получите **Client ID** и **Client Secret**, вставьте в поля выше.
4. Включите интеграцию — вход через MAX будет доступен после подключения OAuth на backend.
MD,
        ],

        'mail' => [
            'title' => 'Почта (SMTP)',
            'description' => 'Отправка писем пользователям и уведомлений.',
            'docs_url' => 'https://laravel.com/docs/mail',
            'fields' => [
                'mailer' => ['label' => 'Драйвер (smtp, log, …)', 'type' => 'text', 'secret' => false],
                'host' => ['label' => 'SMTP-хост', 'type' => 'text', 'secret' => false],
                'port' => ['label' => 'Порт', 'type' => 'text', 'secret' => false],
                'username' => ['label' => 'Логин', 'type' => 'text', 'secret' => false],
                'password' => ['label' => 'Пароль', 'type' => 'password', 'secret' => true],
                'from_address' => ['label' => 'Email отправителя', 'type' => 'text', 'secret' => false],
                'from_name' => ['label' => 'Имя отправителя', 'type' => 'text', 'secret' => false],
            ],
            'config' => [
                'mailer' => 'mail.default',
                'host' => 'mail.mailers.smtp.host',
                'port' => 'mail.mailers.smtp.port',
                'username' => 'mail.mailers.smtp.username',
                'password' => 'mail.mailers.smtp.password',
                'from_address' => 'mail.from.address',
                'from_name' => 'mail.from.name',
            ],
            'instructions' => <<<'MD'
1. Получите SMTP-данные у почтового провайдера (Yandex 360, Mail.ru, SendGrid и т.д.).
2. Для тестов можно оставить драйвер `log` — письма будут писаться в лог Laravel.
3. После сохранения выполните на сервере `php artisan config:cache` или перезапустите деплой.
MD,
        ],
    ],

    'env_fallback' => [
        'yookassa.shop_id' => 'YOOKASSA_SHOP_ID',
        'yookassa.secret_key' => 'YOOKASSA_SECRET_KEY',
        'yookassa.return_url' => 'YOOKASSA_RETURN_URL',
        'services.yandex.maps_api_key' => 'YANDEX_MAPS_API_KEY',
    ],

];
