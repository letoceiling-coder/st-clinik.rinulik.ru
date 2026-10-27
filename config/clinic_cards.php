<?php

return [
    'premium_variant' => env('CLINIC_CARD_PREMIUM_VARIANT', 'ivory_gold'),

    'premium_variants' => [
        'ivory_gold' => [
            'label' => 'Premium Ivory Gold',
            'description' => 'Светлая слоновая кость, шампань и мягкое золото — основной рекомендуемый стиль.',
            'class' => 'clinic-card--premium-ivory',
        ],
        'avito_blue' => [
            'label' => 'Premium Avito Blue',
            'description' => 'Светлый голубой премиум в духе Avito: белая карточка, синие акценты и заметный бейдж.',
            'class' => 'clinic-card--premium-avito',
        ],
        'gold_signature' => [
            'label' => 'Premium Gold Signature',
            'description' => 'Тёмный luxury-стиль с золотыми акцентами.',
            'class' => 'clinic-card--premium-signature',
        ],
    ],
];
