<?php

namespace App\Console\Commands;

use App\Models\AuditLog;
use App\Models\SiteSetting;
use App\Services\Parser\ParsedOrganizationStore;
use App\Services\Parser\ParserOrganizationsClient;
use Illuminate\Console\Command;

class SyncParserIncremental extends Command
{
    private const SETTING_KEY = 'parser.incremental_synced_at';

    protected $signature = 'parser:sync-incremental {--since= : ISO 8601, по умолчанию — время прошлой синхронизации}';

    protected $description = 'Обновляет уже загруженные карточки промежуточной таблицы по изменениям в базе парсера';

    public function handle(ParsedOrganizationStore $store): int
    {
        $client = ParserOrganizationsClient::fromConfig();
        if (! $client->configured()) {
            $this->warn('Парсер не настроен — синхронизация пропущена.');

            return self::SUCCESS;
        }

        $startedAt = now();
        $since = $this->option('since')
            ?: SiteSetting::query()->where('key', self::SETTING_KEY)->value('value')
            ?: now()->subDay()->toIso8601ZuluString();

        $items = $client->fetchAllOrganizations(['updatedSince' => $since]);
        $stats = $store->upsert($items, onlyExisting: true);

        SiteSetting::query()->updateOrCreate(['key' => self::SETTING_KEY], ['value' => $startedAt->toIso8601ZuluString()]);
        AuditLog::create(['action' => 'parser.synced', 'meta' => ['filters' => ['updatedSince' => $since], ...$stats]]);

        $this->info("Получено {$stats['found']}, обновлено {$stats['updated']}, пропущено новых {$stats['skipped']}.");

        return self::SUCCESS;
    }
}
