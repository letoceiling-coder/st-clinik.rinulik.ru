<?php

namespace App\Services;

use App\Support\Text;

/**
 * Защита от сбора диагнозов, медицинских документов и лишних персональных данных
 * в свободных полях (заявка, отзыв). В MVP такие данные не принимаются.
 */
class SensitiveTextGuard
{
    /** @var array<string,string> */
    private const PATTERNS = [
        'icd_code' => '/\b[A-ZА-Я]\d{2}(\.\d{1,2})?\b/u',
        'diagnosis_word' => '/\b(диагноз|анамнез|выписк[аиу]|эпикриз|история болезни|медкарт[аыу]|снимок|рецепт|результат[ыов]* анализ)/iu',
        'passport' => '/\b\d{2}\s?\d{2}\s?\d{6}\b/u',
        'snils' => '/\b\d{3}-\d{3}-\d{3}\s?\d{2}\b/u',
        'policy' => '/\b\d{16}\b/u',
        'email' => '/[\w.+-]+@[\w-]+\.[\w.-]+/u',
        'url' => '/(https?:\/\/|www\.)\S+/iu',
        'phone' => '/(\+7|8)[\s\-(]*\d{3}[\s\-)]*\d{3}[\s\-]*\d{2}[\s\-]*\d{2}/u',
    ];

    private const LABELS = [
        'icd_code' => 'код диагноза (МКБ)',
        'diagnosis_word' => 'медицинские документы или диагноз',
        'passport' => 'паспортные данные',
        'snils' => 'СНИЛС',
        'policy' => 'номер полиса',
        'email' => 'адрес электронной почты',
        'url' => 'ссылку',
        'phone' => 'номер телефона',
    ];

    /** @return list<string> ключи сработавших правил */
    public function scan(string $text): array
    {
        $hits = [];
        foreach (self::PATTERNS as $key => $pattern) {
            if (preg_match($pattern, $text)) {
                $hits[] = $key;
            }
        }

        return $hits;
    }

    /** Для заявок: любые срабатывания блокируют отправку. */
    public function blockingMessage(string $text): ?string
    {
        $hits = $this->scan($text);
        if ($hits === []) {
            return null;
        }

        $labels = array_map(fn ($k) => self::LABELS[$k], $hits);

        return 'Уберите из текста: '.implode(', ', $labels).'. Диагнозы, документы и лишние персональные данные в сервисе не принимаются — их врач запросит на приёме.';
    }

    /** Для отзывов: контакты/ссылки/документы отправляют отзыв на ручную проверку. */
    public function reviewFlags(string $text): array
    {
        $flags = $this->scan($text);
        $normalized = Text::normalize($text);
        if (preg_match('/\b(мошенник|обман(ул|ывают)|быдло|урод)\b/u', $normalized)) {
            $flags[] = 'abusive';
        }

        return array_values(array_unique($flags));
    }
}
