<?php

namespace App\Services\Parser;

use App\Models\OrganizationContact;
use App\Models\ParsedOrganization;
use App\Models\ParserTask;
use App\Models\User;
use App\Services\Audit;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Arr;
use RuntimeException;

class ParserTaskService
{
    /** Через сколько часов задача без финального статуса считается потерянной. */
    private const STALE_AFTER_HOURS = 8;

    private const MAX_EMAILS = 10;

    /** Как часто подтягивать уже собранные карточки, пока сбор идёт. */
    private const PARTIAL_RESULT_EVERY_SECONDS = 60;

    private const DEFAULT_COLLECT_COST_USD = 0.15;

    private const MAX_COLLECT_COST_USD = 2.0;

    public function __construct(private readonly ParsedOrganizationStore $store) {}

    /**
     * Сбор стоматологий через `POST /api/v1/organizations/collect`: парсер открывает каждую карточку
     * и собирает всё доступное, а статус отдаёт с этапами, счётчиками и ETA.
     *
     * @param  array{city: string, query?: string|null, count: int}  $params
     */
    public function launchSearch(array $params, ?User $by): ParserTask
    {
        $maxCost = $this->costLimit(null);
        $body = array_filter([
            'city' => $params['city'],
            'category' => ParserTask::CATEGORY,
            'query' => $params['query'] ?? null,
            'count' => $params['count'],
            'fields' => 'all_available',
            'includePhotos' => true,
            'normalizeWithLlm' => true,
            'maxCostUsd' => $maxCost,
            'priority' => 3,
        ], fn ($v) => $v !== null && $v !== '');

        $client = $this->client();
        $key = $this->idempotencyKey(ParserTask::COLLECT, $body);
        if ($existing = $this->reusable($key)) {
            return $existing;
        }
        $this->guardDailyBudget($maxCost);

        try {
            $remote = $client->startCollect($body, $key);
        } catch (RequestException $e) {
            throw $this->rejected($e);
        }

        $task = ParserTask::create([
            'external_id' => (string) $remote['taskId'],
            'type' => ParserTask::COLLECT,
            'purpose' => 'search',
            'input' => $body,
            'idempotency_key' => $key,
            'status' => 'queued',
            'progress' => (int) data_get($remote, 'status.progress', 0),
            'remote' => $this->snapshot((array) ($remote['status'] ?? []), []),
            'status_page_url' => data_get($remote, 'links.statusPage'),
            'created_by' => $by?->id,
        ]);
        Audit::log('parser.task_created', $task, ['type' => ParserTask::COLLECT, 'city' => $params['city'], 'query' => $params['query'] ?? null, 'count' => $params['count']]);

        return $task;
    }

    public function launchEmailSearch(ParsedOrganization $organization, ?User $by): ParserTask
    {
        if (! $organization->website) {
            throw new RuntimeException('У организации нет сайта — искать email негде.');
        }

        $task = $this->launch('page.html', 'emails', [
            'url' => $organization->website,
            'scope' => 'body',
            'includeText' => true,
            'stripScripts' => true,
            'maxBytes' => 2_000_000,
        ], $by, parsedOrganizationId: $organization->id);
        Audit::log('parser.email_search', $organization, ['url' => $organization->website]);

        return $task;
    }

    public function cancel(ParserTask $task): void
    {
        if ($task->isFinal()) {
            return;
        }
        if ($task->external_id) {
            ParserOrganizationsClient::fromConfig()->cancelTask($task->external_id);
        }
        $task->update(['status' => 'cancelled', 'completed_at' => now()]);
        Audit::log('parser.task_cancelled', $task);
    }

