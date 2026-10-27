<?php

namespace App\Services\Assistant;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Psr\Http\Message\ResponseInterface;
use RuntimeException;

class OpenRouterChatClient
{
    public function __construct(private readonly OpenRouterBudgetGuard $budget) {}

    /**
     * @param  list<array<string, mixed>>  $messages
     */
    public function complete(array $messages, ?string $model = null): string
    {
        $this->budget->assertWithinBudget();

        return $this->runToolLoop($messages, [], null, 1, null, $model);
    }

    /**
     * @param  list<array<string, mixed>>  $messages
     * @param  list<array<string, mixed>>  $tools
     * @param  (callable(string, array<string, mixed>): string)|null  $executeTool
     */
    public function completeWithTools(array $messages, array $tools, ?callable $executeTool, int $maxRounds = 4): string
    {
        $this->budget->assertWithinBudget();

        return $this->runToolLoop($messages, $tools, $executeTool, $maxRounds, null);
    }

    /**
     * @param  list<array<string, mixed>>  $messages
     * @param  list<array<string, mixed>>  $tools
     * @param  (callable(string, array<string, mixed>): string)|null  $executeTool
     * @param  callable(string): void|null  $onDelta
     */
    public function completeWithToolsStreaming(
        array $messages,
        array $tools,
        ?callable $executeTool,
        ?callable $onDelta,
        int $maxRounds = 4,
    ): string {
        $this->budget->assertWithinBudget();

        return $this->runToolLoop($messages, $tools, $executeTool, $maxRounds, $onDelta);
    }

