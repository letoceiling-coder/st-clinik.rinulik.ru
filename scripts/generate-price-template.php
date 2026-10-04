<?php

use App\Models\Service;
use App\Services\Cabinet\PriceListExcel;
use App\Services\Cabinet\PriceListExcelValidations;
use Illuminate\Contracts\Console\Kernel;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Reader\XLSX\Reader;
use OpenSpout\Writer\XLSX\Writer;

require __DIR__.'/../vendor/autoload.php';

$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$dir = __DIR__.'/../public/downloads';
if (! is_dir($dir)) {
    mkdir($dir, 0755, true);
}

$path = $dir.'/price-list-template.xlsx';
$services = Service::query()
    ->where('is_active', true)
    ->with('specialty:id,name,slug')
    ->orderBy('specialty_id')
    ->orderBy('name')
    ->get();

$writer = new Writer;
$writer->openToFile($path);
$writer->getCurrentSheet()->setName(PriceListExcel::SHEET_PRICES);
$writer->addRow(Row::fromValues(PriceListExcel::HEADERS));

foreach ($services->take(3) as $service) {
    $writer->addRow(Row::fromValues([
        $service->specialty?->name ?? '',
        $service->name,
        $service->slug,
        $service->price_hint_from ?? '',
        '',
        'нет',
        '',
    ]));
}

$writer->addNewSheetAndMakeItCurrent()->setName(PriceListExcel::SHEET_CATALOG);
$writer->addRow(Row::fromValues(PriceListExcel::CATALOG_HEADERS));

foreach ($services as $service) {
    $writer->addRow(Row::fromValues([
        $service->specialty?->name ?? '',
        $service->name,
        $service->slug,
    ]));
}

$writer->close();

app(PriceListExcelValidations::class)->apply($path, $services->count());

$reader = new Reader;
$reader->open($path);
$sheetNames = [];
foreach ($reader->getSheetIterator() as $sheet) {
    $sheetNames[] = $sheet->getName();
}
$reader->close();

echo "Written {$path}\n";
echo 'Services in catalog: '.$services->count()."\n";
echo 'Sheets: '.implode(', ', $sheetNames)."\n";
