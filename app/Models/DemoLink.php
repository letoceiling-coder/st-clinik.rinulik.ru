<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Crypt;

/** Анонимная ссылка на демо-кабинет черновика клиники (только просмотр). */
class DemoLink extends Model
{
    /** Разделы кабинета: ключ — первый сегмент пути после /clinic-cabinet. */
    public const SECTIONS = [
        'dashboard' => 'Обзор',
        'calendar' => 'Календарь',
        'leads' => 'Заявки',
        'reviews' => 'Отзывы',
        'stats' => 'Статистика',
        'branches' => 'Филиалы',
        'doctors' => 'Врачи',
        'prices' => 'Услуги и цены',
        'schedule' => 'График работы',
        'photos' => 'Фото',
        'posts' => 'Новости и акции',
        'card-bonuses' => 'Бонусы на карточке',
        'promotions' => 'Продвижение',
        'documents' => 'Документы',
    ];

    protected $guarded = ['id'];

    protected $hidden = ['token_hash', 'token_encrypted'];

    protected function casts(): array
    {
        return [
            'sections' => 'array',
            'show_tariffs' => 'boolean',
            'notify_manager' => 'boolean',
            'revoke_on_connect' => 'boolean',
            'expires_at' => 'datetime',
            'last_opened_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public static function findByToken(string $token): ?self
    {
        return self::query()->where('token_hash', Offer::hashToken($token))->first();
    }

    public function token(): string
    {
        return Crypt::decryptString($this->token_encrypted);
    }

    public function url(): string
    {
        return route('demo.open', ['token' => $this->token()]);
    }

    /** Почему ссылка сейчас не открывается (null — открывается). */
    public function unavailableReason(): ?string
    {
        return match (true) {
            $this->revoked_at !== null => 'Ссылка на демо-кабинет отозвана.',
            $this->expires_at !== null && $this->expires_at->isPast() => 'Срок действия демо-ссылки истёк.',
            default => null,
        };
    }

    public function allows(string $section): bool
    {
        return in_array($section, (array) $this->sections, true);
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function offer(): BelongsTo
    {
        return $this->belongsTo(Offer::class);
    }

    public function visits(): HasMany
    {
        return $this->hasMany(DemoVisit::class)->latest('started_at');
    }
}
