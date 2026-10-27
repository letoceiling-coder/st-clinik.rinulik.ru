<?php

namespace App\Console\Commands;

use App\Services\Parser\ParsedOrganizationStore;
use App\Services\Parser\ParserOrganizationMapper;
use App\Services\Parser\ParserOrganizationsAuditor;
use App\Services\Parser\ParserOrganizationsClient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class SyncParserOrganizations extends Command
{
    protected $signature = 'parser:sync-organizations
        {--fetch : Загрузить организации из базы парсера}
        {--city= : Только указанный город (с --fetch)}
        {--file= : Путь к JSON (массив items), по умолчанию storage/app/parser-orgs-raw.json}
        {--import : Записать в промежуточную таблицу «Парсер → Организации»}
        {--hide-demo : Скрыть демо-клиники в городах импорта}
        {--dry-run : Только аудит и mapped JSON, без записи в БД}';

    protected $description = 'Аудит карточек парсера и загрузка в промежуточную таблицу. Клиники на сайте создаются только из админки, как черновики.';

    public function handle(
        ParserOrganizationMapper $mapper,
        ParserOrganizationsAuditor $auditor,
        ParsedOrganizationStore $store,
    ): int {
        $items = $this->loadItems();
        if ($items === []) {
            $this->error('Нет данных для обработки.');

            return self::FAILURE;
        }

        $mapped = array_map(fn (array $item) => $mapper->map($item), $items);
        $report = $auditor->audit($items, $mapped);

        $mappedPath = storage_path('app/parser-orgs-mapped.json');
        $auditPath = storage_path('app/parser-orgs-audit.json');
        File::put($mappedPath, json_encode($mapped, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
        File::put($auditPath, json_encode($report, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

        $this->info("Организаций: {$report['total']}");
        $this->table(['Город', 'Кол-во'], collect($report['cities'])->map(fn ($c, $city) => [$city, $c])->all());
        $q = $report['quality'];
        $this->line("Телефон: {$q['with_phone']}, сайт: {$q['with_website']}, без сайта: {$q['without_website']}, ИНН: {$q['with_inn']}");
        $this->line("Фото: {$q['with_photos']}, отзывы в карточке: {$q['with_reviews']}, услуги: {$q['with_services']}");
        $this->line("Рейтинг {$q['rating_min']}–{$q['rating_max']}, отзывов суммарно: {$q['reviews_total']}");
        $this->line("Mapped: {$mappedPath}");
        $this->line("Audit: {$auditPath}");

        if ($this->option('dry-run') || ! $this->option('import')) {
            $this->comment('Запись пропущена (укажите --import для загрузки в промежуточную таблицу).');

            return self::SUCCESS;
        }

        $stats = $store->upsert($items);
        $this->info("Промежуточная таблица: новых {$stats['created']}, обновлено {$stats['updated']}, пропущено {$stats['skipped']}.");
        $this->comment('Проверка и импорт в черновики — в админке: «Парсер → Организации».');

        if ($this->option('hide-demo')) {
            $this->call('parser:hide-demo-clinics');
        }

        return self::SUCCESS;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function loadItems(): array
    {
        if ($this->option('fetch')) {
            return ParserOrganizationsClient::fromConfig()->fetchAllOrganizations(array_filter(['city' => $this->option('city')]));
        }

        $path = $this->option('file') ?: storage_path('app/parser-orgs-raw.json');
        if (! is_file($path)) {
            $this->error("Файл не найден: {$path}");

            return [];
        }

        $decoded = json_decode((string) file_get_contents($path), true);
        if (! is_array($decoded)) {
            return [];
        }
        if (array_is_list($decoded)) {
            return $decoded;
        }

        return is_array($decoded['items'] ?? null) ? $decoded['items'] : [];
    }
}
