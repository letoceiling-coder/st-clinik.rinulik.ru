<?php

namespace App\Services;

use App\Models\IntegrationSetting;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;

class IntegrationSettings
{
    private const CACHE_KEY = 'integration_settings.v1';

    public const UNCHANGED = '__unchanged__';

    /** Применяет значения из БД (с fallback на .env) к runtime config. */
    public function applyToConfig(): void
    {
        foreach (config('integrations.groups', []) as $group => $def) {
            foreach ($def['config'] ?? [] as $field => $configPath) {
                $value = $this->get($group, $field);
                if ($value !== null && $value !== '') {
                    config([$configPath => $this->castValue($group, $field, $value)]);
                }
            }
        }
    }

    /** Значение интеграции по dot-пути runtime config (например services.yandex.maps_api_key). */
    public function valueForConfigPath(string $configPath): ?string
    {
        foreach (config('integrations.groups', []) as $group => $def) {
            foreach ($def['config'] ?? [] as $field => $path) {
                if ($path !== $configPath) {
                    continue;
                }

                $value = $this->get($group, $field);

                return filled($value) ? $value : null;
            }
        }

        $fromConfig = config($configPath);

        if (is_string($fromConfig) && filled($fromConfig)) {
            return $fromConfig;
        }

        return null;
    }

    public function get(string $group, string $field): ?string
    {
        $stored = $this->all()["{$group}.{$field}"] ?? null;
        if ($stored !== null && $stored !== '') {
            return $stored;
        }

        $configPath = config("integrations.groups.{$group}.config.{$field}");
        if (! $configPath) {
            return null;
        }

        $envKey = config("integrations.env_fallback.{$configPath}");
        if ($envKey) {
            $fromEnv = env($envKey);

            return $fromEnv !== null && $fromEnv !== '' ? (string) $fromEnv : null;
        }

        $fromConfig = config($configPath);
        if (is_bool($fromConfig)) {
            return $fromConfig ? '1' : '0';
        }

        return $fromConfig !== null && $fromConfig !== '' ? (string) $fromConfig : null;
    }

    /** @return array<string, string|null> */
    public function groupValues(string $group): array
    {
        $fields = config("integrations.groups.{$group}.fields", []);
        $out = [];
        foreach (array_keys($fields) as $field) {
            $out[$field] = $this->get($group, $field);
        }

        return $out;
    }

    /** @param array<string, mixed> $values */
    public function saveGroup(string $group, array $values): void
    {
        $fields = config("integrations.groups.{$group}.fields", []);
        abort_if($fields === [], 404);

        foreach ($fields as $field => $meta) {
            if (! array_key_exists($field, $values)) {
                continue;
            }

            $raw = $values[$field];
            if (($meta['type'] ?? '') === 'checkbox') {
                $raw = filter_var($raw, FILTER_VALIDATE_BOOLEAN) ? '1' : '0';
            }

            if (($meta['secret'] ?? false) && $raw === self::UNCHANGED) {
                continue;
            }

            $this->store($group, $field, $raw === null ? null : trim((string) $raw), (bool) ($meta['secret'] ?? false));
        }

        $this->flush();
    }

    /** Точечная запись значения (автозаполнение после проверки, генерация ключей). */
    public function put(string $group, string $field, ?string $value): void
    {
        $meta = config("integrations.groups.{$group}.fields.{$field}");
        abort_if($meta === null, 404);

        $this->store($group, $field, $value, (bool) ($meta['secret'] ?? false));
        $this->flush();
    }

    /** @return array{configured: bool, filled: int, total: int} */
    public function status(string $group): array
    {
        $values = $this->groupValues($group);
        $required = collect(config("integrations.groups.{$group}.fields", []))
            ->reject(fn (array $meta) => ($meta['type'] ?? '') === 'checkbox' || ($meta['optional'] ?? false))
            ->keys();

        $filled = $required->filter(fn (string $field) => filled($values[$field] ?? null));

        return [
            'configured' => $filled->count() === $required->count(),
            'filled' => $filled->count(),
            'total' => $required->count(),
        ];
    }

    public function masked(?string $value): ?string
    {
        if (! $value) {
            return null;
        }

        $len = mb_strlen($value);
        if ($len <= 4) {
            return str_repeat('•', $len);
        }

        return mb_substr($value, 0, 2).str_repeat('•', min(12, $len - 4)).mb_substr($value, -2);
    }

    private function store(string $group, string $field, ?string $value, bool $secret): void
    {
        if ($value === null || $value === '') {
            IntegrationSetting::query()->where('group', $group)->where('key', $field)->delete();

            return;
        }

        IntegrationSetting::updateOrCreate(
            ['group' => $group, 'key' => $field],
            ['value' => $secret ? Crypt::encryptString($value) : $value],
        );
    }

    /** Сбрасывает кэш, применяет значения и просит обработчики очередей перезапуститься с новыми ключами. */
    private function flush(): void
    {
        Cache::forget(self::CACHE_KEY);
        $this->applyToConfig();
        Artisan::call('queue:restart');
    }

    /** @return array<string, string|null> group.field => value */
    private function all(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function () {
            $out = [];
            foreach (IntegrationSetting::query()->get(['group', 'key', 'value']) as $row) {
                $meta = config("integrations.groups.{$row->group}.fields.{$row->key}", []);
                $value = $row->value;
                if (($meta['secret'] ?? false) && $value) {
                    try {
                        $value = Crypt::decryptString($value);
                    } catch (\Throwable) {
                        $value = null;
                    }
                }
                $out["{$row->group}.{$row->key}"] = $value;
            }

            return $out;
        });
    }

    private function castValue(string $group, string $field, string $value): mixed
    {
        $type = config("integrations.groups.{$group}.fields.{$field}.type");

        return match (true) {
            $type === 'checkbox' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            $type === 'number' && is_numeric($value) => str_contains($value, '.') ? (float) $value : (int) $value,
            default => $value,
        };
    }
}
