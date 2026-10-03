<?php

namespace App\Models\Traits;

use App\Support\Text;

trait HasSearchText
{
    public static function bootHasSearchText(): void
    {
        static::saving(function ($model) {
            $model->search_text = Text::normalize(implode(' ', array_filter($model->searchableParts())));
        });
    }

    /** @return list<string|null> */
    abstract public function searchableParts(): array;
}
