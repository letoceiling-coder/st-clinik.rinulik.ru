<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntegrationCheck extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'ok' => 'boolean',
            'details' => 'array',
            'checked_at' => 'datetime',
        ];
    }

    public function checker(): BelongsTo
    {
        return $this->belongsTo(User::class, 'checked_by');
    }
}
