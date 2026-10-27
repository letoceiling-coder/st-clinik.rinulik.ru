<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssistantConversation extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'public_id',
        'city_id',
        'user_id',
        'channel',
        'max_user_id',
        'ip_hash',
        'last_message_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
        ];
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(AssistantMessage::class);
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }
}
