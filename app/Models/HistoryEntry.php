<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HistoryEntry extends Model
{
    public const UPDATED_AT = null;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }
}
