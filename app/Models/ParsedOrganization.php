<?php

namespace App\Models;

use Database\Factories\ParsedOrganizationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ParsedOrganization extends Model
{
    /** @use HasFactory<ParsedOrganizationFactory> */
    use HasFactory;

    public const STATUSES = [
        'new' => 'Новая',
        'reviewed' => 'Проверена',
        'imported' => 'Импортирована',
        'duplicate' => 'Дубль',
        'ignored' => 'Скрыта',
    ];

    /** Статусы, при которых синхронизация не меняет решение администратора. */
    public const LOCKED_STATUSES = ['imported', 'duplicate', 'ignored'];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'phones' => 'array',
            'socials' => 'array',
            'categories' => 'array',
            'raw' => 'array',
            'lat' => 'float',
            'lng' => 'float',
            'rating' => 'float',
            'has_full_card' => 'boolean',
            'source_updated_at' => 'datetime',
            'last_synced_at' => 'datetime',
            'imported_at' => 'datetime',
        ];
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function matchClinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class, 'match_clinic_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(ParserTask::class, 'parser_task_id');
    }

    public function importer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'imported_by');
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(OrganizationContact::class);
    }

    public function isImportable(): bool
    {
        return $this->clinic_id === null && in_array($this->status, ['new', 'reviewed'], true);
    }
}
