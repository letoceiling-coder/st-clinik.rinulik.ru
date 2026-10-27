<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Review extends Model
{
    public const STATUSES = ['pending', 'published', 'rejected', 'hidden'];

    public const REPLY_STATUSES = ['pending', 'published', 'rejected'];

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

    /**
     * Отзывы без опубликованного ответа клиники (зеркало {@see replyIsPublic()}).
     */
    public function scopeWithoutPublishedReply(Builder $query): Builder
    {
        return $query->where(function (Builder $query) {
            $query->whereNull('reviews.reply_text')
                ->orWhere('reviews.reply_text', '')
                ->orWhere(fn (Builder $query) => $query->whereNotNull('reviews.reply_status')->where('reviews.reply_status', '!=', 'published'));
        });
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

    public function replyIsPublic(): bool
    {
        if (blank($this->reply_text)) {
            return false;
        }

        $status = $this->reply_status;

        return $status === null || $status === 'published';
    }
}
