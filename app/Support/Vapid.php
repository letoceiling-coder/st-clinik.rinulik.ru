<?php

namespace App\Support;

use RuntimeException;

/** VAPID-ключи Web Push (P-256), в формате base64url, как их ждут браузеры и библиотеки web-push. */
class Vapid
{
    /** @return array{public_key: string, private_key: string} */
    public static function generate(): array
    {
        $key = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
        if ($key === false) {
            throw new RuntimeException('OpenSSL не смог создать ключ: '.openssl_error_string());
        }

        $ec = openssl_pkey_get_details($key)['ec'];

        return [
            'public_key' => self::encode(self::point($ec['x'], $ec['y'])),
            'private_key' => self::encode(self::pad($ec['d'])),
        ];
    }

    /** Публичный ключ, соответствующий приватному, или null, если приватный ключ некорректен. */
    public static function publicKeyFor(string $privateKey): ?string
    {
        $d = self::decode($privateKey);
        if ($d === null || strlen($d) !== 32) {
            return null;
        }

        $der = "\x30\x31\x02\x01\x01\x04\x20".$d."\xa0\x0a\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07";
        $pem = "-----BEGIN EC PRIVATE KEY-----\n".chunk_split(base64_encode($der), 64, "\n")."-----END EC PRIVATE KEY-----\n";

        $key = openssl_pkey_get_private($pem);
        if ($key === false) {
            return null;
        }

        $ec = openssl_pkey_get_details($key)['ec'] ?? null;

        return $ec ? self::encode(self::point($ec['x'], $ec['y'])) : null;
    }

    public static function isValidPublicKey(string $publicKey): bool
    {
        $raw = self::decode($publicKey);

        return $raw !== null && strlen($raw) === 65 && $raw[0] === "\x04";
    }

    private static function point(string $x, string $y): string
    {
        return "\x04".self::pad($x).self::pad($y);
    }

    private static function pad(string $value): string
    {
        return str_pad($value, 32, "\0", STR_PAD_LEFT);
    }

    private static function encode(string $raw): string
    {
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }

    private static function decode(string $value): ?string
    {
        $raw = base64_decode(strtr(trim($value), '-_', '+/'), true);

        return $raw === false ? null : $raw;
    }
}
