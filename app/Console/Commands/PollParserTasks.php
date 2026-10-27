<?php

namespace App\Console\Commands;

use App\Models\ParserTask;
use App\Services\Parser\ParserTaskService;
use Illuminate\Console\Command;
use Throwable;

class PollParserTasks extends Command
{
    protected $signature = 'parser:poll-tasks';

    protected $description = 'Обновляет статус активных задач парсера и забирает результаты завершённых';

    public function handle(ParserTaskService $service): int
    {
        $tasks = ParserTask::query()->active()->whereNotNull('external_id')->orderBy('id')->limit(50)->get();

        foreach ($tasks as $task) {
            try {
                $task = $service->poll($task);
                $this->line("#{$task->id} {$task->type}: {$task->status} {$task->progress}%");
            } catch (Throwable $e) {
                $this->warn("#{$task->id}: ".$e->getMessage());
            }
        }

        return self::SUCCESS;
    }
}
