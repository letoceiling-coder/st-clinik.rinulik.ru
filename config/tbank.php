<?php

return [

    'terminal_key' => env('TBANK_TERMINAL_KEY'),
    'password' => env('TBANK_PASSWORD'),
    'success_url' => env('TBANK_SUCCESS_URL'),
    'fail_url' => env('TBANK_FAIL_URL'),
    'api_url' => env('TBANK_API_URL', 'https://securepay.tinkoff.ru/v2'),

];
