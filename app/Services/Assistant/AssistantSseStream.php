<?php

namespace App\Services\Assistant;

/** Формат Server-Sent Events для ответов ассистента. */
class AssistantSseStream
{
    /** @param  callable(string): void  $write */
    public static function event(callable $write, string $name, mixed $data): void
    {
        $write('event: '.$name."\n");
        $write('data: '.json_encode($data, JSON_UNESCAPED_UNICODE)."\n\n");
        if (function_exists('ob_flush')) {
            @ob_flush();
        }
        flush();
    }

    /** @return \Generator<string> */
    public static function chunkText(string $text, int $maxLen = 28): \Generator
    {
        if ($text === '') {
            return;
        }

        $parts = preg_split('/(\s+)/u', $text, -1, PREG_SPLIT_DELIM_CAPTURE) ?: [$text];
        $buffer = '';
        foreach ($parts as $part) {
            if ($part === '') {
                continue;
            }
            if (mb_strlen($buffer.$part) > $maxLen && $buffer !== '') {
                yield $buffer;
                $buffer = $part;
            } else {
                $buffer .= $part;
            }
        }

        if ($buffer !== '') {
            yield $buffer;
        }
    }
}
