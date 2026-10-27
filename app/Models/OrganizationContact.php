<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrganizationContact extends Model
{
    public const TYPES = [
        'phone' => 'Телефон',
        'email' => 'Email',
        'website' => 'Сайт',
        'vk' => 'ВКонтакте',
        'max' => 'MAX',
        'telegram' => 'Telegram',
        'whatsapp' => 'WhatsApp',
    ];

    public const SOURCES = [
        'yandex' => 'Яндекс',
        'site' => 'Сайт клиники',
        'manual' => 'Вручную',
    ];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'is_verified' => 'boolean',
            'do_not_contact' => 'boolean',
        ];
    }

    public function parsedOrganization(): BelongsTo
    {
        return $this->belongsTo(ParsedOrganization::class);
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }
}
