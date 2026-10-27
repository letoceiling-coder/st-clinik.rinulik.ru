<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DemoVisit extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['sections' => 'array', 'started_at' => 'datetime', 'last_seen_at' => 'datetime'];
    }

    public function demoLink(): BelongsTo
    {
        return $this->belongsTo(DemoLink::class);
    }

    public function durationSeconds(): int
    {
        return (int) $this->started_at->diffInSeconds($this->last_seen_at);
    }
}
