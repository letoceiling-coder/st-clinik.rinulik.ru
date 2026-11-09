<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * Изменение данных клиники из кабинета, ожидающее проверки модератором.
 * mode=pre: правка ещё не применена, на сайте прежняя версия; mode=post: применена сразу, проверяется постфактум.
 */
class ContentRevision extends Model
{
    public const MODE_PRE = 'pre';

    public const MODE_POST = 'post';

    public const STATUS_PENDING = 'pending';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_WITHDRAWN = 'withdrawn';

    public const SECTION_LABELS = [
        'profile' => 'Профиль филиала',
        'organization' => 'Реквизиты организации',
        'doctor' => 'Профиль врача',
        'post' => 'Публикация',
        'photo' => 'Фото',
        'prices' => 'Услуги и цены',
        'schedule' => 'График работы',
    ];

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'original' => 'array',
            'payload' => 'array',
            'reviewed_at' => 'datetime',
        ];
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    /** @param Builder<ContentRevision> $query */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    public function isPreModeration(): bool
    {
        return $this->mode === self::MODE_PRE;
    }
}
