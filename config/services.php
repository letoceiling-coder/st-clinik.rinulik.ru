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

    'max_oauth' => [
        'client_id' => env('MAX_OAUTH_CLIENT_ID'),
        'client_secret' => env('MAX_OAUTH_CLIENT_SECRET'),
        'redirect_uri' => env('MAX_OAUTH_REDIRECT_URI'),
        'enabled' => (bool) env('MAX_OAUTH_ENABLED', false),
    ],

];
