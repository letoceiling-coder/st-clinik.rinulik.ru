<?php

namespace App\Models;

use Database\Factories\ParserTaskFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ParserTask extends Model
{
    /** @use HasFactory<ParserTaskFactory> */
    use HasFactory;

    /** Сбор с открытием каждой карточки: `POST /api/v1/organizations/collect`. */
    public const COLLECT = 'organizations.collect';

    public const TYPES = [
        self::COLLECT => 'Сбор стоматологий с Яндекс Карт',
        'yandex.orgs' => 'Быстрый сбор из выдачи (устаревший)',
        'organizations.agent' => 'Полные карточки (AI-агент)',
        'page.html' => 'Поиск email на сайте',
        'base.sync' => 'Загрузка готовых карточек из базы парсера',
    ];

    /** Фильтры поиска: всегда в рамках стоматологий. */
    public const FILTERS = [
        '' => 'Все стоматологии',
        'детская стоматология' => 'Детская стоматология',
        'имплантация зубов' => 'Имплантация',
        'брекеты ортодонтия' => 'Ортодонтия, брекеты',
        'протезирование зубов' => 'Протезирование',
        'лечение зубов под наркозом' => 'Лечение под наркозом',
        'стоматология круглосуточно' => 'Круглосуточные',
        'отбеливание зубов' => 'Отбеливание',
    ];

    public const CATEGORY = 'стоматология';

    /** Около 40 карточек в час при лимите задачи 4 часа. */
    public const MAX_COLLECT_COUNT = 150;

    /** Значение фильтра `category` в базе парсера, покрывающее все собранные стоматологии. */
    public const BASE_CATEGORY = 'стоматолог,стоматология';

    public const STATUSES = [
        'queued' => 'В очереди',
        'running' => 'Выполняется',
        'completed' => 'Готово',
        'failed' => 'Ошибка',
        'cancelled' => 'Отменена',
        'stale' => 'Нет ответа',
    ];

    public const FINAL_STATUSES = ['completed', 'failed', 'cancelled', 'stale'];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'input' => 'array',
            'remote' => 'array',
            'progress' => 'integer',
            'collected_count' => 'integer',
            'result_fetched_at' => 'datetime',
            'cost_usd' => 'decimal:4',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'last_polled_at' => 'datetime',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function parsedOrganization(): BelongsTo
    {
        return $this->belongsTo(ParsedOrganization::class);
    }

    public function organizations(): HasMany
    {
        return $this->hasMany(ParsedOrganization::class);
    }

    /** @param Builder<ParserTask> $query */
    public function scopeActive(Builder $query): void
    {
        $query->whereNotIn('status', self::FINAL_STATUSES);
    }

    public function isFinal(): bool
    {
        return in_array($this->status, self::FINAL_STATUSES, true);
    }

    /** Короткое название задачи для уведомлений и индикатора. */
    public function title(): string
    {
        $city = $this->input['city'] ?? null;
        $filter = $this->input['query'] ?? $this->input['searchQuery'] ?? null;

        return match ($this->type) {
            'page.html' => 'Поиск email: '.($this->parsedOrganization?->name ?? 'организация'),
            'base.sync' => 'Загрузка из базы: '.($city ?? 'все города'),
            default => 'Парсинг: '.($city ?? '—').($filter ? " · {$filter}" : ''),
        };
    }

    /** Сколько карточек нужно собрать (для сбора через collect). */
    public function targetCount(): ?int
    {
        $target = data_get($this->remote, 'counts.target') ?? $this->input['count'] ?? $this->input['maxResults'] ?? null;

        return is_numeric($target) ? (int) $target : null;
    }

    /** Оценка оставшегося времени в секундах по данным парсера. */
    public function etaSeconds(): ?int
    {
        $eta = data_get($this->remote, 'timing.etaSec');

        return ! $this->isFinal() && is_numeric($eta) ? (int) $eta : null;
    }

    /** Яндекс показал проверку (капчу) — сбор на паузе, нужен человек у компьютера-исполнителя. */
    public function attention(): ?string
    {
        $attention = data_get($this->remote, 'needsAttention');
        if (! is_array($attention) || $this->isFinal()) {
            return null;
        }

        return (string) ($attention['message'] ?? 'Яндекс показал проверку — сбор на паузе. Пройдите её на компьютере-исполнителе, сбор продолжится сам.');
    }

    /** Что происходит прямо сейчас — человеческим языком. */
    public function stage(): string
    {
        $queuedMinutes = (int) $this->created_at?->diffInMinutes(now());
        $remoteMessage = data_get($this->remote, 'message');

        return match (true) {
            $this->status === 'completed' && $this->type === self::COLLECT => "Готово: собрано {$this->collected_count}, стоматологий {$this->found_count}, новых у нас {$this->new_count}"
                .(data_get($this->remote, 'blocked') ? ' (Яндекс ограничил сбор — часть карточек могла не попасть)' : ''),
            $this->status === 'completed' => $this->purpose === 'emails'
                ? "Готово: найдено email — {$this->found_count}"
                : "Готово: найдено {$this->found_count}, новых {$this->new_count}",
            $this->status === 'failed' => 'Ошибка: '.($this->error ?? 'парсер вернул ошибку'),
            $this->status === 'cancelled' => 'Отменена',
            $this->status === 'stale' => $this->error ?? 'Парсер перестал отвечать',
            $this->type === 'base.sync' => 'Загружаем карточки из базы парсера и ищем дубли…',
            is_string($remoteMessage) && $remoteMessage !== '' => $remoteMessage,
            $this->status === 'queued' && $queuedMinutes >= 3 => "В очереди {$queuedMinutes} мин: у парсера нет свободного компьютера. Проверьте «Интеграции → Парсер → Исполнители онлайн».",
            $this->status === 'queued' => 'В очереди: ждём свободный компьютер парсера…',
            $this->progress > 0 => "Собираем карточки с Яндекс Карт: {$this->progress}%",
            default => 'Парсер открыл Яндекс Карты и начал сбор…',
        };
    }
}
