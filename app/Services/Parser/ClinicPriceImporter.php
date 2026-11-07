<?php

namespace App\Services\Parser;

use App\Models\Clinic;
use App\Models\ClinicService;
use App\Models\Service;

/**
 * Переносит прайс из Яндекс Карт в услуги клиники. Услуги, которые клиника уже завела или поправила сама,
 * не трогает — добавляет только недостающие.
 */
class ClinicPriceImporter
{
    public function __construct(private readonly YandexPriceListMapper $mapper) {}

    /**
     * @param  array<string, mixed>  $raw  карточка парсера
     * @return int сколько услуг добавлено
     */
    public function import(Clinic $clinic, array $raw): int
    {
        $products = (array) (ParsedOrganizationNormalizer::card($raw)['products'] ?? []);
        $mapped = $this->mapper->map(array_values($products))['services'];
        if ($mapped === []) {
            return 0;
        }

        $serviceIds = Service::query()->whereIn('slug', array_keys($mapped))->pluck('id', 'slug');
        $existing = $clinic->clinicServices()->pluck('service_id')->flip();
        $added = 0;

        foreach ($mapped as $slug => $entry) {
            $serviceId = $serviceIds[$slug] ?? null;
            if ($serviceId === null || isset($existing[$serviceId])) {
                continue;
            }
            ClinicService::query()->create([
                'clinic_id' => $clinic->id,
                'service_id' => $serviceId,
                'price_from' => $entry['price_from'],
                'price_to' => $entry['price_to'],
                'is_promo' => false,
            ]);
            $added++;
        }

        return $added;
    }
}
