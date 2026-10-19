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

    /**
     * @param  array<string, mixed>  $query
     * @return array<string, mixed>
     */
    public function organizations(array $query = []): array
    {
        return $this->http()->get("{$this->baseUrl}/api/v1/organizations", $query)->throw()->json();
    }

    /**
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

    private function http(): PendingRequest
    {
        if ($this->apiKey === null || $this->apiKey === '') {
            throw new \RuntimeException('PARSER_AI_KEY is not configured.');
        }

        return Http::acceptJson()
            ->withToken($this->apiKey)
            ->timeout(120);
    }
}
