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

    /** «1 отзыв», «3 отзыва», «5 отзывов»: число с правильной формой слова. */
    public static function plural(int $count, string $one, string $few, string $many): string
    {
        $mod100 = abs($count) % 100;
        $mod10 = $mod100 % 10;
        $word = match (true) {
            $mod100 >= 11 && $mod100 <= 14 => $many,
            $mod10 === 1 => $one,
            $mod10 >= 2 && $mod10 <= 4 => $few,
            default => $many,
        };

        return $count.' '.$word;
    }
}
