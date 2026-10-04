<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Demo routes for client review
    |--------------------------------------------------------------------------
    |
    | Temporary public entry points that sign in as predefined users and open
    | the clinic cabinet or admin panel without a password form.
    |
    */

    'enabled' => env('APP_DEMO_ROUTES', true),

    'personas' => [
        'cabinet' => [
            'email' => env('DEMO_CABINET_EMAIL', 'dsc-24@yandex.ru'),
            'redirect' => 'cabinet.dashboard',
            'label' => 'Демо кабинета клиники',
        ],
        'admin' => [
            'email' => env('DEMO_ADMIN_EMAIL', 'dsc-23@yandex.ru'),
            'redirect' => 'admin.dashboard',
            'label' => 'Демо админ-панели',
        ],
    ],

];
