<?php

namespace App\Console\Commands;

use App\Models\ParsedOrganization;
use App\Services\Parser\ParsedOrganizationStore;
use Illuminate\Console\Command;

class RenormalizeParsedOrganizations extends Command
{
    protected $signature = 'parser:renormalize';

    protected $description = 'Заново разобрать адрес и город сохранённых карточек парсера (без повторного парсинга и без смены даты обновления)';

    public function handle(ParsedOrganizationStore $store): int
    {
        $changed = 0;
        ParsedOrganization::query()->orderBy('id')->chunkById(200, function ($records) use ($store, &$changed): void {
            foreach ($records as $record) {
                if ($store->renormalize($record)) {
                    $changed++;
                }
            }
            $store->detectDuplicates($records);
        });

        $this->info("Обновлено карточек: {$changed}.");

        return self::SUCCESS;
    }
}