    /**
     * @param  list<array<string, mixed>>  $messages
     * @param  list<array<string, mixed>>  $tools
     * @param  (callable(string, array<string, mixed>): string)|null  $executeTool
     * @param  callable(string): void|null  $onDelta
     */
    private function runToolLoop(
        array $messages,
        array $tools,
        ?callable $executeTool,
        int $maxRounds,
        ?callable $onDelta,
        ?string $modelOverride = null,
    ): string {
        $token = config('services.openrouter.api_key');
        if (! filled($token)) {
            throw new RuntimeException('OpenRouter API key is not configured.');
        }

        $base = rtrim((string) config('services.openrouter.base_url', 'https://openrouter.ai/api/v1'), '/');
        $model = filled($modelOverride) ? (string) $modelOverride : (string) config('services.openrouter.chat_model', 'openai/gpt-4o-mini');
        $maxTokens = (int) config('services.openrouter.max_tokens', 800);

        $round = 0;
        while ($round < $maxRounds) {
            $round++;
            $payload = [
                'model' => $model,
                'max_tokens' => max(64, min($maxTokens, 4096)),
                'temperature' => 0.4,
                'messages' => $messages,
            ];

            $useStream = $onDelta !== null;
            if ($useStream) {
                $payload['stream'] = true;
            }

            if ($tools !== [] && $executeTool !== null) {
                $payload['tools'] = $tools;
                $payload['tool_choice'] = 'auto';
            }

            if ($useStream) {
                $assembled = $this->postStream("{$base}/chat/completions", $token, $payload, $onDelta);
                $this->budget->record($assembled['usage'] ?? null, 'chat');
                $message = $assembled['message'];
            } else {
                $response = $this->http($token)->post("{$base}/chat/completions", $payload);
                if (! $response->successful()) {
                    Log::warning('openrouter.chat_failed', [
                        'status' => $response->status(),
                        'body' => $response->body(),
                    ]);

                    throw new RuntimeException('OpenRouter request failed.');
                }
                $this->budget->record($response->json('usage'), 'chat');
                $choice = $response->json('choices.0');
                $message = is_array($choice['message'] ?? null) ? $choice['message'] : null;
            }

            if ($message === null) {
                throw new RuntimeException('OpenRouter returned no message.');
            }

            $toolCalls = $message['tool_calls'] ?? null;
            if (! is_array($toolCalls) || $toolCalls === [] || $executeTool === null) {
                $content = $message['content'] ?? '';
                if (! is_string($content) || trim($content) === '') {
                    throw new RuntimeException('OpenRouter returned empty content.');
                }

                return trim($content);
            }

            $messages[] = $message;

            foreach ($toolCalls as $toolCall) {
                if (! is_array($toolCall)) {
                    continue;
                }
                $id = (string) ($toolCall['id'] ?? '');
                $function = is_array($toolCall['function'] ?? null) ? $toolCall['function'] : [];
                $name = (string) ($function['name'] ?? '');
                $argsJson = (string) ($function['arguments'] ?? '{}');
                $args = json_decode($argsJson, true);
                if (! is_array($args)) {
                    $args = [];
                }

                try {
                    $result = $executeTool($name, $args);
                } catch (\Throwable $e) {
                    Log::warning('assistant.tool_failed', ['tool' => $name, 'error' => $e->getMessage()]);
                    $result = json_encode(['error' => 'tool_failed'], JSON_UNESCAPED_UNICODE);
                }

                $messages[] = [
                    'role' => 'tool',
                    'tool_call_id' => $id,
                    'content' => $result,
                ];
            }
        }

        throw new RuntimeException('OpenRouter tool loop exceeded.');
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  callable(string): void  $onDelta
     * @return array{message: array<string, mixed>, usage: array<string, mixed>|null}
     */
    private function postStream(string $url, string $token, array $payload, callable $onDelta): array
    {
        try {
            $response = $this->http($token)
                ->withOptions(['stream' => true])
                ->post($url, $payload);
        } catch (ConnectionException $e) {
            throw new RuntimeException('OpenRouter stream failed.', 0, $e);
        }

        if (! $response->successful()) {
            Log::warning('openrouter.chat_stream_failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new RuntimeException('OpenRouter request failed.');
        }

        $psr = $response->toPsrResponse();
        if (! $psr instanceof ResponseInterface) {
            throw new RuntimeException('OpenRouter stream body unavailable.');
        }

        return $this->parseSseStream($psr, $onDelta);
    }

    /**
     * @param  callable(string): void  $onDelta
     * @return array{message: array<string, mixed>, usage: array<string, mixed>|null}
     */
    private function parseSseStream(ResponseInterface $response, callable $onDelta): array
    {
        $body = $response->getBody();
        $content = '';
        $toolCalls = [];
        $usage = null;
        $buffer = '';

        while (! $body->eof()) {
            $buffer .= $body->read(1024);
            while (($pos = strpos($buffer, "\n")) !== false) {
                $line = rtrim(substr($buffer, 0, $pos), "\r");
                $buffer = substr($buffer, $pos + 1);
                if ($line === '' || ! str_starts_with($line, 'data: ')) {
                    continue;
                }
                $data = trim(substr($line, 6));
                if ($data === '[DONE]') {
                    break 2;
                }
                $json = json_decode($data, true);
                if (! is_array($json)) {
                    continue;
                }
                if (isset($json['usage']) && is_array($json['usage'])) {
                    $usage = $json['usage'];
                }
                $delta = $json['choices'][0]['delta'] ?? null;
                if (! is_array($delta)) {
                    continue;
                }
                if (isset($delta['content']) && is_string($delta['content']) && $delta['content'] !== '') {
                    $content .= $delta['content'];
                    $onDelta($delta['content']);
                }
                if (isset($delta['tool_calls']) && is_array($delta['tool_calls'])) {
                    foreach ($delta['tool_calls'] as $index => $callDelta) {
                        if (! is_array($callDelta)) {
                            continue;
                        }
                        $idx = (int) ($callDelta['index'] ?? $index);
                        if (! isset($toolCalls[$idx])) {
                            $toolCalls[$idx] = [
                                'id' => '',
                                'type' => 'function',
                                'function' => ['name' => '', 'arguments' => ''],
                            ];
                        }
                        if (isset($callDelta['id'])) {
                            $toolCalls[$idx]['id'] = (string) $callDelta['id'];
                        }
                        $fn = $callDelta['function'] ?? null;
                        if (is_array($fn)) {
                            if (isset($fn['name'])) {
                                $toolCalls[$idx]['function']['name'] .= (string) $fn['name'];
                            }
                            if (isset($fn['arguments'])) {
                                $toolCalls[$idx]['function']['arguments'] .= (string) $fn['arguments'];
                            }
                        }
                    }
                }
            }
        }

        ksort($toolCalls);
        $message = [
            'role' => 'assistant',
            'content' => $content !== '' ? $content : null,
        ];
        if ($toolCalls !== []) {
            $message['tool_calls'] = array_values($toolCalls);
        }

        return ['message' => $message, 'usage' => $usage];
    }

    private function http(string $token): PendingRequest
    {
        $http = Http::withToken($token)
            ->timeout(120)
            ->acceptJson()
            ->withHeaders([
                'HTTP-Referer' => url('/'),
                'X-Title' => config('app.name'),
            ]);

        if (filled(config('services.openrouter.proxy'))) {
            $http = $http->withOptions(['proxy' => (string) config('services.openrouter.proxy')]);
        }

        return $http;
    }
}
