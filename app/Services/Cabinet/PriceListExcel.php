<?php

namespace App\Services\Cabinet;

use App\Models\Clinic;
use App\Models\ClinicService;
use App\Models\Service;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Reader\SheetInterface;
use OpenSpout\Reader\XLSX\Reader;
use OpenSpout\Writer\XLSX\Writer;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PriceListExcel
{
    public const SHEET_PRICES = 'Прайс';

    public const SHEET_CATALOG = 'Справочник услуг';

    /** @var list<string> */
    public const HEADERS = [
        'Специализация',
        'Услуга',
        'Код услуги',
        'Цена от, ₽',
        'Цена до, ₽',
        'Акция',
        'Пометка',
    ];

    /** @var list<string> */
    public const CATALOG_HEADERS = [
        'Специализация',
        'Услуга',
        'Код услуги',
    ];

    public function templateResponse(Clinic $clinic): StreamedResponse
    {
        return $this->stream('price-list-template.xlsx', function (Writer $writer) use ($clinic): void {
            $services = $this->catalogServices();

            $this->writeWorkbook($writer, function (Writer $priceWriter) use ($clinic, $services): void {
                $priceWriter->addRow(Row::fromValues(self::HEADERS));

                $prices = ClinicService::query()
                    ->where('clinic_id', $clinic->id)
                    ->with('service.specialty:id,name,slug')
                    ->get()
                    ->sortBy(fn (ClinicService $p) => ($p->service->specialty?->name ?? '').$p->service->name)
                    ->values();

                if ($prices->isNotEmpty()) {
                    foreach ($prices as $price) {
                        $priceWriter->addRow(Row::fromValues($this->priceRowValues($price)));
                    }

                    return;
                }

                foreach ($services->take(3) as $service) {
                    $priceWriter->addRow(Row::fromValues([
                        $service->specialty?->name ?? '',
                        $service->name,
                        $service->slug,
                        $service->price_hint_from ?? '',
                        '',
                        'нет',
                        '',
                    ]));
                }
            }, $services);
        });
    }

    public function exportResponse(Clinic $clinic): StreamedResponse
    {
        $filename = 'price-list-'.$clinic->slug.'-'.now()->format('Y-m-d').'.xlsx';

        return $this->stream($filename, function (Writer $writer) use ($clinic): void {
            $services = $this->catalogServices();

            $this->writeWorkbook($writer, function (Writer $priceWriter) use ($clinic): void {
                $priceWriter->addRow(Row::fromValues(self::HEADERS));

                $prices = ClinicService::query()
                    ->where('clinic_id', $clinic->id)
                    ->with('service.specialty:id,name,slug')
                    ->get()
                    ->sortBy(fn (ClinicService $p) => ($p->service->specialty?->name ?? '').$p->service->name)
                    ->values();

                foreach ($prices as $price) {
                    $priceWriter->addRow(Row::fromValues($this->priceRowValues($price)));
                }
            }, $services);
        });
    }

    /**
     * @return array{created: int, updated: int, skipped: int, errors: list<array{row: int, message: string}>}
     */
    public function import(Clinic $clinic, UploadedFile $file): array
    {
        $services = $this->catalogServices();
        $existing = ClinicService::query()
            ->where('clinic_id', $clinic->id)
            ->get()
            ->keyBy('service_id');

        $report = ['created' => 0, 'updated' => 0, 'skipped' => 0, 'errors' => []];
        $path = $file->getRealPath();
        abort_unless(is_string($path) && $path !== '', 422, 'Не удалось прочитать файл.');

        $reader = new Reader;
        $reader->open($path);

        try {
            $sheet = $this->resolveImportSheet($reader);
            if ($sheet === null) {
                $report['errors'][] = [
                    'row' => 0,
                    'message' => 'Не найден лист «Прайс» для импорта. Используйте файл по образцу.',
                ];

                return $report;
            }

            $headerRowIndex = $this->findHeaderRowIndex($sheet) ?? 1;

            foreach ($sheet->getRowIterator() as $rowIndex => $row) {
                if ($rowIndex <= $headerRowIndex) {
                    continue;
                }

                $cells = $this->cells($row);
                if ($this->isEmptyRow($cells)) {
                    continue;
                }

                $parsed = $this->parseRow($cells);
                if (isset($parsed['error'])) {
                    $report['errors'][] = ['row' => $rowIndex, 'message' => $parsed['error']];
                    $report['skipped']++;

                    continue;
                }

                $service = $this->resolveService($services, $parsed['data']);
                if (! $service) {
                    $report['errors'][] = [
                        'row' => $rowIndex,
                        'message' => $this->serviceNotFoundMessage($parsed['data'], $services),
                    ];
                    $report['skipped']++;

                    continue;
                }

                $mismatch = $this->serviceMismatchMessage($service, $parsed['data']);
                if ($mismatch !== null) {
                    $report['errors'][] = ['row' => $rowIndex, 'message' => $mismatch];
                    $report['skipped']++;

                    continue;
                }

                $payload = [
                    'price_from' => $parsed['data']['price_from'],
                    'price_to' => $parsed['data']['price_to'],
                    'is_promo' => $parsed['data']['is_promo'],
                    'note' => $parsed['data']['note'],
                ];

                if ($existing->has($service->id)) {
                    $existing->get($service->id)->update($payload);
                    $report['updated']++;
                } else {
                    ClinicService::create([
                        'clinic_id' => $clinic->id,
                        'service_id' => $service->id,
                        ...$payload,
                    ]);
                    $report['created']++;
                }
            }
        } finally {
            $reader->close();
        }

        return $report;
    }

    /** @return Collection<int, Service> */
    private function catalogServices(): Collection
    {
        return Service::query()
            ->where('is_active', true)
            ->with('specialty:id,name,slug')
            ->orderBy('specialty_id')
            ->orderBy('name')
            ->get();
    }

    /** @param  callable(Writer): void  $writePriceSheet */
    private function writeWorkbook(Writer $writer, callable $writePriceSheet, Collection $services): void
    {
        $writer->getCurrentSheet()->setName(self::SHEET_PRICES);
        $writePriceSheet($writer);

        $writer->addNewSheetAndMakeItCurrent()->setName(self::SHEET_CATALOG);
        $this->writeCatalogSheet($writer, $services);
    }

    /** @param  Collection<int, Service>  $services */
    private function writeCatalogSheet(Writer $writer, Collection $services): void
    {
        $writer->addRow(Row::fromValues(self::CATALOG_HEADERS));

        foreach ($services as $service) {
            $writer->addRow(Row::fromValues([
                $service->specialty?->name ?? '',
                $service->name,
                $service->slug,
            ]));
        }
    }

    /** @return list<int|string> */
    private function priceRowValues(ClinicService $price): array
    {
        return [
            $price->service->specialty?->name ?? '',
            $price->service->name,
            $price->service->slug,
            $price->price_from,
            $price->price_to ?? '',
            $price->is_promo ? 'да' : 'нет',
            $price->note ?? '',
        ];
    }

    private function resolveImportSheet(Reader $reader): ?SheetInterface
    {
        $sheets = iterator_to_array($reader->getSheetIterator(), false);
        if ($sheets === []) {
            return null;
        }

        foreach ($sheets as $sheet) {
            if ($this->isPriceSheet($sheet->getName())) {
                return $sheet;
            }
        }

        foreach ($sheets as $sheet) {
            if (! $this->isReferenceSheet($sheet->getName())) {
                return $sheet;
            }
        }

        return $sheets[0];
    }

    private function isPriceSheet(string $name): bool
    {
        return mb_strtolower(trim($name)) === mb_strtolower(self::SHEET_PRICES);
    }

    private function isReferenceSheet(string $name): bool
    {
        return str_starts_with(mb_strtolower(trim($name)), 'справочник');
    }

    private function findHeaderRowIndex(SheetInterface $sheet): ?int
    {
        foreach ($sheet->getRowIterator() as $rowIndex => $row) {
            if ($rowIndex > 20) {
                break;
            }

            foreach ($row->getCells() as $cell) {
                if ($this->normalizeHeader((string) $cell->getValue()) === 'код услуги') {
                    return $rowIndex;
                }
            }
        }

        return null;
    }

    private function normalizeHeader(string $value): string
    {
        return mb_strtolower(trim($value));
    }

    /** @param array{specialty: string, name: string, slug: string, price_from: int, price_to: ?int, is_promo: bool, note: ?string} $data */
    private function serviceNotFoundMessage(array $data, Collection $services): string
    {
        if ($data['slug'] !== '') {
            return sprintf(
                'Код услуги «%s» не найден в справочнике. Откройте лист «%s» и скопируйте код из таблицы.',
                $data['slug'],
                self::SHEET_CATALOG,
            );
        }

        if ($data['name'] !== '') {
            $hint = $services->first(fn (Service $s) => mb_stripos($s->name, $data['name']) !== false);

            if ($hint) {
                return sprintf(
                    'Услуга «%s» не найдена однозначно. Укажите код «%s» из листа «%s».',
                    $data['name'],
                    $hint->slug,
                    self::SHEET_CATALOG,
                );
            }
        }

        return sprintf(
            'Услуга не найдена в справочнике. Укажите «Код услуги» из листа «%s».',
            self::SHEET_CATALOG,
        );
    }

    /** @param array{specialty: string, name: string, slug: string, price_from: int, price_to: ?int, is_promo: bool, note: ?string} $data */
    private function serviceMismatchMessage(Service $service, array $data): ?string
    {
        if ($data['slug'] === '') {
            return null;
        }

        if ($data['name'] !== '' && mb_strtolower(trim($data['name'])) !== mb_strtolower(trim($service->name))) {
            return sprintf(
                'Название «%s» не совпадает с кодом «%s» (ожидается «%s»).',
                $data['name'],
                $data['slug'],
                $service->name,
            );
        }

        if ($data['specialty'] !== '' && mb_strtolower(trim($data['specialty'])) !== mb_strtolower(trim((string) $service->specialty?->name))) {
            return sprintf(
                'Специализация «%s» не совпадает с кодом «%s» (ожидается «%s»).',
                $data['specialty'],
                $data['slug'],
                $service->specialty?->name ?? '—',
            );
        }

        return null;
    }

    /** @param callable(Writer): void $writer */
    private function stream(string $filename, callable $writer): StreamedResponse
    {
        return response()->streamDownload(function () use ($writer): void {
            $excel = new Writer;
            $excel->openToFile('php://output');
            $writer($excel);
            $excel->close();
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }

    /** @return list<string|null> */
    private function cells(Row $row): array
    {
        $values = [];
        foreach ($row->getCells() as $cell) {
            $values[] = trim((string) $cell->getValue());
        }

        while (count($values) < count(self::HEADERS)) {
            $values[] = '';
        }

        return array_slice($values, 0, count(self::HEADERS));
    }

    /** @param list<string|null> $cells */
    private function isEmptyRow(array $cells): bool
    {
        foreach ($cells as $value) {
            if ($value !== null && $value !== '') {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  list<string|null>  $cells
     * @return array{data?: array{specialty: string, name: string, slug: string, price_from: int, price_to: ?int, is_promo: bool, note: ?string}, error?: string}
     */
    private function parseRow(array $cells): array
    {
        [$specialty, $name, $slug, $priceFromRaw, $priceToRaw, $promoRaw, $note] = $cells;

        if ($slug === '' && $name === '') {
            return ['error' => 'Укажите услугу или код услуги из листа «'.self::SHEET_CATALOG.'».'];
        }

        $priceFrom = $this->parsePrice($priceFromRaw, allowZero: true);
        if ($priceFrom === null) {
            return ['error' => 'Некорректная «Цена от». Укажите число от 0 до 3 000 000.'];
        }
        if ($priceFrom > 0 && $priceFrom < 100) {
            return ['error' => '«Цена от» должна быть не менее 100 ₽ или 0 (бесплатно).'];
        }
        if ($priceFrom > 3_000_000) {
            return ['error' => '«Цена от» не может превышать 3 000 000 ₽.'];
        }

        $priceTo = null;
        if ($priceToRaw !== '') {
            $priceTo = $this->parsePrice($priceToRaw);
            if ($priceTo === null) {
                return ['error' => 'Некорректная «Цена до». Укажите число или оставьте пустым.'];
            }
            if ($priceTo <= $priceFrom) {
                return ['error' => '«Цена до» должна быть больше «Цены от».'];
            }
            if ($priceTo > 3_000_000) {
                return ['error' => '«Цена до» не может превышать 3 000 000 ₽.'];
            }
        }

        $note = $note !== '' ? $note : null;
        if ($note !== null && mb_strlen($note) > 120) {
            return ['error' => '«Пометка» — не более 120 символов.'];
        }

        return [
            'data' => [
                'specialty' => mb_strtolower($specialty),
                'name' => trim($name),
                'slug' => mb_strtolower($slug),
                'price_from' => $priceFrom,
                'price_to' => $priceTo,
                'is_promo' => $this->parsePromo($promoRaw),
                'note' => $note,
            ],
        ];
    }

    private function parsePrice(?string $raw, bool $allowZero = false): ?int
    {
        if ($raw === null || $raw === '') {
            return null;
        }

        $normalized = preg_replace('/[^\d]/u', '', $raw);
        if ($normalized === null || $normalized === '') {
            return null;
        }

        $value = (int) $normalized;
        if ($value === 0 && ! $allowZero) {
            return null;
        }

        return $value;
    }

    private function parsePromo(?string $raw): bool
    {
        $value = mb_strtolower(trim((string) $raw));

        return in_array($value, ['да', 'yes', '1', '+', 'true', 'акция', 'y'], true);
    }

    /** @param array{specialty: string, name: string, slug: string, price_from: int, price_to: ?int, is_promo: bool, note: ?string} $data */
    private function resolveService(Collection $services, array $data): ?Service
    {
        if ($data['slug'] !== '') {
            $match = $services->first(fn (Service $s) => mb_strtolower($s->slug) === $data['slug']);
            if ($match) {
                return $match;
            }
        }

        $name = mb_strtolower(trim($data['name']));
        if ($name === '') {
            return null;
        }

        $candidates = $services->filter(fn (Service $s) => mb_strtolower($s->name) === $name);
        if ($candidates->isEmpty()) {
            $candidates = $services->filter(fn (Service $s) => mb_strtolower(trim($s->name)) === $name);
        }

        if ($candidates->isEmpty()) {
            return null;
        }

        if ($data['specialty'] !== '') {
            $scoped = $candidates->filter(
                fn (Service $s) => mb_strtolower((string) $s->specialty?->name) === $data['specialty']
            );
            if ($scoped->count() === 1) {
                return $scoped->first();
            }
        }

        return $candidates->count() === 1 ? $candidates->first() : null;
    }
}
