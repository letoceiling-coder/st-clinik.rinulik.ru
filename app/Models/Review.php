<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Review extends Model
{
    public const STATUSES = ['pending', 'published', 'rejected', 'hidden'];

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'visit_date' => 'date',
            'is_verified_visit' => 'boolean',
            'flags' => 'array',
            'reply_at' => 'datetime',
            'consent_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('reviews.status', 'published');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function clinic(): BelongsTo
    {
        return $this->belongsTo(Clinic::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(Doctor::class);
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function complaints(): HasMany
    {
        return $this->hasMany(ReviewComplaint::class);
    }
}
