<?php

namespace App\Services\Parser;

use App\Support\Text;

class ParserOrganizationMapper
{
    /** @var array<string, string> */
    private const CITY_SLUGS = [
        'краснодар' => 'krasnodar',
        'анапа' => 'anapa',
        'ставрополь' => 'stavropol',
    ];

    /** @var array<string, string> */
    private const DAY_KEYS = [
        'понедельник' => 'mon',
        'вторник' => 'tue',
        'среда' => 'wed',
        'четверг' => 'thu',
        'пятница' => 'fri',
        'суббота' => 'sat',
        'воскресенье' => 'sun',
    ];

    /**
     * @param  array<string, mixed>  $item
     * @return array{
     *     parser_id: string,
     *     yandex_org_id: string,
     *     organization: array<string, mixed>,
     *     clinic: array<string, mixed>,
     *     photos: list<array{url: string, kind: string}>,
     *     specialty_slugs: list<string>,
     *     warnings: list<string>
     * }
     */
    public function map(array $item): array
    {
        $warnings = [];
        /** @var array<string, mixed> $card */
        $card = is_array($item['card'] ?? null) ? $item['card'] : [];

        $cityName = (string) ($item['city'] ?? $card['city'] ?? '');
        $citySlug = $this->citySlug($cityName);
        if ($citySlug === null) {
            $warnings[] = "Город «{$cityName}» не сопоставлен со справочником — нужно добавить в dictionaries.php.";
        }

        $externalId = (string) ($item['externalId'] ?? $card['externalId'] ?? '');
        $name = (string) ($item['name'] ?? $card['name'] ?? 'Без названия');
        $slug = Text::slug($name.'-'.$cityName.'-'.$externalId);

        $coords = $item['coordinates'] ?? $card['coordinates'] ?? null;
        $lat = is_array($coords) ? ($coords['lat'] ?? null) : null;
        $lng = is_array($coords) ? ($coords['lon'] ?? $coords['lng'] ?? null) : null;

        $phones = $this->phones($item, $card);
        $flags = $this->flags($card);

        return [
            'parser_id' => (string) ($item['id'] ?? ''),
            'yandex_org_id' => $externalId,
            'organization' => [
                'name' => $name,
                'legal_name' => $card['legalName'] ?? null,
                'inn' => $this->digitsInn($card['inn'] ?? null),
                'status' => 'active',
            ],
            'clinic' => [
                'city_slug' => $citySlug,
                'city_name' => $cityName,
                'name' => $name,
                'slug' => $slug,
                'yandex_org_id' => $externalId,
                'yandex_source_url' => $item['sourceUrl'] ?? $card['sourceUrl'] ?? null,
                'address' => (string) ($item['address'] ?? $card['address'] ?? ''),
                'metro' => $this->metro($card),
                'lat' => $lat,
                'lng' => $lng,
                'phone' => $phones[0] ?? null,
                'website' => $this->website($item['website'] ?? $card['website'] ?? null),
                'description' => $this->description($card),
                'schedule' => $this->schedule($card),
                'payment_methods' => $this->paymentMethods($card),
                'rating' => round((float) ($item['rating'] ?? $card['rating'] ?? 0), 2),
                'reviews_count' => (int) ($item['reviewCount'] ?? $card['reviewCount'] ?? 0),
                'tagline' => null,
                'achievements' => [],
                'license_number' => null,
                'license_issuer' => null,
                'license_date' => null,
                'doctors_count' => 0,
                'min_price' => null,
                'views_count' => 0,
                'status' => 'draft',
                'is_verified' => false,
                ...$flags,
            ],
            'photos' => $this->photos($card),
            'specialty_slugs' => $this->specialtySlugs($card),
            'warnings' => $warnings,
        ];
    }

    /**
     * @param  array<string, mixed>  $card
     * @return list<string>
     */
    private function phones(array $item, array $card): array
    {
        $list = $item['phones'] ?? $card['phones'] ?? [];
        if (! is_array($list)) {
            return [];
        }

        return array_values(array_filter(array_map(
            fn ($p) => is_string($p) ? trim($p) : null,
            $list,
        )));
    }

    private function website(mixed $url): ?string
    {
        if (! is_string($url) || $url === '') {
            return null;
        }

        return str_starts_with($url, 'http') ? $url : 'https://'.$url;
    }

    private function digitsInn(mixed $inn): ?string
    {
        if ($inn === null || $inn === '') {
            return null;
        }
        $digits = preg_replace('/\D+/', '', (string) $inn);

        return $digits !== '' ? $digits : null;
    }

    /**
     * @param  array<string, mixed>  $card
     */
    private function metro(array $card): ?string
    {
        $metro = $card['metro'] ?? null;
        if (! is_array($metro) || $metro === []) {
            return null;
        }
        $first = $metro[0];

        return is_string($first) ? $first : null;
    }

    /**
     * Описание клиники берём только из «живого» текста карточки. Служебные данные
     * (рубрики, часы, ссылка на источник) хранятся в отдельных полях и в описание не попадают.
     *
     * @param  array<string, mixed>  $card
     */
    private function description(array $card): ?string
    {
        foreach (['description', 'about'] as $key) {
            $text = $card[$key] ?? null;
            if (is_string($text) && trim($text) !== '') {
                return trim($text);
            }
        }

        return null;
    }

