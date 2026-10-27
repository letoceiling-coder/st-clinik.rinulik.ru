<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssistantOpenrouterUsage extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'operation',
        'cost_usd',
        'prompt_tokens',
        'completion_tokens',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'cost_usd' => 'float',
        ];
    }
}