    /** Обновляет статус задачи из парсера; по завершении забирает результат. */
    public function poll(ParserTask $task): ParserTask
    {
        if ($task->isFinal() || $task->external_id === null) {
            return $task;
        }
        if ($task->type === ParserTask::COLLECT) {
            return $this->pollCollect($task);
        }

        try {
            $remote = ParserOrganizationsClient::fromConfig()->task($task->external_id);
        } catch (RequestException $e) {
            if ($e->response->status() === 404) {
                $task->update(['status' => 'failed', 'error' => 'Задача не найдена в парсере.', 'completed_at' => now(), 'last_polled_at' => now()]);
            }

            return $task;
        }

        $status = array_key_exists((string) ($remote['status'] ?? ''), ParserTask::STATUSES) ? $remote['status'] : $task->status;
        $task->fill([
            'status' => $status,
            'progress' => max(0, min(100, (int) ($remote['progress'] ?? $task->progress))),
            'error' => $this->errorText($remote['error'] ?? null),
            'cost_usd' => $this->cost($remote) ?? $task->cost_usd,
            'started_at' => isset($remote['startedAt']) ? now()->parse($remote['startedAt']) : $task->started_at,
            'completed_at' => isset($remote['completedAt']) ? now()->parse($remote['completedAt']) : $task->completed_at,
            'last_polled_at' => now(),
        ]);

        if (! $task->isFinal() && $task->created_at?->lt(now()->subHours(self::STALE_AFTER_HOURS))) {
            $task->fill(['status' => 'stale', 'error' => 'Парсер не завершил задачу за '.self::STALE_AFTER_HOURS.' ч.', 'completed_at' => now()]);
        }
        $task->save();

        if ($status === 'completed') {
            $task->purpose === 'emails'
                ? $this->collectEmails($task, (array) ($remote['result'] ?? []))
                : $this->collectOrganizations($task, (array) ($remote['result'] ?? []));
        }

        return $task;
    }

    private function pollCollect(ParserTask $task): ParserTask
    {
        try {
            $remote = $this->client()->collectStatus((string) $task->external_id);
        } catch (RequestException $e) {
            if ($e->response->status() === 404) {
                $task->update(['status' => 'failed', 'error' => 'Задача не найдена в парсере.', 'completed_at' => now(), 'last_polled_at' => now()]);
            }

            return $task;
        }

        $status = array_key_exists((string) ($remote['status'] ?? ''), ParserTask::STATUSES) ? $remote['status'] : $task->status;
        $collected = (int) data_get($remote, 'counts.collected', $task->collected_count);
        $task->fill([
            'status' => $status,
            'progress' => max(0, min(100, (int) ($remote['progress'] ?? $task->progress))),
            'collected_count' => $collected,
            'remote' => $this->snapshot($remote, (array) $task->remote),
            'error' => $status === 'failed'
                ? $this->errorText($remote['error'] ?? data_get($remote, 'result.blockedReason') ?? $remote['message'] ?? 'Парсер вернул ошибку')
                : null,
            'cost_usd' => $this->cost($remote) ?? $task->cost_usd,
            'started_at' => data_get($remote, 'timing.startedAt') ? now()->parse(data_get($remote, 'timing.startedAt')) : $task->started_at,
            'completed_at' => data_get($remote, 'timing.completedAt') ? now()->parse(data_get($remote, 'timing.completedAt')) : $task->completed_at,
            'last_polled_at' => now(),
        ]);

        if (! $task->isFinal() && $task->created_at?->lt(now()->subHours(self::STALE_AFTER_HOURS))) {
            $task->fill(['status' => 'stale', 'error' => 'Парсер не завершил сбор за '.self::STALE_AFTER_HOURS.' ч.', 'completed_at' => now()]);
        }
        $task->save();

        $fetched = (int) data_get($task->remote, 'fetchedCollected', 0);
        $throttled = $task->result_fetched_at?->gt(now()->subSeconds(self::PARTIAL_RESULT_EVERY_SECONDS)) ?? false;
        if ($collected > 0 && ($task->isFinal() || ($collected > $fetched && ! $throttled))) {
            $this->collectResult($task);
        }

        return $task;
    }