    /**
     * @param  array<string, mixed>  $card
     * @return array<string, array{open: string, close: string}|null>|null
     */
    private function schedule(array $card): ?array
    {
        $rows = $card['hoursSchedule'] ?? null;
        if (! is_array($rows) || $rows === []) {
            return null;
        }

        $schedule = array_fill_keys(array_values(self::DAY_KEYS), null);
        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }
            $day = Text::normalize((string) ($row['day'] ?? ''));
            $key = self::DAY_KEYS[$day] ?? null;
            if ($key === null) {
                continue;
            }
            if (! empty($row['closed'])) {
                $schedule[$key] = null;

                continue;
            }
            $open = (string) ($row['open'] ?? '');
            $close = (string) ($row['close'] ?? '');
            if ($open !== '' && $close !== '') {
                $schedule[$key] = ['open' => $open, 'close' => $close];
            }
        }

        return $schedule;
    }

    /**
     * @param  array<string, mixed>  $card
     * @return list<string>
     */
    private function paymentMethods(array $card): array
    {
        $methods = $card['paymentMethods'] ?? [];
        if (! is_array($methods)) {
            return [];
        }

        return array_values(array_map('strval', $methods));
    }

    /**
     * @param  array<string, mixed>  $card
     * @return array<string, bool>
     */
    private function flags(array $card): array
    {
        $attrs = collect($card['attributes'] ?? [])
            ->filter(fn ($a) => is_array($a))
            ->keyBy(fn ($a) => (string) ($a['key'] ?? ''));

        $amenities = collect($card['amenities'] ?? [])->map(fn ($v) => Text::normalize((string) $v));

        $hasBool = fn (string $key): bool => (bool) ($attrs->get($key)['bool'] ?? false);

        $servicesBlob = Text::normalize(implode(' ', [
            ...($card['services'] ?? []),
            ...collect($attrs->get('dentist_services')['values'] ?? [])->map(fn ($v) => (string) $v)->all(),
        ]));

        return [
            'accepts_children' => $hasBool('for_children') || $hasBool('uni_medic_kid') || $amenities->contains(fn ($a) => str_contains($a, 'детск')),
            'has_installment' => $hasBool('dental treatment in installments') || $amenities->contains(fn ($a) => str_contains($a, 'рассроч')),
            'has_sedation' => str_contains($servicesBlob, 'седац'),
            'has_anesthesia' => str_contains($servicesBlob, 'наркоз'),
            'has_microscope' => str_contains($servicesBlob, 'микроскоп'),
            'has_ct' => str_contains($servicesBlob, 'рентген') || str_contains($servicesBlob, 'кт'),
            'same_day' => $amenities->contains(fn ($a) => str_contains($a, 'запись')),
        ];
    }

    /**
     * @param  array<string, mixed>  $card
     * @return list<array{url: string, kind: string}>
     */
    private function photos(array $card): array
    {
        $photos = $card['photos'] ?? [];
        if (! is_array($photos)) {
            return [];
        }
        $out = [];
        foreach ($photos as $i => $photo) {
            if (! is_array($photo)) {
                continue;
            }
            $url = $photo['url'] ?? null;
            if (! is_string($url) || $url === '') {
                continue;
            }
            $out[] = ['url' => $url, 'kind' => $i === 0 ? 'exterior' : 'interior'];
        }

        return array_slice($out, 0, 12);
    }

    /**
     * @param  array<string, mixed>  $card
     * @return list<string>
     */
    private function specialtySlugs(array $card): array
    {
        $blob = Text::normalize(implode(' ', [
            ...($card['services'] ?? []),
            ...collect($card['attributes'] ?? [])
                ->filter(fn ($a) => is_array($a) && ($a['key'] ?? '') === 'dentist_services')
                ->flatMap(fn ($a) => $a['values'] ?? [])
                ->map(fn ($v) => (string) $v)
                ->all(),
        ]));

        $map = [
            'terapiya' => ['терап', 'кариес', 'пulp', 'пломб'],
            'hirurgiya' => ['хирург', 'удален'],
            'implantaciya' => ['имплант', 'sinus', 'костн'],
            'ortodontiya' => ['ортодонт', 'брекет', 'элайнер'],
            'ortopediya' => ['ортопед', 'протез', 'корон', 'винир'],
            'detskaya' => ['детск'],
            'parodontologiya' => ['пародонт', 'десен', 'дёсен'],
            'endodontiya' => ['эндодонт', 'канал'],
            'gigiena' => ['гигиен', 'отбел'],
            'estetika' => ['эстет'],
            'gnatologiya' => ['гнатолог', 'внчс'],
            'sedaciya' => ['седац', 'наркоз'],
        ];

        $slugs = [];
        foreach ($map as $slug => $needles) {
            foreach ($needles as $needle) {
                if (str_contains($blob, $needle)) {
                    $slugs[] = $slug;
                    break;
                }
            }
        }

        return array_values(array_unique($slugs));
    }

    private function citySlug(string $cityName): ?string
    {
        $norm = Text::normalize($cityName);

        return self::CITY_SLUGS[$norm] ?? null;
    }
}
