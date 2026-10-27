<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'yandex' => [
        'maps_api_key' => env('YANDEX_MAPS_API_KEY'),
    ],

    'yandex_oauth' => [
        'client_id' => env('YANDEX_OAUTH_CLIENT_ID'),
        'client_secret' => env('YANDEX_OAUTH_CLIENT_SECRET'),
        'redirect_uri' => env('YANDEX_OAUTH_REDIRECT_URI'),
        'enabled' => (bool) env('YANDEX_OAUTH_ENABLED', false),
    ],

    'vk_oauth' => [
        'client_id' => env('VK_OAUTH_CLIENT_ID'),
        'client_secret' => env('VK_OAUTH_CLIENT_SECRET'),
        'redirect_uri' => env('VK_OAUTH_REDIRECT_URI'),
        'enabled' => (bool) env('VK_OAUTH_ENABLED', false),
    ],

    'max_bot' => [
        'api_url' => env('MAX_BOT_API_URL', 'https://platform-api2.max.ru'),
        'token' => env('MAX_BOT_TOKEN'),
        'username' => env('MAX_BOT_USERNAME'),
        'webhook_secret' => env('MAX_BOT_WEBHOOK_SECRET'),
        'mini_app_url' => env('MAX_MINI_APP_URL'),
        'login_enabled' => (bool) env('MAX_LOGIN_ENABLED', false),
    ],

    'vk_community' => [
        'api_version' => '5.199',
        'group_id' => env('VK_COMMUNITY_GROUP_ID'),
        'access_token' => env('VK_COMMUNITY_ACCESS_TOKEN'),
        'confirmation_code' => env('VK_COMMUNITY_CONFIRMATION_CODE'),
        'callback_secret' => env('VK_COMMUNITY_CALLBACK_SECRET'),
        'test_user_id' => env('VK_COMMUNITY_TEST_USER_ID'),
    ],

    'mail_offers' => [
        'from_address' => env('MAIL_OFFERS_FROM_ADDRESS'),
        'from_name' => env('MAIL_OFFERS_FROM_NAME'),
        'dkim_selector' => env('MAIL_OFFERS_DKIM_SELECTOR'),
    ],

    'sms' => [
        'provider' => env('SMS_PROVIDER'),
        'login' => env('SMS_LOGIN'),
        'api_key' => env('SMS_API_KEY'),
        'sender' => env('SMS_SENDER'),
    ],

    'webpush' => [
        'public_key' => env('VAPID_PUBLIC_KEY'),
        'private_key' => env('VAPID_PRIVATE_KEY'),
        'subject' => env('VAPID_SUBJECT'),
    ],

    'parser_ai' => [
        'base_url' => env('PARSER_AI_BASE_URL', 'https://parser.rinulik.ru'),
        'api_key' => env('PARSER_AI_KEY'),
        'insecure_http' => (bool) env('PARSER_AI_INSECURE_HTTP', false),
        'task_cost_limit_usd' => env('PARSER_AI_TASK_COST_LIMIT_USD'),
        'daily_budget_usd' => env('PARSER_AI_DAILY_BUDGET_USD'),
    ],

    'openrouter' => [
        'api_key' => env('OPENROUTER_API_KEY'),
        'base_url' => env('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1'),
        'proxy' => env('OPENROUTER_PROXY'),
        'chat_model' => env('OPENROUTER_CHAT_MODEL', 'openai/gpt-4o-mini'),
        'fallback_model' => env('OPENROUTER_FALLBACK_MODEL'),
        'embedding_model' => env('OPENROUTER_EMBEDDING_MODEL', 'openai/text-embedding-3-small'),
        'max_tokens' => (int) env('OPENROUTER_MAX_TOKENS', 800),
        'daily_budget_usd' => env('OPENROUTER_DAILY_BUDGET_USD'),
        'enabled' => (bool) env('OPENROUTER_ENABLED', false),
    ],

    'yandex_metrika' => [
        'counter_id' => env('YANDEX_METRIKA_COUNTER_ID'),
        'webvisor' => (bool) env('YANDEX_METRIKA_WEBVISOR', false),
        'oauth_token' => env('YANDEX_METRIKA_OAUTH_TOKEN'),
    ],

];
