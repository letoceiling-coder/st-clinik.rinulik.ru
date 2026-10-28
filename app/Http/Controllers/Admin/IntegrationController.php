<?php

namespace App\Http\Controllers\Admin;

use App\Models\AnalyticsEvent;
use App\Models\AuditLog;
use App\Models\IntegrationCheck;
use App\Models\NotificationSubscription;
use App\Services\Audit;
use App\Services\Integrations\IntegrationChecker;
use App\Services\IntegrationSettings;
use App\Services\Max\MaxWebhookSync;
use App\Services\Notifications\NotificationSubscriptionService;
use App\Services\Notifications\WebPushSender;
use App\Support\Vapid;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Response;
use Throwable;

class IntegrationController extends AdminController
{
    private const AUDIT_ACTIONS = ['integration.updated', 'integration.checked', 'integration.keys_generated', 'integration.web_push_test'];

    public function index(Request $request, IntegrationSettings $settings, NotificationSubscriptionService $subscriptions): Response
    {
        $checks = IntegrationCheck::query()->with('checker:id,name')->get()->keyBy('group');
        $history = $this->history();
        $groups = [];

        foreach (config('integrations.groups', []) as $key => $def) {
            $values = $settings->groupValues($key);
            $check = $checks->get($key);

            $groups[] = [
                'key' => $key,
                'category' => $def['category'] ?? 'infra',
                'title' => $def['title'],
                'description' => $def['description'],
                'docs_url' => $def['docs_url'] ?? null,
                'instructions' => $this->withUrls(trim($def['instructions'] ?? '')),
                'checkable' => (bool) ($def['checkable'] ?? false),
                'generatable' => (bool) ($def['generatable'] ?? false),
                'fields' => collect($def['fields'])->map(fn (array $meta, string $field) => [
                    'name' => $field,
                    'label' => $meta['label'],
                    'type' => $meta['type'],
                    'secret' => (bool) ($meta['secret'] ?? false),
                    'optional' => (bool) ($meta['optional'] ?? false),
                    'options' => $meta['options'] ?? null,
                    'placeholder' => isset($meta['placeholder']) ? $this->withUrls($meta['placeholder']) : null,
                    'help' => $meta['help'] ?? null,
                    'value' => ($meta['secret'] ?? false) ? '' : ($values[$field] ?? ''),
                    'masked' => ($meta['secret'] ?? false) ? $settings->masked($values[$field] ?? null) : null,
                    'has_value' => filled($values[$field] ?? null),
                ])->values()->all(),
                'status' => $settings->status($key),
                'last_check' => $check ? [
                    'ok' => $check->ok,
                    'message' => $check->message,
                    'details' => $check->details ?? [],
                    'checked_at' => $check->checked_at->format('d.m.Y H:i'),
                    'checked_by' => $check->checker?->name,
                ] : null,
                'hints' => collect($def['hints'] ?? [])->map(fn (string $url) => $this->withUrls($url))->all(),
                'history' => $history->get($key, collect())->values()->all(),
            ];
        }

        return $this->render('Admin/Integrations', 'Интеграции', [
            'categories' => config('integrations.categories'),
            'groups' => $groups,
            'app_url' => $this->appUrl(),
            'yandex_metrika_goals' => collect(AnalyticsEvent::LABELS)
                ->map(fn (string $label, string $id): array => ['id' => $id, 'label' => $label])
                ->values()
                ->all(),
            'admin_web_push_subscribed' => $subscriptions->hasActiveWebPush($request->user()),
        ]);
    }

    public function update(Request $request, string $group, IntegrationSettings $settings): RedirectResponse
    {
        $fields = $this->fields($group);
        $data = $request->validate($this->rules($fields));

        foreach ($fields as $field => $meta) {
            if (($meta['secret'] ?? false) && ($data[$field] ?? '') === '') {
                $data[$field] = IntegrationSettings::UNCHANGED;
            }
        }

        $before = $settings->groupValues($group);
        $settings->saveGroup($group, $data);
        $after = $settings->groupValues($group);

        $changed = collect(array_keys($fields))->filter(fn (string $f) => ($before[$f] ?? null) !== ($after[$f] ?? null))->values();
        if ($changed->isNotEmpty()) {
            IntegrationCheck::query()->where('group', $group)->delete();
            Audit::log('integration.updated', null, [
                'group' => $group,
                'fields' => $changed->map(fn (string $f) => $fields[$f]['label'])->all(),
            ]);
        }

        $message = $changed->isEmpty()
            ? 'Изменений нет.'
            : 'Настройки «'.config("integrations.groups.{$group}.title").'» сохранены.';

        // Новый токен или секрет бота MAX — сразу переустанавливаем webhook, иначе вход и бот перестанут работать.
        if ($group === 'max_bot' && $changed->intersect(['bot_token', 'webhook_secret'])->isNotEmpty()) {
            $webhook = app(MaxWebhookSync::class)->sync(previousToken: $before['bot_token'] ?? null, force: true);
            Audit::log('integration.webhook_synced', null, ['group' => $group, 'ok' => $webhook['ok'], 'removed' => $webhook['removed']], $webhook['ok'] ? 'success' : 'failure');

            return back()->with($webhook['ok'] ? 'success' : 'error', $message.' '.$webhook['message']);
        }

        return back()->with('success', $message);
    }

