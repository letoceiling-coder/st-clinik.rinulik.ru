<?php

namespace App\Console\Commands;

use App\Services\Max\MaxWebhookSync;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('max:sync-webhook {--force : Переустановить, даже если токен, домен и секрет не менялись}')]
#[Description('Сверяет webhook бота MAX с текущим доменом и токеном и при расхождении переустанавливает его')]
class SyncMaxWebhook extends Command
{
    public function handle(MaxWebhookSync $sync): int
    {
        if (! filled(config('services.max_bot.token'))) {
            $this->line('Токен бота MAX не задан — пропускаю.');

            return self::SUCCESS;
        }

        $result = $sync->sync(force: (bool) $this->option('force'));
        $result['ok'] ? $this->info($result['message']) : $this->error($result['message']);

        return $result['ok'] ? self::SUCCESS : self::FAILURE;
    }
}
