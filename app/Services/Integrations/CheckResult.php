<?php

namespace App\Services\Integrations;

/** Результат проверки подключения: details — пары «что проверяли → что получили», без секретов. */
final class CheckResult
{
    /** @param list<array{label: string, value: string, ok?: bool|null}> $details */
    public function __construct(
        public readonly bool $ok,
        public readonly string $message,
        public readonly array $details = [],
    ) {}

    /** @param list<array{label: string, value: string, ok?: bool|null}> $details */
    public static function ok(string $message, array $details = []): self
    {
        return new self(true, $message, $details);
    }

    /** @param list<array{label: string, value: string, ok?: bool|null}> $details */
    public static function fail(string $message, array $details = []): self
    {
        return new self(false, $message, $details);
    }
}
