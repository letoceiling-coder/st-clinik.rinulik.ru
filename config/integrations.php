<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Центр интеграций в админ-панели
    |--------------------------------------------------------------------------
    |
    | Группа = карточка в админке. Ключ группы и поля — это integration_settings.group / key.
    | fields.*: label, type (text|password|url|email|number|checkbox|select), secret (шифруется в БД),
    |           optional (не влияет на статус «Настроено»), options (для select), placeholder, help.
    | config — dot-пути config(), которые перезаписываются из БД при старте приложения.
    | hints — адреса для копирования в кабинеты сервисов ({app_url} заменяется на APP_URL).
    | checkable — есть ли кнопка «Проверить подключение» (App\Services\Integrations\IntegrationChecker).
    |
    */

    'categories' => [
        'payments' => 'Платежи',
        'auth' => 'Вход и мессенджеры',
        'messaging' => 'Почта, SMS и push',
        'data' => 'Парсер и ИИ',
        'analytics' => 'Карты и аналитика',
        'infra' => 'Инфраструктура',
    ],

    'groups' => [

        'tbank' => [
            'category' => 'payments',
            'title' => 'Т‑Банк (эквайринг)',
            'description' => 'Единый эквайринг: продвижение клиник, тарифы и реклама (фаза 10). ЮKassa не используется.',
            'docs_url' => 'https://developer.tbank.ru/eacq/intro',
            'checkable' => true,
            'fields' => [
                'terminal_key' => ['label' => 'TerminalKey (идентификатор терминала)', 'type' => 'text', 'secret' => false],
                'password' => ['label' => 'Пароль терминала', 'type' => 'password', 'secret' => true],
                'success_url' => ['label' => 'Success URL после оплаты', 'type' => 'url', 'secret' => false, 'optional' => true],
                'fail_url' => ['label' => 'Fail URL при ошибке оплаты', 'type' => 'url', 'secret' => false, 'optional' => true],
            ],
            'config' => [
                'terminal_key' => 'tbank.terminal_key',
                'password' => 'tbank.password',
                'success_url' => 'tbank.success_url',
                'fail_url' => 'tbank.fail_url',
            ],
            'hints' => [
                'Notification URL (HTTP-уведомления)' => '{app_url}/payments/tbank/webhook',
                'Success URL (по умолчанию)' => '{app_url}/clinic-cabinet/promotions/return',
            ],
            'instructions' => <<<'MD'
1. Подключите интернет-эквайринг в [Т‑Бизнес](https://business.tbank.ru/) и создайте терминал для сайта.
2. Скопируйте **TerminalKey** и **Пароль** из настроек терминала (пароль показывается один раз — сохраните в надёжном месте).
3. В терминале включите уведомления **по протоколу HTTP** и укажите **Notification URL** из блока ниже (либо передавайте URL в каждом платеже — система делает это автоматически).
4. Success URL можно не заполнять — по умолчанию пользователь вернётся в кабинет клиники после оплаты продвижения.
5. **Проверить подключение** выполняет служебный запрос к API Т‑Банка без списания средств.
6. Статус оплаты система **всегда перепроверяет** через `GetState`, поэтому поддельное уведомление не отметит заказ оплаченным.
MD,
        ],

        'yandex_oauth' => [
            'category' => 'auth',
            'title' => 'Яндекс ID',
            'description' => 'Быстрый вход пациентов и клиник через Яндекс ID (OAuth 2.0).',
            'docs_url' => 'https://yandex.ru/dev/id/doc/ru/',
            'checkable' => true,
            'fields' => [
                'client_id' => ['label' => 'ClientID', 'type' => 'text', 'secret' => false],
                'client_secret' => ['label' => 'Client secret', 'type' => 'password', 'secret' => true],
                'redirect_uri' => ['label' => 'Redirect URI', 'type' => 'url', 'secret' => false, 'placeholder' => '{app_url}/auth/yandex/callback'],
                'enabled' => ['label' => 'Показывать кнопку «Войти через Яндекс»', 'type' => 'checkbox', 'secret' => false],
            ],
            'config' => [
                'client_id' => 'services.yandex_oauth.client_id',
                'client_secret' => 'services.yandex_oauth.client_secret',
                'redirect_uri' => 'services.yandex_oauth.redirect_uri',
                'enabled' => 'services.yandex_oauth.enabled',
            ],
            'hints' => [
                'Redirect URI' => '{app_url}/auth/yandex/callback',
                'Suggest Hostname' => '{app_host}',
            ],
            'instructions' => <<<'MD'
1. Откройте [oauth.yandex.ru](https://oauth.yandex.ru/client/new) → **Создать приложение**, тип — **Веб-сервисы**.
2. Укажите **Redirect URI** и **Suggest Hostname** из блока ниже.
3. Доступы: **Доступ к адресу электронной почты** (`login:email`), **Доступ к логину, имени и фамилии, полу** (`login:info`), по желанию **Доступ к номеру телефона** (`login:default_phone`).
4. Скопируйте **ClientID** и **Client secret** в поля выше и сохраните.
5. **Проверить подключение** проверяет формат ClientID и сверяет Redirect URI с адресом сайта. Полная проверка — вход по кнопке на странице входа.
MD,
        ],

        'vk_oauth' => [
            'category' => 'auth',
            'title' => 'VK ID',
            'description' => 'Быстрый вход через VK ID (OAuth 2.1 + PKCE).',
            'docs_url' => 'https://id.vk.com/about/business/go/docs/ru/vkid/latest/vk-id/connection/create-application',
            'checkable' => true,
            'fields' => [
                'client_id' => ['label' => 'ID приложения', 'type' => 'text', 'secret' => false],
                'client_secret' => ['label' => 'Защищённый ключ', 'type' => 'password', 'secret' => true],
                'redirect_uri' => ['label' => 'Доверенный Redirect URL', 'type' => 'url', 'secret' => false, 'placeholder' => '{app_url}/auth/vk/callback'],
                'enabled' => ['label' => 'Показывать кнопку «Войти через VK ID»', 'type' => 'checkbox', 'secret' => false],
            ],
            'config' => [
                'client_id' => 'services.vk_oauth.client_id',
                'client_secret' => 'services.vk_oauth.client_secret',
                'redirect_uri' => 'services.vk_oauth.redirect_uri',
                'enabled' => 'services.vk_oauth.enabled',
            ],
            'hints' => [
                'Базовый домен' => '{app_host}',
                'Доверенный Redirect URL' => '{app_url}/auth/vk/callback',
            ],
            'instructions' => <<<'MD'
1. Откройте [кабинет VK ID для бизнеса](https://id.vk.com/about/business/go) → **Добавить приложение**, платформа — **Web**.
2. Укажите **Базовый домен** и **Доверенный Redirect URL** из блока ниже.
3. В разделе **Доступы** включите email и телефон (если нужны).
4. Скопируйте **ID приложения** и **Защищённый ключ** в поля выше и сохраните.
5. **Проверить подключение** проверяет формат ID и совпадение Redirect URL с адресом сайта. Полная проверка — вход по кнопке.
MD,
        ],

        'max_bot' => [
            'category' => 'auth',
            'title' => 'MAX: бот и Mini App',
            'description' => 'Вход через бота MAX, уведомления подписчикам и Mini App каталога.',
            'docs_url' => 'https://dev.max.ru/docs-api',
            'checkable' => true,
            'fields' => [
                'bot_token' => ['label' => 'Токен бота', 'type' => 'password', 'secret' => true],
                'bot_username' => ['label' => 'Username бота (без @)', 'type' => 'text', 'secret' => false, 'optional' => true, 'help' => 'Заполняется автоматически при проверке подключения.'],
                'webhook_secret' => ['label' => 'Секрет webhook', 'type' => 'password', 'secret' => true, 'optional' => true, 'help' => 'Любая случайная строка 16–64 символа; MAX передаёт её в заголовке X-Max-Bot-Api-Secret.'],
                'mini_app_url' => ['label' => 'URL Mini App', 'type' => 'url', 'secret' => false, 'optional' => true, 'placeholder' => '{app_url}/max'],
                'login_enabled' => ['label' => 'Показывать кнопку «Войти через MAX»', 'type' => 'checkbox', 'secret' => false],
            ],
            'config' => [
                'bot_token' => 'services.max_bot.token',
                'bot_username' => 'services.max_bot.username',
                'webhook_secret' => 'services.max_bot.webhook_secret',
                'mini_app_url' => 'services.max_bot.mini_app_url',
                'login_enabled' => 'services.max_bot.login_enabled',
            ],
            'hints' => [
                'URL webhook' => '{app_url}/webhooks/max',
                'URL Mini App' => '{app_url}/max',
                'Чек-лист публикации' => '{app_url}/admin/integrations/max-publish',
            ],
            'instructions' => <<<'MD'
1. Боты MAX создаются только организациями: владелец (ИП или ООО заказчика) проходит верификацию на [business.max.ru](https://business.max.ru/).
2. В кабинете партнёра **Чат-боты → Создать бота**: имя, username, аватар, описание. После модерации бот становится доступен.
3. В настройках бота → **Интеграция** скопируйте **токен** и вставьте его выше.
4. Для Mini App в настройках бота укажите URL Mini App из блока ниже — каталог откроется внутри MAX.
5. **Проверить подключение** вызывает `GET /me` API MAX и показывает имя и username бота.
6. Ограничение платформы: бот не может написать пользователю первым — только после того, как пользователь сам запустил бота.
MD,
        ],

        'vk_community' => [
            'category' => 'auth',
            'title' => 'Сообщество VK',
            'description' => 'Уведомления подписчикам от имени сообщества VK (только тем, кто разрешил сообщения).',
            'docs_url' => 'https://dev.vk.com/ru/api/community-messages/getting-started',
            'checkable' => true,
            'fields' => [
                'group_id' => ['label' => 'ID сообщества (число)', 'type' => 'text', 'secret' => false],
                'access_token' => ['label' => 'Ключ доступа сообщества', 'type' => 'password', 'secret' => true],
                'confirmation_code' => ['label' => 'Строка подтверждения Callback API', 'type' => 'text', 'secret' => false, 'optional' => true],
                'callback_secret' => ['label' => 'Секретный ключ Callback API', 'type' => 'password', 'secret' => true, 'optional' => true],
                'test_user_id' => ['label' => 'ID пользователя VK для проверки', 'type' => 'text', 'secret' => false, 'optional' => true, 'help' => 'Проверка покажет, разрешил ли этот пользователь сообщения от сообщества.'],
            ],
            'config' => [
                'group_id' => 'services.vk_community.group_id',
                'access_token' => 'services.vk_community.access_token',
                'confirmation_code' => 'services.vk_community.confirmation_code',
                'callback_secret' => 'services.vk_community.callback_secret',
                'test_user_id' => 'services.vk_community.test_user_id',
            ],
            'hints' => [
                'Адрес Callback API' => '{app_url}/webhooks/vk',
            ],
            'instructions' => <<<'MD'
1. В сообществе: **Управление → Сообщения** — включите сообщения сообщества.
2. **Управление → Работа с API → Ключи доступа → Создать ключ**, права: **сообщения сообщества**, **управление сообществом**. Скопируйте ключ.
3. ID сообщества — число из адреса `vk.com/club123456` (или в **Управление → Основная информация**).
4. **Работа с API → Callback API**: версия API 5.199, адрес из блока ниже; скопируйте **строку подтверждения** и задайте **секретный ключ**. События: `message_allow`, `message_deny`.
5. **Проверить подключение** вызывает `groups.getById` и, если задан ID пользователя, `messages.isMessagesFromGroupAllowed`.
6. Ограничение VK: писать можно только пользователям, которые разрешили сообщения от сообщества (виджет на сайте или первое сообщение).
MD,
        ],

        'mail' => [
            'category' => 'messaging',
            'title' => 'Почта: системные письма',
            'description' => 'Восстановление пароля, подтверждение email, уведомления пациентам и клиникам.',
            'docs_url' => 'https://laravel.com/docs/mail',
            'checkable' => true,
            'fields' => [
                'mailer' => ['label' => 'Способ отправки', 'type' => 'select', 'secret' => false, 'options' => ['smtp' => 'SMTP', 'log' => 'Только в лог (без отправки)']],
                'host' => ['label' => 'SMTP-хост', 'type' => 'text', 'secret' => false, 'placeholder' => 'smtp.yandex.ru'],
                'port' => ['label' => 'Порт', 'type' => 'number', 'secret' => false, 'placeholder' => '465'],
                'scheme' => ['label' => 'Шифрование', 'type' => 'select', 'secret' => false, 'optional' => true, 'options' => ['smtps' => 'SSL/TLS (порт 465)', 'smtp' => 'STARTTLS или без шифрования (587, 25)']],
                'username' => ['label' => 'Логин', 'type' => 'text', 'secret' => false],
                'password' => ['label' => 'Пароль (пароль приложения)', 'type' => 'password', 'secret' => true],
                'from_address' => ['label' => 'Email отправителя', 'type' => 'email', 'secret' => false],
                'from_name' => ['label' => 'Имя отправителя', 'type' => 'text', 'secret' => false, 'optional' => true],
            ],
            'config' => [
                'mailer' => 'mail.default',
                'host' => 'mail.mailers.smtp.host',
                'port' => 'mail.mailers.smtp.port',
                'scheme' => 'mail.mailers.smtp.scheme',
                'username' => 'mail.mailers.smtp.username',
                'password' => 'mail.mailers.smtp.password',
                'from_address' => 'mail.from.address',
                'from_name' => 'mail.from.name',
            ],
            'instructions' => <<<'MD'
1. Возьмите SMTP-доступ у почтового сервиса домена: **Beget** (`smtp.beget.com`, порт **465**, SSL, логин — полный email), Яндекс 360 (`smtp.yandex.ru`, 465), Mail.ru для бизнеса (`smtp.mail.ru`, 465), Unisender Go, SendPulse и т. д.
2. Для Яндекс 360 и Mail.ru создайте **пароль приложения** в настройках безопасности ящика — обычный пароль не подойдёт.
3. Email отправителя должен совпадать с ящиком или доменом, для которого настроены SPF и DKIM, иначе письма попадут в спам.
4. **Проверить подключение** отправит тестовое письмо на ваш email администратора.
MD,
        ],

        'mail_offers' => [
            'category' => 'messaging',
            'title' => 'Почта: коммерческие предложения',
            'description' => 'Отдельный ящик для рассылки КП клиникам, чтобы не портить репутацию системных писем.',
            'docs_url' => 'https://www.consultant.ru/document/cons_doc_LAW_58968/',
            'checkable' => true,
            'fields' => [
                'host' => ['label' => 'SMTP-хост', 'type' => 'text', 'secret' => false],
                'port' => ['label' => 'Порт', 'type' => 'number', 'secret' => false, 'placeholder' => '465'],
                'scheme' => ['label' => 'Шифрование', 'type' => 'select', 'secret' => false, 'optional' => true, 'options' => ['smtps' => 'SSL/TLS (порт 465)', 'smtp' => 'STARTTLS или без шифрования (587, 25)']],
                'username' => ['label' => 'Логин', 'type' => 'text', 'secret' => false],
                'password' => ['label' => 'Пароль (пароль приложения)', 'type' => 'password', 'secret' => true],
                'from_address' => ['label' => 'Email отправителя', 'type' => 'email', 'secret' => false],
                'from_name' => ['label' => 'Имя отправителя', 'type' => 'text', 'secret' => false, 'optional' => true],
                'dkim_selector' => ['label' => 'DKIM-селектор (для проверки DNS)', 'type' => 'text', 'secret' => false, 'optional' => true, 'placeholder' => 'mail'],
            ],
            'config' => [
                'host' => 'mail.mailers.offers.host',
                'port' => 'mail.mailers.offers.port',
                'scheme' => 'mail.mailers.offers.scheme',
                'username' => 'mail.mailers.offers.username',
                'password' => 'mail.mailers.offers.password',
                'from_address' => 'services.mail_offers.from_address',
                'from_name' => 'services.mail_offers.from_name',
                'dkim_selector' => 'services.mail_offers.dkim_selector',
            ],
            'instructions' => <<<'MD'
1. Рекомендуется отдельный домен или поддомен (например `offers.ваш-домен.ru`) и отдельный ящик — жалобы на рассылку не затронут системные письма.
2. В DNS домена отправителя добавьте SPF, DKIM (селектор выдаёт почтовый сервис) и DMARC.
3. **Проверить подключение** отправит тестовое письмо на ваш email и проверит SPF, DKIM и DMARC в DNS.
4. Юридически КП — реклама (ст. 18 ФЗ «О рекламе»): в каждом письме будет ссылка на отписку, отписавшиеся попадают в стоп-лист.
MD,
        ],

        'sms' => [
            'category' => 'messaging',
            'title' => 'SMS',
            'description' => 'Ссылки на КП, коды подтверждения и критичные уведомления.',
            'docs_url' => null,
            'checkable' => true,
            'fields' => [
                'provider' => ['label' => 'Провайдер', 'type' => 'select', 'secret' => false, 'options' => ['smsru' => 'SMS.ru', 'smsc' => 'SMSC.ru', 'smsaero' => 'SMS Aero']],
                'login' => ['label' => 'Логин / email (SMSC, SMS Aero)', 'type' => 'text', 'secret' => false, 'optional' => true],
                'api_key' => ['label' => 'API-ключ или пароль', 'type' => 'password', 'secret' => true],
                'sender' => ['label' => 'Имя отправителя', 'type' => 'text', 'secret' => false, 'optional' => true, 'help' => 'Буквенное имя, зарегистрированное у провайдера. Пусто — имя по умолчанию.'],
            ],
            'config' => [
                'provider' => 'services.sms.provider',
                'login' => 'services.sms.login',
                'api_key' => 'services.sms.api_key',
                'sender' => 'services.sms.sender',
            ],
            'instructions' => <<<'MD'
1. **SMS.ru**: [кабинет](https://sms.ru/) → **Программистам** → скопируйте `api_id` в поле «API-ключ». Логин не нужен.
2. **SMSC.ru**: логин кабинета и пароль (или API-ключ из **Настройки → Пароль для API**).
3. **SMS Aero**: email аккаунта в поле «Логин» и API-ключ из [кабинета](https://smsaero.ru/cabinet/settings/apikey/).
4. Буквенное имя отправителя регистрируется у провайдера на юрлицо или ИП заказчика (обычно 1–3 недели, у операторов есть абонентская плата).
5. **Проверить подключение** запрашивает баланс — SMS не отправляется и деньги не списываются.
MD,
        ],

        'web_push' => [
            'category' => 'messaging',
            'title' => 'Web Push',
            'description' => 'Push-уведомления в браузере (о записи, ответах на отзывы, акциях подписок).',
            'docs_url' => 'https://web.dev/articles/push-notifications-web-push-protocol',
            'checkable' => true,
            'generatable' => true,
            'fields' => [
                'public_key' => ['label' => 'VAPID public key', 'type' => 'text', 'secret' => false],
                'private_key' => ['label' => 'VAPID private key', 'type' => 'password', 'secret' => true],
                'subject' => ['label' => 'Контакт (mailto: или https://)', 'type' => 'text', 'secret' => false, 'placeholder' => 'mailto:support@example.ru'],
            ],
            'config' => [
                'public_key' => 'services.webpush.public_key',
                'private_key' => 'services.webpush.private_key',
                'subject' => 'services.webpush.subject',
            ],
            'instructions' => <<<'MD'
1. Нажмите **Сгенерировать ключи** — пара VAPID-ключей создастся и сохранится автоматически.
2. Укажите контакт: `mailto:` с адресом поддержки или адрес сайта.
3. Не меняйте ключи после запуска: все подписки браузеров привязаны к публичному ключу и после смены перестанут работать.
4. **Проверить подключение** проверяет формат ключей и что публичный ключ соответствует приватному.
5. В **Личном кабинете → Профиль** включите push в том браузере, где хотите получать уведомления, затем нажмите **Отправить тестовый push** на этой странице.
MD,
        ],

        'parser' => [
            'category' => 'data',
            'title' => 'Парсер организаций',
            'description' => 'parser.rinulik.ru — сбор карточек клиник для черновиков и КП.',
            'docs_url' => 'https://parser.rinulik.ru',
            'checkable' => true,
            'fields' => [
                'base_url' => ['label' => 'Базовый URL', 'type' => 'url', 'secret' => false, 'placeholder' => 'https://parser.rinulik.ru'],
                'api_key' => ['label' => 'API-ключ (pai_…)', 'type' => 'password', 'secret' => true],
                'task_cost_limit_usd' => ['label' => 'Лимит стоимости одной задачи, USD', 'type' => 'number', 'secret' => false, 'optional' => true],
                'daily_budget_usd' => ['label' => 'Суточный бюджет, USD', 'type' => 'number', 'secret' => false, 'optional' => true],
            ],
            'config' => [
                'base_url' => 'services.parser_ai.base_url',
                'api_key' => 'services.parser_ai.api_key',
                'task_cost_limit_usd' => 'services.parser_ai.task_cost_limit_usd',
                'daily_budget_usd' => 'services.parser_ai.daily_budget_usd',
            ],
            'instructions' => <<<'MD'
1. Ключ выдаётся в кабинете parser.rinulik.ru (формат `pai_…`). Если ключ где-то публиковался (переписка, документы) — перевыпустите его.
2. Лимиты защищают от случайно дорогих задач: задача дороже лимита не будет создана, после исчерпания суточного бюджета новые задачи ставятся на завтра.
3. **Проверить подключение** вызывает `GET /health` и `GET /api/v1/workers` и показывает, сколько исполнителей онлайн.
4. Все организации из парсера импортируются только черновиками — публикует их администратор вручную.
MD,
        ],

        'openrouter' => [
            'category' => 'data',
            'title' => 'OpenRouter (ассистент)',
            'description' => 'Языковые модели для ассистента на сайте. Сейчас ассистент работает в демо-режиме.',
            'docs_url' => 'https://openrouter.ai/docs/quickstart',
            'checkable' => true,
            'fields' => [
                'api_key' => ['label' => 'API-ключ (sk-or-…)', 'type' => 'password', 'secret' => true],
                'base_url' => ['label' => 'Базовый URL API', 'type' => 'url', 'secret' => false, 'optional' => true, 'placeholder' => 'https://openrouter.ai/api/v1'],
                'proxy' => ['label' => 'HTTP-прокси для запросов', 'type' => 'password', 'secret' => true, 'optional' => true, 'help' => 'Формат http://user:pass@host:port. Нужен, если OpenRouter недоступен с сервера.'],
                'chat_model' => ['label' => 'Модель диалога', 'type' => 'text', 'secret' => false, 'placeholder' => 'openai/gpt-4o-mini'],
                'fallback_model' => ['label' => 'Резервная модель', 'type' => 'text', 'secret' => false, 'optional' => true, 'placeholder' => 'google/gemini-2.0-flash-001'],
                'embedding_model' => ['label' => 'Модель эмбеддингов', 'type' => 'text', 'secret' => false, 'optional' => true, 'placeholder' => 'openai/text-embedding-3-small'],
                'max_tokens' => ['label' => 'Лимит токенов ответа', 'type' => 'number', 'secret' => false, 'optional' => true, 'placeholder' => '800'],
                'daily_budget_usd' => ['label' => 'Суточный бюджет, USD', 'type' => 'number', 'secret' => false, 'optional' => true],
                'enabled' => ['label' => 'Включить ассистента на сайте', 'type' => 'checkbox', 'secret' => false],
            ],
            'config' => [
                'api_key' => 'services.openrouter.api_key',
                'base_url' => 'services.openrouter.base_url',
                'proxy' => 'services.openrouter.proxy',
                'chat_model' => 'services.openrouter.chat_model',
                'fallback_model' => 'services.openrouter.fallback_model',
                'embedding_model' => 'services.openrouter.embedding_model',
                'max_tokens' => 'services.openrouter.max_tokens',
                'daily_budget_usd' => 'services.openrouter.daily_budget_usd',
                'enabled' => 'services.openrouter.enabled',
            ],
            'instructions' => <<<'MD'
1. Зарегистрируйтесь на [openrouter.ai](https://openrouter.ai/), пополните баланс и создайте ключ в [Settings → Keys](https://openrouter.ai/settings/keys). На ключе задайте лимит расходов.
2. Идентификаторы моделей берутся из [каталога](https://openrouter.ai/models), например `openai/gpt-4o-mini`.
3. OpenRouter блокирует запросы с части российских IP. Если проверка показывает «Access denied», укажите HTTP-прокси за пределами РФ или свой шлюз в поле «Базовый URL».
4. **Проверить подключение** запрашивает данные ключа (`GET /key`: остаток и лимит) и проверяет, что выбранные модели существуют. Платных запросов к моделям проверка не делает.
5. Ключ хранится в базе в зашифрованном виде и не показывается после сохранения.
MD,
        ],

        'yandex_maps' => [
            'category' => 'analytics',
            'title' => 'Яндекс Карты',
            'description' => 'Карта клиник в каталоге и на странице филиала, геокодирование адресов.',
            'docs_url' => 'https://yandex.ru/dev/jsapi-v2-1/doc/ru/',
            'checkable' => true,
            'fields' => [
                'api_key' => ['label' => 'Ключ «JavaScript API и HTTP Геокодер»', 'type' => 'password', 'secret' => true],
            ],
            'config' => [
                'api_key' => 'services.yandex.maps_api_key',
            ],
            'hints' => [
                'Ограничение по HTTP Referer' => '{app_host}',
            ],
            'instructions' => <<<'MD'
1. Откройте [Кабинет разработчика](https://developer.tech.yandex.ru/services) → **Подключить API** → **JavaScript API и HTTP Геокодер**.
2. В настройках ключа добавьте ограничение по HTTP Referer — домен сайта из блока ниже.
3. Вставьте ключ и сохраните — карта появится в каталоге и на страницах клиник.
4. **Проверить подключение** выполняет тестовый геокод адреса «Краснодар».
MD,
        ],

        'yandex_metrika' => [
            'category' => 'analytics',
            'title' => 'Яндекс Метрика',
            'description' => 'Счётчик посещаемости на всех публичных страницах и цели (заявки, записи).',
            'docs_url' => 'https://yandex.ru/support/metrica/',
            'checkable' => true,
            'fields' => [
                'counter_id' => ['label' => 'Номер счётчика', 'type' => 'text', 'secret' => false],
                'webvisor' => ['label' => 'Вебвизор', 'type' => 'checkbox', 'secret' => false],
                'oauth_token' => ['label' => 'OAuth-токен API Метрики (для отчётов в админке)', 'type' => 'password', 'secret' => true, 'optional' => true],
            ],
            'config' => [
                'counter_id' => 'services.yandex_metrika.counter_id',
                'webvisor' => 'services.yandex_metrika.webvisor',
                'oauth_token' => 'services.yandex_metrika.oauth_token',
            ],
            'instructions' => <<<'MD'
1. Создайте счётчик на [metrika.yandex.ru](https://metrika.yandex.ru/) для домена сайта. Код вставлять не нужно — сайт подключит его сам по номеру.
2. Вебвизор записывает сессии посетителей; включайте, только если это отражено в политике обработки персональных данных.
3. OAuth-токен нужен для отчётов в админке: создайте приложение на [oauth.yandex.ru](https://oauth.yandex.ru/client/new) с правом `metrika:read` и получите токен.
4. **Проверить подключение** проверяет, что счётчик выводится на сайте, и при наличии токена — доступ к счётчику через API. Шаги 5–6 и таблица идентификаторов целей — ниже на этой же странице после сохранения номера счётчика.
MD,
        ],

        's3_backups' => [
            'category' => 'infra',
            'title' => 'Хранилище S3 для резервных копий',
            'description' => 'Ежедневные копии базы копируются в объектное хранилище вне сервера.',
            'docs_url' => 'https://yandex.cloud/ru/docs/storage/s3/',
            'checkable' => true,
            'fields' => [
                'endpoint' => ['label' => 'Endpoint', 'type' => 'url', 'secret' => false, 'placeholder' => 'https://storage.yandexcloud.net'],
                'region' => ['label' => 'Регион', 'type' => 'text', 'secret' => false, 'placeholder' => 'ru-central1'],
                'bucket' => ['label' => 'Бакет', 'type' => 'text', 'secret' => false],
                'key' => ['label' => 'Access key ID', 'type' => 'text', 'secret' => false],
                'secret' => ['label' => 'Secret access key', 'type' => 'password', 'secret' => true],
                'path_style' => ['label' => 'Path-style адреса (для MinIO и части провайдеров)', 'type' => 'checkbox', 'secret' => false],
            ],
            'config' => [
                'endpoint' => 'filesystems.disks.backups.endpoint',
                'region' => 'filesystems.disks.backups.region',
                'bucket' => 'filesystems.disks.backups.bucket',
                'key' => 'filesystems.disks.backups.key',
                'secret' => 'filesystems.disks.backups.secret',
                'path_style' => 'filesystems.disks.backups.use_path_style_endpoint',
            ],
            'instructions' => <<<'MD'
1. Подойдёт любое S3-совместимое хранилище в РФ: Yandex Object Storage (`https://storage.yandexcloud.net`, `ru-central1`), VK Cloud (`https://hb.ru-msk.vkcloud-storage.ru`, `ru-msk`), Selectel (`https://s3.ru-1.storage.selcloud.ru`, `ru-1`).
2. Создайте **приватный** бакет и сервисный аккаунт с правом записи только в него, выпустите статический ключ доступа.
3. Включите на бакете правило жизненного цикла (например, удалять объекты старше 30 дней).
4. **Проверить подключение** записывает, читает и удаляет тестовый файл. После настройки ежедневная копия базы (03:30) будет загружаться в бакет.
MD,
        ],

        'sentry' => [
            'category' => 'infra',
            'title' => 'Sentry / GlitchTip',
            'description' => 'Сбор ошибок сайта, очередей и планировщика с уведомлениями разработчикам.',
            'docs_url' => 'https://docs.sentry.io/platforms/php/guides/laravel/',
            'checkable' => true,
            'fields' => [
                'dsn' => ['label' => 'DSN', 'type' => 'password', 'secret' => true],
                'environment' => ['label' => 'Окружение', 'type' => 'text', 'secret' => false, 'optional' => true, 'placeholder' => 'production'],
                'traces_sample_rate' => ['label' => 'Доля трассировок производительности (0–1)', 'type' => 'number', 'secret' => false, 'optional' => true, 'placeholder' => '0'],
            ],
            'config' => [
                'dsn' => 'sentry.dsn',
                'environment' => 'sentry.environment',
                'traces_sample_rate' => 'sentry.traces_sample_rate',
            ],
            'instructions' => <<<'MD'
1. Подойдёт [Sentry](https://sentry.io/) или совместимый self-hosted [GlitchTip](https://glitchtip.com/) (можно развернуть в РФ).
2. Создайте проект типа **Laravel** и скопируйте **DSN** из **Settings → Client Keys**.
3. Доля трассировок — 0, пока не нужна аналитика производительности (трассировки расходуют квоту).
4. Персональные данные пользователей в события не передаются.
5. **Проверить подключение** отправляет тестовое событие — оно появится в проекте через несколько секунд.
MD,
        ],
    ],

    'env_fallback' => [
        'tbank.terminal_key' => 'TBANK_TERMINAL_KEY',
        'tbank.password' => 'TBANK_PASSWORD',
        'tbank.success_url' => 'TBANK_SUCCESS_URL',
        'tbank.fail_url' => 'TBANK_FAIL_URL',
        'services.yandex.maps_api_key' => 'YANDEX_MAPS_API_KEY',
    ],

];
