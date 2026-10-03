<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReviewComplaint extends Model
{
    public const REASONS = [
        'insult' => 'Оскорбления или нецензурная лексика',
        'ad' => 'Реклама или ссылки',
        'personal_data' => 'Персональные данные третьих лиц',
        'medical_data' => 'Диагнозы и медицинские документы',
        'fake' => 'Вымышленный отзыв / не было визита',
        'other' => 'Другое',
    ];

    protected $guarded = [];

    protected function casts(): array
    {
        return ['resolved_at' => 'datetime'];
    }

    public function review(): BelongsTo
    {
        return $this->belongsTo(Review::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }
}
