<?php

namespace App\Models;

use App\Models\Traits\HasSearchText;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/** Жалоба/запрос пациента из раздела «Что беспокоит» (не диагноз). */
class Concern extends Model
{
    use HasSearchText;

    protected $guarded = [];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function searchableParts(): array
    {
        return [$this->name, $this->keywords, $this->hint];
    }

    public function specialty(): BelongsTo
    {
        return $this->belongsTo(Specialty::class);
    }

    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class, 'concern_service');
    }
}
