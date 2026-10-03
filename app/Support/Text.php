<?php

namespace App\Support;

use Illuminate\Support\Str;

final class Text
{
    public static function normalize(?string $value): string
    {
        $value = mb_strtolower((string) $value);
        $value = str_replace('ё', 'е', $value);
        $value = preg_replace('/[^\p{L}\p{N}\s\-\.]+/u', ' ', $value) ?? '';

        return trim(preg_replace('/\s+/u', ' ', $value) ?? '');
    }

    public static function slug(string $value): string
    {
        return Str::slug($value, '-', 'ru');
    }

    public static function money(?int $value): string
    {
        return $value === null ? '' : number_format($value, 0, ',', "\u{00A0}").' ₽';
    }
}
