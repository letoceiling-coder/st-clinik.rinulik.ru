<?php

namespace App\Console\Commands;

use App\Models\City;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\Specialty;
use App\Services\Parser\ParserOrganizationMapper;
use App\Services\Parser\ParserOrganizationPhotoImporter;
use App\Services\Parser\ParserOrganizationsAuditor;
use App\Services\Parser\ParserOrganizationsClient;
use App\Services\ProfileMetrics;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class SyncParserOrganizations extends Command
{
    protected $signature = 'parser:sync-organizations
        {--fetch : Загрузить организации из parser.rinulik.ru}
        {--file= : Путь к JSON (массив items), по умолчанию storage/app/parser-orgs-raw.json}
        {--import : Записать в БД}
        {--photos : Скачать фото с Яндекс CDN в public storage (нужен --import)}
        {--publish : Опубликовать клиники (status=published)}
        {--dry-run : Только аудит и mapped JSON, без записи в БД}';

    protected $description = 'Аудит и импорт организаций parser.rinulik.ru в Organization + Clinic';

    public function handle(
        ParserOrganizationMapper $mapper,
        ParserOrganizationsAuditor $auditor,
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
        if (($report['mapping']['unknown_city'] ?? 0) > 0) {
            $this->warn("Не сопоставлен город: {$report['mapping']['unknown_city']} (добавьте города в справочник).");
        }
        $this->line("Mapped: {$mappedPath}");
        $this->line("Audit: {$auditPath}");

        if ($this->option('dry-run') || ! $this->option('import')) {
            $this->comment('Импорт пропущен (укажите --import для записи в БД).');

            return self::SUCCESS;
        }

        [$imported, $photos] = $this->import(
            $mapped,
            withPhotos: (bool) $this->option('photos'),
            publish: (bool) $this->option('publish'),
        );
        $this->info("Импортировано/обновлено клиник: {$imported}");
        if ($this->option('photos')) {
            $this->info("Загружено фото: {$photos}");
        }

        return self::SUCCESS;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function loadItems(): array
    {
        if ($this->option('fetch')) {
            return ParserOrganizationsClient::fromConfig()->fetchAllOrganizations();
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

    /**
     * @param  list<array<string, mixed>>  $mapped
     * @return array{0: int, 1: int}
     */
    private function import(array $mapped, bool $withPhotos, bool $publish): array
    {
        $cities = City::query()->pluck('id', 'slug');
        $specialties = Specialty::query()->pluck('id', 'slug');
        $photoImporter = app(ParserOrganizationPhotoImporter::class);
        $metrics = app(ProfileMetrics::class);
        $count = 0;
        $photoCount = 0;

        $bar = $this->output->createProgressBar(count($mapped));
        $bar->start();

        foreach ($mapped as $row) {
            $citySlug = $row['clinic']['city_slug'] ?? null;
            if ($citySlug === null || ! $cities->has($citySlug)) {
                $bar->advance();

                continue;
            }

            $yandexId = (string) ($row['yandex_org_id'] ?? '');
            if ($yandexId === '') {
                $bar->advance();

                continue;
            }

            DB::transaction(function () use (
                $row,
                $cities,
                $specialties,
                $citySlug,
                $yandexId,
                $publish,
                $withPhotos,
                $photoImporter,
                $metrics,
                &$count,
                &$photoCount,
            ): void {
                $existing = Clinic::query()->where('yandex_org_id', $yandexId)->first();
                $orgData = $row['organization'];
                $clinicData = $row['clinic'];
                unset($clinicData['city_slug'], $clinicData['city_name']);

                if ($publish) {
                    $clinicData['status'] = 'published';
                }

                if ($existing) {
                    $existing->organization->update([
                        'name' => $orgData['name'],
                        'legal_name' => $orgData['legal_name'],
                        'inn' => $orgData['inn'],
                    ]);
                    $existing->update(array_merge($clinicData, ['city_id' => $cities[$citySlug]]));
                    $clinic = $existing->fresh();
                } else {
                    $org = Organization::create([
                        'owner_id' => null,
                        'name' => $orgData['name'],
                        'legal_name' => $orgData['legal_name'],
                        'inn' => $orgData['inn'],
                        'status' => $orgData['status'],
                    ]);
                    $clinic = Clinic::create(array_merge($clinicData, [
                        'organization_id' => $org->id,
                        'city_id' => $cities[$citySlug],
                    ]));
                }

                $specIds = collect($row['specialty_slugs'] ?? [])
                    ->filter(fn ($slug) => $specialties->has($slug))
                    ->map(fn ($slug) => $specialties[$slug])
                    ->all();
                if ($specIds !== []) {
                    $clinic->specialties()->syncWithoutDetaching($specIds);
                }

                if ($withPhotos && is_array($row['photos'] ?? null) && $row['photos'] !== []) {
                    $photoCount += $photoImporter->import($clinic, $row['photos'], replaceExisting: true);
                }

                $metrics->recalcClinic($clinic);
                $count++;
            });

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();

        return [$count, $photoCount];
    }
}
