<?php

namespace App\Models;

use Database\Factories\OfferTemplateFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/** Шаблон КП; содержимое хранится версиями, КП ссылается на конкретную версию. */
class OfferTemplate extends Model
{
    /** @use HasFactory<OfferTemplateFactory> */
    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'current_version' => 'integer'];
    }

    public function versions(): HasMany
    {
        return $this->hasMany(OfferTemplateVersion::class)->orderByDesc('version');
    }

    public function latestVersion(): HasOne
    {
        return $this->hasOne(OfferTemplateVersion::class)->latestOfMany('version');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
