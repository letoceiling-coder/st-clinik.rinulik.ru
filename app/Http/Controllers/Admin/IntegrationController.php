<?php

namespace App\Http\Controllers\Admin;

use App\Services\Audit;
use App\Services\IntegrationSettings;
use App\Services\YooKassaService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class IntegrationController extends AdminController
{
    public function index(IntegrationSettings $settings): Response
    {
        $appUrl = rtrim((string) config('app.url'), '/');
        $groups = [];

        foreach (config('integrations.groups', []) as $key => $def) {
            $values = $settings->groupValues($key);
            $fields = [];
            foreach ($def['fields'] as $field => $meta) {
                $value = $values[$field] ?? null;
                $fields[] = [
                    'name' => $field,
                    'label' => $meta['label'],
                    'type' => $meta['type'],
                    'secret' => (bool) ($meta['secret'] ?? false),
                    'value' => ($meta['secret'] ?? false) ? '' : ($value ?? ''),
                    'masked' => ($meta['secret'] ?? false) ? $settings->masked($value) : null,
                    'has_value' => filled($value),
                ];
            }

            $groups[] = [
                'key' => $key,
                'title' => $def['title'],
                'description' => $def['description'],
                'docs_url' => $def['docs_url'] ?? null,
                'instructions' => trim($def['instructions'] ?? ''),
                'fields' => $fields,
                'status' => $settings->status($key),
                'hints' => $this->hints($key, $appUrl),
            ];
        }

        return $this->render('Admin/Integrations', 'Интеграции', [
            'groups' => $groups,
            'yookassa_ready' => app(YooKassaService::class)->configured(),
            'app_url' => $appUrl,
        ]);
    }

    public function update(Request $request, string $group, IntegrationSettings $settings): RedirectResponse
    {
        abort_unless(isset(config('integrations.groups')[$group]), 404);

        $fieldRules = [];
        foreach (config("integrations.groups.{$group}.fields", []) as $field => $meta) {
            $type = $meta['type'] ?? 'text';
            $rule = match ($type) {
                'checkbox' => 'nullable|boolean',
                'url' => 'nullable|url|max:512',
                'password' => 'nullable|string|max:500',
                default => 'nullable|string|max:500',
            };
            $fieldRules[$field] = $rule;
        }

        $data = $request->validate($fieldRules);

        foreach (config("integrations.groups.{$group}.fields", []) as $field => $meta) {
            if (($meta['secret'] ?? false) && ($data[$field] ?? '') === '') {
                $data[$field] = '__unchanged__';
            }
        }

        $settings->saveGroup($group, $data);
        Audit::log('integration.updated', null, ['group' => $group]);

        return back()->with('success', 'Настройки «'.config("integrations.groups.{$group}.title").'» сохранены.');
    }

    /** @return array<string, string> */
    private function hints(string $group, string $appUrl): array
    {
        return match ($group) {
            'yookassa' => [
                'return_url' => "{$appUrl}/clinic-cabinet/promotions/return",
                'webhook' => "{$appUrl}/payments/yookassa/webhook",
            ],
            'yandex_maps' => [],
            'yandex_oauth' => ['redirect_uri' => "{$appUrl}/auth/yandex/callback"],
            'vk_oauth' => ['redirect_uri' => "{$appUrl}/auth/vk/callback"],
            'max_oauth' => ['redirect_uri' => "{$appUrl}/auth/max/callback"],
            default => [],
        };
    }
}
