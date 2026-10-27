<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

/**
 * Российский номер: +7 / 8 и 10 цифр (в любом оформлении — пробелы, скобки, дефисы).
 */
class RussianPhone implements ValidationRule
{
    /**
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! self::isValid($value)) {
            $fail('Укажите российский номер в формате +7 (900) 000-00-00.');
        }
    }

    public static function isValid(string $value): bool
    {
        if (preg_match('/^[\d\s()+\-]+$/', $value) !== 1) {
            return false;
        }

        $digits = preg_replace('/\D+/', '', $value) ?? '';

        return preg_match('/^[78]\d{10}$/', $digits) === 1;
    }

    /**
     * Приводит номер к виду +7XXXXXXXXXX (для дедупликации и звонков).
     */
    public static function normalize(string $value): string
    {
        $digits = preg_replace('/\D+/', '', $value) ?? '';

        return '+7'.substr($digits, -10);
    }
}
