<?php

namespace App\Services;

use App\Models\IntegrationSetting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;

class IntegrationSettings
{
    private const CACHE_KEY = 'integration_settings.v1';

    /** Применяет значения из БД (с fallback на .env) к runtime config. */
    public function applyToConfig(): void
    {
        foreach (config('integrations.groups', []) as $group => $def) {
            foreach ($def['config'] ?? [] as $field => $configPath) {
                $value = $this->get($group, $field);
                if ($value !== null && $value !== '') {
                    config([$configPath => $this->castValue($field, $value)]);
                }
            }
        }
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

            $key = "{$group}.{$field}";

            if ($raw === null || $raw === '') {
                IntegrationSetting::query()->where('group', $group)->where('key', $field)->delete();

                continue;
            }

            if (($meta['secret'] ?? false) && $raw === '__unchanged__') {
                continue;
            }

            $stored = ($meta['secret'] ?? false) ? Crypt::encryptString((string) $raw) : (string) $raw;

            IntegrationSetting::updateOrCreate(
                ['group' => $group, 'key' => $field],
                ['value' => $stored],
            );
        }

        Cache::forget(self::CACHE_KEY);
        $this->applyToConfig();
    }

    /** @return array<string, mixed> */
    public function status(string $group): array
    {
        $values = $this->groupValues($group);
        $required = collect(config("integrations.groups.{$group}.fields", []))
            ->reject(fn ($meta, $field) => ($meta['type'] ?? '') === 'checkbox' || $field === 'enabled')
            ->keys();

        $filled = $required->filter(fn ($field) => filled($values[$field] ?? null));

        return [
            'configured' => $required->isEmpty() ? true : $filled->count() === $required->count(),
            'filled' => $filled->count(),
            'total' => $required->count(),
        ];
    }

    /** @return array<string, string|null> group.field => value */
    private function all(): array
    {
        return Cache::rememberForever(self::CACHE_KEY, function () {
            $out = [];
            foreach (IntegrationSetting::query()->get(['group', 'key', 'value']) as $row) {
                $composite = "{$row->group}.{$row->key}";
                $meta = config("integrations.groups.{$row->group}.fields.{$row->key}", []);
                $value = $row->value;
                if (($meta['secret'] ?? false) && $value) {
                    try {
                        $value = Crypt::decryptString($value);
                    } catch (\Throwable) {
                        $value = $row->value;
                    }
                }
                $out[$composite] = $value;
            }

            return $out;
        });
    }

    private function castValue(string $field, string $value): mixed
    {
        if ($field === 'enabled') {
            return filter_var($value, FILTER_VALIDATE_BOOLEAN);
        }

        if ($field === 'port') {
            return (int) $value;
        }

        return $value;
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
}