    public function check(Request $request, string $group, IntegrationChecker $checker): RedirectResponse
    {
        abort_unless(config("integrations.groups.{$group}.checkable"), 404);

        $result = $checker->check($group, $request->user()->email);

        IntegrationCheck::updateOrCreate(['group' => $group], [
            'ok' => $result->ok,
            'message' => mb_substr($result->message, 0, 500),
            'details' => $result->details,
            'checked_by' => $request->user()->id,
            'checked_at' => now(),
        ]);
        Audit::log(
            'integration.checked',
            null,
            ['group' => $group, 'ok' => $result->ok, 'message' => mb_substr($result->message, 0, 200)],
            $result->ok ? 'success' : 'failure',
        );

        return back()->with($result->ok ? 'success' : 'error', $result->message);
    }

    public function generateVapid(IntegrationSettings $settings): RedirectResponse
    {
        abort_unless(config('integrations.groups.web_push.generatable'), 404);

        try {
            $keys = Vapid::generate();
        } catch (Throwable $e) {
            return back()->with('error', 'Не удалось сгенерировать ключи: '.$e->getMessage());
        }

        $settings->put('web_push', 'public_key', $keys['public_key']);
        $settings->put('web_push', 'private_key', $keys['private_key']);
        if (blank($settings->get('web_push', 'subject'))) {
            $settings->put('web_push', 'subject', $this->appUrl());
        }

        IntegrationCheck::query()->where('group', 'web_push')->delete();
        Audit::log('integration.keys_generated', null, ['group' => 'web_push']);

        return back()->with('success', 'Ключи VAPID сгенерированы и сохранены.');
    }

    public function sendTestWebPush(Request $request, WebPushSender $sender): RedirectResponse
    {
        abort_unless(config('integrations.groups.web_push.generatable'), 404);

        $user = $request->user();
        if (! $sender->configured()) {
            return back()->with('error', 'Сначала сгенерируйте ключи VAPID и укажите контакт (mailto: или https://).');
        }

        $subscriptions = $sender->activeSubscriptionsFor((int) $user->id);
        if ($subscriptions === []) {
            return back()->with(
                'error',
                'Нет активной подписки в этом браузере. Откройте «Личный кабинет → Профиль», включите push-уведомления и повторите.',
            );
        }

        $title = 'Тест МирКлиник';
        $body = 'Web Push работает — можно получать уведомления в браузере.';
        $url = route('admin.integrations.index').'#integration-web_push';

        $sent = 0;
        $failed = 0;
        foreach ($subscriptions as $subscription) {
            $payload = is_array($subscription->meta['subscription'] ?? null)
                ? $subscription->meta['subscription']
                : null;
            if ($payload === null) {
                $failed++;

                continue;
            }

            $result = $sender->send($payload, $title, $body, $url);
            if ($result->success) {
                $sent++;
            } else {
                $failed++;
                if ($result->subscriptionExpired) {
                    $subscription->update([
                        'status' => NotificationSubscription::STATUS_REVOKED,
                        'revoked_at' => now(),
                    ]);
                }
            }
        }

        Audit::log(
            'integration.web_push_test',
            null,
            ['group' => 'web_push', 'sent' => $sent, 'failed' => $failed],
            $sent > 0 ? 'success' : 'failure',
        );

        if ($sent === 0) {
            return back()->with('error', 'Push не доставлен. Проверьте ключи и подписку или включите push заново в профиле.');
        }

        $message = $failed > 0
            ? "Тестовый push отправлен на {$sent} устройств(а), не доставлен: {$failed}."
            : "Тестовый push отправлен ({$sent}). Проверьте уведомление в браузере.";

        return back()->with('success', $message);
    }

    /** @return array<string, array<string, mixed>> */
    private function fields(string $group): array
    {
        $fields = config("integrations.groups.{$group}.fields");
        abort_unless(is_array($fields), 404);

        return $fields;
    }

    /**
     * @param  array<string, array<string, mixed>>  $fields
     * @return array<string, mixed>
     */
    private function rules(array $fields): array
    {
        return collect($fields)->map(fn (array $meta) => match ($meta['type'] ?? 'text') {
            'checkbox' => ['nullable', 'boolean'],
            'url' => ['nullable', 'url:http,https', 'max:512'],
            'email' => ['nullable', 'email', 'max:255'],
            'number' => ['nullable', 'numeric', 'min:0'],
            'select' => ['nullable', Rule::in(array_keys($meta['options'] ?? []))],
            default => ['nullable', 'string', 'max:1000'],
        })->all();
    }

    /** @return Collection<string, Collection<int, array<string, mixed>>> */
    private function history(): Collection
    {
        return AuditLog::query()
            ->whereIn('action', self::AUDIT_ACTIONS)
            ->with('user:id,name')
            ->latest('id')
            ->limit(300)
            ->get()
            ->groupBy(fn (AuditLog $log) => $log->meta['group'] ?? '')
            ->map(fn (Collection $logs) => $logs->take(5)->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'at' => $log->created_at->format('d.m.Y H:i'),
                'user' => $log->user?->name ?? 'система',
                'text' => match ($log->action) {
                    'integration.updated' => empty($log->meta['fields']) ? 'Сохранены настройки' : 'Изменены поля: '.implode(', ', $log->meta['fields']),
                    'integration.checked' => (($log->meta['ok'] ?? false) ? 'Проверка успешна' : 'Проверка не прошла').(isset($log->meta['message']) ? ': '.$log->meta['message'] : ''),
                    'integration.web_push_test' => 'Тестовый push: доставлено '.(int) ($log->meta['sent'] ?? 0).', ошибок '.(int) ($log->meta['failed'] ?? 0),
                    default => 'Сгенерированы новые ключи',
                },
            ]));
    }

    private function withUrls(string $text): string
    {
        return strtr($text, [
            '{app_url}' => $this->appUrl(),
            '{app_host}' => (string) parse_url($this->appUrl(), PHP_URL_HOST),
        ]);
    }
}
