<?php

namespace App\Jobs;

use App\Models\ParserTask;
use App\Services\Parser\ParsedOrganizationStore;
use App\Services\Parser\ParserOrganizationsClient;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

/** Загружает уже собранные карточки из базы парсера в промежуточную таблицу (без запуска новых задач). */
class SyncParserOrganizationsJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 900;

    public function __construct(public int $taskId)
    {
        $this->afterCommit();
    }

    public function handle(ParsedOrganizationStore $store): void
    {
        $task = ParserTask::query()->find($this->taskId);
        if ($task === null || $task->isFinal()) {
            return;
        }

        $task->update(['status' => 'running', 'started_at' => now(), 'progress' => 10]);
        $filters = array_filter([
            'city' => $task->input['city'] ?? null,
            'category' => ParserTask::BASE_CATEGORY,
        ]);

        $items = ParserOrganizationsClient::fromConfig()->fetchAllOrganizations($filters);
        $task->update(['progress' => 60]);
        $stats = $store->upsert($items, $task, $filters['city'] ?? null);

        $task->update([
            'status' => 'completed',
            'progress' => 100,
            'found_count' => $stats['found'],
            'new_count' => $stats['created'],
            'completed_at' => now(),
        ]);
    }

    public function failed(?Throwable $e): void
    {
        ParserTask::query()->whereKey($this->taskId)->update([
            'status' => 'failed',
            'error' => mb_substr('Не удалось загрузить: '.($e?->getMessage() ?? 'ошибка'), 0, 1000),
            'completed_at' => now(),
        ]);
    }
}
