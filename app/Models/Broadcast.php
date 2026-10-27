<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Broadcast extends Model
{
    public const SENDER_PLATFORM = 'platform';

    public const SENDER_CLINIC = 'clinic';

    public const MODERATION_PENDING = 'pending';

    public const MODERATION_APPROVED = 'approved';

    public const MODERATION_REJECTED = 'rejected';

    public const STATUSES = [
        'draft' => 'Черновик',
        'scheduled' => 'Запланирована',
        'running' => 'Идёт отправка',
        'paused' => 'На паузе',
        'completed' => 'Завершена',
        'cancelled' => 'Отменена',
    ];

    /** Каналы с автоматической отправкой (VK — позже). */
    public const CHANNELS = [
        'email' => 'Email',
        'max' => 'MAX',
        'web_push' => 'Web Push',
    ];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'channels' => 'array',
            'filters' => 'array',
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(BroadcastRecipient::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function isEditable(): bool
    {
        if ($this->sender_type === self::SENDER_CLINIC) {
            return $this->status === 'draft'
                && in_array($this->moderation_status, [null, self::MODERATION_REJECTED], true);
        }

        return in_array($this->status, ['draft', 'scheduled', 'paused'], true);
    }

    public function awaitsModeration(): bool
    {
        return $this->sender_type === self::SENDER_CLINIC
            && $this->moderation_status === self::MODERATION_PENDING;
    }
}