    /** Переносит собранные (в том числе частично) карточки в промежуточную таблицу. */
    private function collectResult(ParserTask $task): void
    {
        try {
            $result = $this->client()->collectResult((string) $task->external_id);
        } catch (\Throwable $e) {
            report($e);

            return;
        }

        $items = array_values(array_filter((array) ($result['organizations'] ?? []), 'is_array'));
        $city = $task->input['city'] ?? null;
        $stats = $this->store->upsert($items, $task, is_string($city) ? $city : null);

        $task->update([
            'found_count' => $stats['found'],
            'new_count' => $task->new_count + $stats['created'],
            'cost_usd' => $this->cost(['result' => $result]) ?? $task->cost_usd,
            'remote' => [...(array) $task->remote, 'fetchedCollected' => count($items), 'partial' => (bool) ($result['partial'] ?? false)],
            'result_fetched_at' => now(),
        ]);
    }

    /**
     * Сжатый снимок статуса сбора для индикатора: без данных организаций.
     *
     * @param  array<string, mixed>  $remote
     * @param  array<string, mixed>  $previous
     * @return array<string, mixed>
     */
    private function snapshot(array $remote, array $previous): array
    {
        return [
            ...Arr::only($previous, ['fetchedCollected', 'partial']),
            ...Arr::only($remote, ['stage', 'stageLabel', 'message', 'stages', 'counts', 'lastOrganization', 'needsAttention', 'queue', 'timing']),
            'blocked' => (bool) data_get($remote, 'result.blocked', false),
            'recentEvents' => array_slice((array) ($remote['recentEvents'] ?? []), -5),
        ];
    }

    /**
     * @param  array<string, mixed>  $result
     */
    private function collectOrganizations(ParserTask $task, array $result): void
    {
        $city = $task->input['city'] ?? null;
        try {
            $items = ParserOrganizationsClient::fromConfig()->fetchAllOrganizations(['taskId' => $task->external_id]);
        } catch (\Throwable) {
            $items = [];
        }
        if ($items === []) {
            $items = array_values(array_filter((array) ($result['organizations'] ?? []), 'is_array'));
        }

        $stats = $this->store->upsert($items, $task, is_string($city) ? $city : null);
        $task->update(['found_count' => $stats['found'], 'new_count' => $stats['created']]);
    }

    /**
     * @param  array<string, mixed>  $result
     */
    private function collectEmails(ParserTask $task, array $result): void
    {
        $organization = $task->parsedOrganization;
        if ($organization === null) {
            return;
        }

        $emails = $this->extractEmails(((string) ($result['text'] ?? '')).' '.((string) ($result['html'] ?? '')));
        foreach ($emails as $email) {
            OrganizationContact::query()->firstOrCreate(
                ['parsed_organization_id' => $organization->id, 'type' => 'email', 'value' => $email],
                ['source' => 'site', 'clinic_id' => $organization->clinic_id],
            );
        }
        $task->update(['found_count' => count($emails), 'new_count' => count($emails)]);
    }

    /** @return list<string> */
    public function extractEmails(string $content): array
    {
        $content = html_entity_decode(urldecode(str_ireplace(['&#64;', '[at]', '(at)', ' собака '], '@', $content)));
        preg_match_all('/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,24}/i', $content, $m);

        $emails = [];
        foreach ($m[0] as $email) {
            $email = mb_strtolower(trim($email, '.-'));
            $domain = substr($email, strpos($email, '@') + 1);
            if (preg_match('/\.(png|jpe?g|gif|webp|svg|css|js)$/', $email)
                || preg_match('/(^|\.)(example\.(com|ru|org)|domain\.(com|ru)|sentry\.io|wixpress\.com|sentry-next\.wixpress\.com)$/', $domain)) {
                continue;
            }
            $emails[$email] = $email;
        }

        return array_slice(array_values($emails), 0, self::MAX_EMAILS);
    }

