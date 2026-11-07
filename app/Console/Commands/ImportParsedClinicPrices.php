<?php

namespace App\Console\Commands;

use App\Models\ParsedOrganization;
use App\Services\Parser\ClinicPriceImporter;
use App\Services\ProfileMetrics;
use Illuminate\Console\Command;

class ImportParsedClinicPrices extends Command
{
    protected $signature = 'parser:import-prices';

    protected $description = 'Добавить клиникам, импортированным из парсера, недостающие услуги с ценами из прайса Яндекс Карт';

    public function handle(ClinicPriceImporter $prices, ProfileMetrics $metrics): int
    {
        $clinics = 0;
        $services = 0;
        ParsedOrganization::query()->whereNotNull('clinic_id')->with('clinic')->orderBy('id')
            ->each(function (ParsedOrganization $parsed) use ($prices, $metrics, &$clinics, &$services): void {
                if ($parsed->clinic === null) {
                    return;
                }
                $added = $prices->import($parsed->clinic, $parsed->raw ?? []);
                if ($added > 0) {
                    $metrics->recalcClinic($parsed->clinic);
                    $clinics++;
                    $services += $added;
                }
            });

        $this->info("Клиник с новыми ценами: {$clinics}, добавлено услуг: {$services}.");

        return self::SUCCESS;
    }
}
