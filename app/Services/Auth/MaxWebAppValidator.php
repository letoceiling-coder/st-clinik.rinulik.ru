<?php

namespace App\Services\Auth;

use App\Services\IntegrationSettings;
use Illuminate\Validation\ValidationException;

/** Проверка подписи initData мини-приложения MAX (dev.max.ru/docs/webapps/validation). */
class MaxWebAppValidator
{
    private const AUTH_TTL_SECONDS = 3600;

    public function __construct(private readonly IntegrationSettings $integrations) {}

    /**
     * @return array{
     *     query_id?: string,
     *     auth_date: int,
     *     user?: array{id: int, first_name?: string, last_name?: string, username?: string|null, language_code?: string, photo_url?: string|null},
     *     chat?: array{id: int, type: string},
     *     start_param?: string,
     *     ip?: string
     * }
     */
    public function validate(string $initData): array
    {
        $token = $this->integrations->get('max_bot', 'bot_token');
        if ($token === null || $token === '') {
            throw ValidationException::withMessages(['init_data' => 'Вход через MAX не настроен.']);
        }

        $pairs = $this->parseInitData($initData);
        if (! array_key_exists('hash', $pairs)) {
            throw ValidationException::withMessages(['init_data' => 'Некорректные данные MAX.']);
        }

        $hash = $pairs['hash'];
        unset($pairs['hash']);

        ksort($pairs, SORT_STRING);
        $lines = [];
        foreach ($pairs as $key => $value) {
            $lines[] = $key.'='.$value;
        }
        $launchParams = implode("\n", $lines);

        $secretKey = hash_hmac('sha256', $token, 'WebAppData', true);
        $expected = hash_hmac('sha256', $launchParams, $secretKey);

        if (! hash_equals($expected, $hash)) {
            throw ValidationException::withMessages(['init_data' => 'Подпись данных MAX не совпадает.']);
        }

        if (! isset($pairs['auth_date']) || ! is_numeric($pairs['auth_date'])) {
            throw ValidationException::withMessages(['init_data' => 'Отсутствует auth_date.']);
        }

        $authDate = (int) $pairs['auth_date'];
        if ($authDate > time() + 30) {
            throw ValidationException::withMessages(['init_data' => 'Некорректное время auth_date.']);
        }

        if ($authDate < time() - self::AUTH_TTL_SECONDS) {
            throw ValidationException::withMessages(['init_data' => 'Данные MAX устарели. Откройте мини-приложение снова.']);
        }

        $out = ['auth_date' => $authDate];

        if (isset($pairs['query_id'])) {
            $out['query_id'] = $pairs['query_id'];
        }
        if (isset($pairs['start_param'])) {
            $out['start_param'] = $pairs['start_param'];
        }
        if (isset($pairs['ip'])) {
            $out['ip'] = $pairs['ip'];
        }
        if (isset($pairs['user'])) {
            $user = json_decode($pairs['user'], true);
            if (! is_array($user) || ! isset($user['id'])) {
                throw ValidationException::withMessages(['init_data' => 'Некорректный объект user.']);
            }
            $out['user'] = $user;
        }
        if (isset($pairs['chat'])) {
            $chat = json_decode($pairs['chat'], true);
            if (is_array($chat)) {
                $out['chat'] = $chat;
            }
        }

        return $out;
    }

    /** @return array<string, string> */
    private function parseInitData(string $initData): array
    {
        $initData = trim($initData);
        if ($initData === '') {
            return [];
        }

        $pairs = [];
        foreach (explode('&', $initData) as $chunk) {
            if ($chunk === '') {
                continue;
            }

            $eq = strpos($chunk, '=');
            if ($eq === false) {
                throw ValidationException::withMessages(['init_data' => 'Некорректный формат initData.']);
            }

            $key = substr($chunk, 0, $eq);
            $value = substr($chunk, $eq + 1);
            if ($key === '' || array_key_exists($key, $pairs)) {
                throw ValidationException::withMessages(['init_data' => 'Дублирующийся ключ в initData.']);
            }

            $pairs[$key] = rawurldecode($value);
        }

        return $pairs;
    }

    public function profileFromInitData(array $validated): SocialProfile
    {
        $user = $validated['user'] ?? null;
        if (! is_array($user) || ! isset($user['id'])) {
            throw ValidationException::withMessages(['init_data' => 'В initData нет пользователя MAX.']);
        }

        $name = trim(implode(' ', array_filter([
            $user['first_name'] ?? '',
            $user['last_name'] ?? '',
        ])));

        return new SocialProfile(
            provider: 'max',
            providerUserId: (string) $user['id'],
            email: null,
            phone: null,
            name: $name !== '' ? $name : ($user['username'] ?? null),
            avatar: isset($user['photo_url']) && is_string($user['photo_url']) ? $user['photo_url'] : null,
            raw: $validated,
            emailVerified: false,
        );
    }

    /** @internal Тестовая подпись initData. */
    public static function signForTest(string $botToken, array $fields): string
    {
        unset($fields['hash']);
        ksort($fields, SORT_STRING);

        $lines = [];
        foreach ($fields as $key => $value) {
            $lines[] = $key.'='.$value;
        }
        $launchParams = implode("\n", $lines);
        $secretKey = hash_hmac('sha256', $botToken, 'WebAppData', true);
        $hash = hash_hmac('sha256', $launchParams, $secretKey);
        $fields['hash'] = $hash;

        $parts = [];
        foreach ($fields as $key => $value) {
            $parts[] = rawurlencode($key).'='.rawurlencode($value);
        }

        return implode('&', $parts);
    }
}
