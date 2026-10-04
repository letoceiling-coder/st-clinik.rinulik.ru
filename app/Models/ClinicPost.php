<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicPost extends Model
{
    public const TYPES = ['news' => 'Новость', 'promo' => 'Акция'];

    public const STATUSES = ['draft', 'pending', 'published', 'hidden'];

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'is_pinned' => 'boolean',
        ];
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    /** @param Builder<ClinicPost> $query */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published');
    }

    /** @param Builder<ClinicPost> $query */
    public function scopeActive(Builder $query): Builder
    {
        $now = now();

        return $query
            ->where(function (Builder $q) use ($now) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
            })
            ->where(function (Builder $q) use ($now) {
                $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now);
            });
    }
}
