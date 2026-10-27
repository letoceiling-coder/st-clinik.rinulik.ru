<?php

namespace App\Services\Parser;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

class ParserOrganizationsClient
{
    public function __construct(
        private readonly string $baseUrl,
        private readonly ?string $apiKey,
    ) {}

    public static function fromConfig(): self
    {
        return new self(
            rtrim((string) config('services.parser_ai.base_url'), '/'),
            config('services.parser_ai.api_key') ?: null,
        );
    }

    public function configured(): bool
    {
        return $this->baseUrl !== '' && filled($this->apiKey);
    }

    /**
     * @param  array<string, mixed>  $query
     * @return array<string, mixed>
     */
    public function organizations(array $query = []): array
    {
        return $this->http()->get("{$this->baseUrl}/api/v1/organizations", $query)->throw()->json();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return list<array<string, mixed>>
     */
    public function fetchAllOrganizations(array $filters = []): array
    {
        $items = [];
        $offset = 0;

        do {
            $page = $this->organizations(array_merge($filters, [
                'limit' => 500,
                'offset' => $offset,
                'fields' => 'full',
            ]));
            $batch = $page['items'] ?? [];
            if (! is_array($batch)) {
                break;
            }
            $items = array_merge($items, $batch);
            $offset = $page['nextOffset'] ?? null;
        } while ($offset !== null);

        return $items;
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function cities(array $filters = []): array
    {
        return $this->http(30)->get("{$this->baseUrl}/api/v1/organizations/cities", $filters)->throw()->json();
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return array<string, mixed>
     */
    public function categories(array $filters = []): array
    {
        return $this->http(30)->get("{$this->baseUrl}/api/v1/organizations/categories", $filters)->throw()->json();
    }

    /**
     * @param  array<string, mixed>  $input
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    public function createTask(string $type, array $input, ?string $idempotencyKey = null, array $options = []): array
    {
        $request = $this->http(30);
        if ($idempotencyKey !== null) {
            $request = $request->withHeaders(['Idempotency-Key' => $idempotencyKey]);
        }

        return $request->post("{$this->baseUrl}/api/v1/tasks", array_filter([
            'type' => $type,
            'input' => $input,
            'options' => $options ?: null,
        ]))->throw()->json();
    }

    /**
     * Запуск сбора организаций с открытием каждой карточки (раздел 7 документации парсера).
     *
     * @param  array<string, mixed>  $body
     * @return array{taskId: string, mode?: string, plan?: array<string, mixed>, status?: array<string, mixed>, links?: array<string, string>}
     */
    public function startCollect(array $body, ?string $idempotencyKey = null): array
    {
        $request = $this->http(30);
        if ($idempotencyKey !== null) {
            $request = $request->withHeaders(['Idempotency-Key' => $idempotencyKey]);
        }

        return $request->post("{$this->baseUrl}/api/v1/organizations/collect", $body)->throw()->json();
    }

    /** @return array<string, mixed> */
    public function collectStatus(string $id): array
    {
        return $this->http(30)->get("{$this->baseUrl}/api/v1/organizations/collect/{$id}")->throw()->json();
    }

    /**
     * Собранные организации; пока сбор идёт — частичный результат (`final: false`).
     *
     * @return array<string, mixed>
     */
    public function collectResult(string $id): array
    {
        return $this->http(60)->get("{$this->baseUrl}/api/v1/organizations/collect/{$id}/result", ['format' => 'json'])->throw()->json();
    }

    /** @return array<string, mixed> */
    public function task(string $id): array
    {
        return $this->http(30)->get("{$this->baseUrl}/api/v1/tasks/{$id}")->throw()->json();
    }

    public function cancelTask(string $id): bool
    {
        $response = $this->http(30)->post("{$this->baseUrl}/api/v1/tasks/{$id}/cancel");

        return $response->successful() || $response->status() === 409;
    }

    private function http(int $timeout = 120): PendingRequest
    {
        if (! filled($this->apiKey)) {
            throw new \RuntimeException('API-ключ парсера не задан в центре интеграций.');
        }

        return Http::acceptJson()
            ->withToken((string) $this->apiKey)
            ->connectTimeout(10)
            ->timeout($timeout);
    }
}
