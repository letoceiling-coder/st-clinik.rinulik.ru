<?php

namespace App\Services\Parser;

class ParserOrganizationsAuditor
{
    /**
     * @param  list<array<string, mixed>>  $items
     * @param  list<array<string, mixed>>  $mapped
     * @return array<string, mixed>
     */
    public function audit(array $items, array $mapped): array
    {
        $warnings = [];
        foreach ($mapped as $row) {
            foreach ($row['warnings'] ?? [] as $w) {
                $warnings[] = ['yandex_org_id' => $row['yandex_org_id'] ?? null, 'message' => $w];
            }
        }

        $cityCounts = collect($items)->countBy(fn ($i) => (string) ($i['city'] ?? '—'));
        $noWebsite = collect($items)->filter(fn ($i) => empty($i['website']))->count();
        $noInn = collect($items)->filter(fn ($i) => empty($i['card']['inn'] ?? null))->count();
        $unknownCities = collect($mapped)->filter(fn ($m) => ($m['clinic']['city_slug'] ?? null) === null)->count();

        return [
            'total' => count($items),
            'cities' => $cityCounts->sortDesc()->all(),
            'quality' => [
                'with_phone' => count($items) - collect($items)->filter(fn ($i) => empty($i['phones']))->count(),
                'with_website' => count($items) - $noWebsite,
                'without_website' => $noWebsite,
                'with_inn' => count($items) - $noInn,
                'with_photos' => collect($items)->filter(fn ($i) => ! empty($i['card']['photos']))->count(),
                'with_reviews' => collect($items)->filter(fn ($i) => ! empty($i['card']['reviews']))->count(),
                'with_services' => collect($items)->filter(fn ($i) => ! empty($i['card']['services']))->count(),
                'rating_min' => collect($items)->min('rating'),
                'rating_max' => collect($items)->max('rating'),
                'reviews_total' => collect($items)->sum('reviewCount'),
            ],
            'mapping' => [
                'unknown_city' => $unknownCities,
                'warnings' => $warnings,
            ],
        ];
    }
}