    /**
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>  $meta
     */
    private function launch(string $type, string $purpose, array $input, ?User $by, ?int $parsedOrganizationId = null, array $meta = []): ParserTask
    {
        $client = $this->client();
        $key = $this->idempotencyKey($type, $input);
        if ($existing = $this->reusable($key)) {
            return $existing;
        }

        try {
            $remote = $client->createTask($type, $input, $key);
        } catch (RequestException $e) {
            throw $this->rejected($e);
        }

        return ParserTask::create([
            'external_id' => (string) $remote['id'],
            'type' => $type,
            'purpose' => $purpose,
            'parsed_organization_id' => $parsedOrganizationId,
            'input' => [...$input, ...Arr::where($meta, fn ($v, $k) => ! array_key_exists($k, $input))],
            'idempotency_key' => $key,
            'status' => array_key_exists((string) ($remote['status'] ?? ''), ParserTask::STATUSES) ? $remote['status'] : 'queued',
            'created_by' => $by?->id,
        ]);
    }

    private function client(): ParserOrganizationsClient
    {
        $client = ParserOrganizationsClient::fromConfig();
        if (! $client->configured()) {
            throw new RuntimeException('Парсер не настроен: укажите адрес и API-ключ в разделе «Интеграции».');
        }

        return $client;
    }

    /** @param array<string, mixed> $input */
    private function idempotencyKey(string $type, array $input): string
    {
        return sha1($type.'|'.json_encode($input).'|'.now()->toDateString());
    }

    private function reusable(string $key): ?ParserTask
    {
        return ParserTask::query()->where('idempotency_key', $key)->whereNotIn('status', ['failed', 'cancelled', 'stale'])->first();
    }

    private function rejected(RequestException $e): RuntimeException
    {
        if ($e->response->status() === 429) {
            return new RuntimeException('Парсер сейчас перегружен (лимит запросов или одновременных задач). Попробуйте через несколько минут.');
        }
        $message = $e->response->json('error.message') ?? $e->response->json('message') ?? $e->response->json('error') ?? 'HTTP '.$e->response->status();

        return new RuntimeException('Парсер отклонил задачу: '.(is_string($message) ? $message : json_encode($message, JSON_UNESCAPED_UNICODE)));
    }

    /** Потолок расходов на AI для одного сбора: настройка из «Интеграций», но не больше лимита API. */
    private function costLimit(mixed $requested): float
    {
        $configured = min((float) (config('services.parser_ai.task_cost_limit_usd') ?: self::DEFAULT_COLLECT_COST_USD), self::MAX_COLLECT_COST_USD);
        $requested = is_numeric($requested) && (float) $requested > 0 ? (float) $requested : $configured;

        return round(min($requested, $configured), 4);
    }

    private function guardDailyBudget(float $nextCost): void
    {
        $budget = (float) (config('services.parser_ai.daily_budget_usd') ?: 0);
        if ($budget <= 0) {
            return;
        }

        $spent = (float) ParserTask::query()->where('created_at', '>=', now()->startOfDay())->sum('cost_usd');
        $reserved = (float) ParserTask::query()->active()->whereIn('type', ['organizations.agent', ParserTask::COLLECT])
            ->where('created_at', '>=', now()->startOfDay())->get()
            ->sum(fn (ParserTask $t) => (float) ($t->input['maxCostUsd'] ?? 0));

        if ($spent + $reserved + $nextCost > $budget) {
            throw new RuntimeException(sprintf('Суточный бюджет парсера исчерпан: потрачено %.2f USD, в работе до %.2f USD, лимит %.2f USD.', $spent, $reserved, $budget));
        }
    }

    /** @param array<string, mixed> $remote */
    private function cost(array $remote): ?float
    {
        foreach (['result.stats.costUsd', 'result.stats.totalCostUsd', 'result.costUsd', 'costUsd', 'cost'] as $path) {
            $value = data_get($remote, $path);
            if (is_numeric($value)) {
                return (float) $value;
            }
        }

        return null;
    }

    private function errorText(mixed $error): ?string
    {
        if ($error === null || $error === '') {
            return null;
        }
        $text = is_string($error) ? $error : (string) (data_get($error, 'message') ?? json_encode($error, JSON_UNESCAPED_UNICODE));

        return mb_substr($text, 0, 1000);
    }
}
