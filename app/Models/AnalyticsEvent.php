<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnalyticsEvent extends Model
{
    public const UPDATED_AT = null;

    public const EVENT_PAGE_VIEW = 'page_view';

    public const EVENT_SEARCH = 'search';

    public const EVENT_CITY_PICK = 'city_pick';

    public const EVENT_CLINIC_VIEW = 'clinic_view';

    public const EVENT_DOCTOR_VIEW = 'doctor_view';

    public const EVENT_BOOKING_START = 'booking_start';

    public const EVENT_BOOKING_SUCCESS = 'booking_success';

    public const EVENT_REGISTER = 'register';

    public const EVENT_TARIFF_PURCHASE = 'tariff_purchase';

    public const EVENT_AD_PURCHASE = 'ad_purchase';

    public const EVENT_ASSISTANT_OPEN = 'assistant_open';

    /** @var array<string, string> */
    public const LABELS = [
        self::EVENT_PAGE_VIEW => 'Посещение',
        self::EVENT_SEARCH => 'Поиск',
        self::EVENT_CITY_PICK => 'Выбор города',
        self::EVENT_CLINIC_VIEW => 'Просмотр клиники',
        self::EVENT_DOCTOR_VIEW => 'Просмотр врача',
        self::EVENT_BOOKING_START => 'Начало записи',
        self::EVENT_BOOKING_SUCCESS => 'Успешная запись',
        self::EVENT_REGISTER => 'Регистрация',
        self::EVENT_TARIFF_PURCHASE => 'Покупка тарифа',
        self::EVENT_AD_PURCHASE => 'Покупка рекламы',
        self::EVENT_ASSISTANT_OPEN => 'Ассистент',
    ];

    /** @var list<string> */
    public const FUNNEL = [
        self::EVENT_PAGE_VIEW,
        self::EVENT_SEARCH,
        self::EVENT_CLINIC_VIEW,
        self::EVENT_DOCTOR_VIEW,
        self::EVENT_BOOKING_START,
        self::EVENT_BOOKING_SUCCESS,
    ];

    protected $guarded = [];

    protected function casts(): array
    {
        return ['meta' => 'array', 'created_at' => 'datetime'];
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
