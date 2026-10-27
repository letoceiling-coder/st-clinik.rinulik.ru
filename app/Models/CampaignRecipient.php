<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CampaignRecipient extends Model
{
    /** Воронка в порядке продвижения; `failed`, `skipped`, `unsubscribed` — вне воронки. */
    public const FUNNEL = [
        'queued' => 'В очереди',
        'sent' => 'Отправлено',
        'delivered' => 'Доставлено',
        'opened' => 'Открыто',
        'clicked' => 'Перешли на КП',
        'demo_opened' => 'Открыли демо',
        'replied' => 'Оставили заявку',
        'connected' => 'Подключились',
    ];

    public const STATUSES = self::FUNNEL + [
        'failed' => 'Ошибка',
        'skipped' => 'Пропущено',
        'unsubscribed' => 'Отписались',
    ];

    /** Колонка с временем этапа воронки. */
    public const STAGE_COLUMNS = [
        'sent' => 'sent_at',
        'delivered' => 'delivered_at',
        'opened' => 'opened_at',
        'clicked' => 'clicked_at',
        'demo_opened' => 'demo_opened_at',
        'replied' => 'replied_at',
        'connected' => 'connected_at',
        'unsubscribed' => 'unsubscribed_at',
    ];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'delivered_at' => 'datetime',
            'opened_at' => 'datetime',
            'clicked_at' => 'datetime',
            'demo_opened_at' => 'datetime',
            'replied_at' => 'datetime',
            'connected_at' => 'datetime',
            'unsubscribed_at' => 'datetime',
        ];
    }

    /** Продвигает получателя по воронке; назад статус не откатывается. */
    public function advance(string $status): void
    {
        $column = self::STAGE_COLUMNS[$status] ?? null;
        if ($column !== null && $this->{$column} === null) {
            $this->{$column} = now();
        }

        $order = array_keys(self::FUNNEL);
        $current = array_search($this->status, $order, true);
        $next = array_search($status, $order, true);
        $movesForward = $next !== false && $this->status !== 'unsubscribed' && ($current === false || $next > $current);
        if ($status === 'unsubscribed' || $movesForward) {
            $this->status = $status;
        }
        $this->save();
    }

    /** @param Builder<CampaignRecipient> $query */
    public function scopeManual(Builder $query): void
    {
        $query->whereNotIn('channel', Campaign::AUTO_CHANNELS);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(Campaign::class);
    }

    public function offer(): BelongsTo
    {
        return $this->belongsTo(Offer::class);
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_by');
    }
}
