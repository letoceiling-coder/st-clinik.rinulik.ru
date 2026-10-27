<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\Crypt;

/**
 * Персональное КП для черновика клиники. Токен ссылки хранится хэшем (поиск) и в зашифрованном виде
 * (чтобы менеджер мог повторно скопировать ссылку для ручной отправки).
 *
 * @property array{web_title: string, web_html: string, email_subject: string, email_html: string, email_text: string, sms: string, messenger: string, call_script: string|null} $snapshot
 */
class Offer extends Model
{
    public const STATUSES = [
        'ready' => 'Готово к отправке',
        'sent' => 'Отправлено',
        'viewed' => 'Просмотрено',
        'applied' => 'Оставлена заявка',
        'connected' => 'Клиника подключена',
        'revoked' => 'Отозвано',
    ];

    protected $guarded = ['id'];

    protected $hidden = ['token_hash', 'token_encrypted'];

    protected function casts(): array
    {
        return [
            'snapshot' => 'array',
            'is_customized' => 'boolean',
            'expires_at' => 'datetime',
            'first_viewed_at' => 'datetime',
            'last_viewed_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public static function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    public static function findByToken(string $token): ?self
    {
        return self::query()->where('token_hash', self::hashToken($token))->first();
    }

    public function token(): string
    {
        return Crypt::decryptString($this->token_encrypted);
    }

    public function url(): string
    {
        return route('offer.show', ['token' => $this->token()]);
    }

    /** Короткая ссылка для SMS и мессенджеров: переадресует на страницу КП. */
    public function shortUrl(): string
    {
        return route('offer.short', ['code' => $this->short_code]);
    }

    public function isAvailable(): bool
    {
        return $this->revoked_at === null && ($this->expires_at === null || $this->expires_at->isFuture());
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function parsedOrganization(): BelongsTo
    {
        return $this->belongsTo(ParsedOrganization::class);
    }

    public function templateVersion(): BelongsTo
    {
        return $this->belongsTo(OfferTemplateVersion::class, 'offer_template_version_id');
    }

    public function demoLink(): HasOne
    {
        return $this->hasOne(DemoLink::class)->latestOfMany();
    }

    public function demoLinks(): HasMany
    {
        return $this->hasMany(DemoLink::class)->latest('id');
    }

    public function applications(): HasMany
    {
        return $this->hasMany(OfferApplication::class);
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
