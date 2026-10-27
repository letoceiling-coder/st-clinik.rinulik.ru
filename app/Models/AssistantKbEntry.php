<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssistantKbEntry extends Model
{
    /** @var list<string> */
    protected $fillable = [
        'city_id',
        'question',
        'answer',
        'search_text',
        'is_active',
        'sort',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'embedding' => 'array',
            'embedded_at' => 'datetime',
        ];
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    protected static function booted(): void
    {
        static::saving(function (AssistantKbEntry $entry): void {
            $entry->search_text = mb_strtolower(trim($entry->question.' '.$entry->answer));
        });
    }
}
