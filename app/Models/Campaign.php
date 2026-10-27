<?php

namespace App\Models;

use Database\Factories\CampaignFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Campaign extends Model
{
    /** @use HasFactory<CampaignFactory> */
    use HasFactory;

    public const STATUSES = [
        'draft' => 'Черновик',
        'running' => 'Идёт отправка',
        'paused' => 'На паузе',
        'completed' => 'Завершена',
        'direct' => 'Отправки из карточек КП',
    ];

    /** Каналы: email и SMS отправляются автоматически, остальные готовит система, а отправляет менеджер. */
    public const CHANNELS = [
        'email' => 'Email',
        'sms' => 'SMS',
        'phone' => 'Звонок',
        'vk' => 'VK',
        'max' => 'MAX',
        'telegram' => 'Telegram',
        'whatsapp' => 'WhatsApp',
    ];

    public const AUTO_CHANNELS = ['email', 'sms'];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'channels' => 'array',
            'filters' => 'array',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(OfferTemplate::class, 'offer_template_id');
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(CampaignRecipient::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
