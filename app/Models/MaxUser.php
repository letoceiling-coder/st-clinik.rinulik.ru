<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaxUser extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'max_user_id',
        'user_id',
        'chat_id',
        'username',
        'display_name',
        'last_seen_at',
        'is_blocked',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'last_seen_at' => 'datetime',
            'is_blocked' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
