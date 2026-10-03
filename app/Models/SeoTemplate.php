<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SeoTemplate extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['noindex' => 'boolean'];
    }
}
