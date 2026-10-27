<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssistantKbChunk extends Model
{
    public const SOURCE_CLINIC = 'clinic';

    public const SOURCE_DOCTOR = 'doctor';

    /** @var list<string> */
    protected $fillable = [
        'source_type',
        'source_id',
        'city_id',
        'title',
        'body',
        'search_text',
        'embedding',
        'embedded_at',
    ];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
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
        static::saving(function (AssistantKbChunk $chunk): void {
            $chunk->search_text = mb_strtolower(trim($chunk->title.' '.$chunk->body));
        });
    }
}
