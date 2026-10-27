<?php

namespace App\Services\Parser;

use App\Support\Text;

/**
 * Приводит карточку парсера (из базы организаций или из результата задачи) к полям промежуточной таблицы.
 */
class ParsedOrganizationNormalizer
{
    private const DETAILS_PATTERN = '/(?:^|[,\s])((?:(?:цокольный|подвальный|мансардный|\d+(?:-?[йя])?)\s+)?(?:этаж|офис|оф\.|кабинет|каб\.|помещение|пом\.|вход|подъезд)(?=$|[\s\d,.;:№-]).*)$/iu';

    /** @var array<string, list<string>> */
    private const SOCIAL_HOSTS = [
        'telegram' => ['t.me', 'telegram.me', 'telegram.org'],
        'whatsapp' => ['wa.me', 'whatsapp.com', 'api.whatsapp.com'],
        'vk' => ['vk.com', 'vk.ru', 'm.vk.com'],
        'max' => ['max.ru'],
        'ok' => ['ok.ru'],
        'youtube' => ['youtube.com', 'youtu.be'],
        'instagram' => ['instagram.com'],
        'dzen' => ['dzen.ru'],
    ];

    /**
     * @param  array<string, mixed>  $item
     * @return array{
     *     external_id: string,
     *     parser_id: string|null,
     *     name: string,
     *     city_name: string|null,
     *     region: string|null,
     *     address: string|null,
     *     address_details: string|null,
     *     lat: float|null,
     *     lng: float|null,
     *     phones: list<string>,
     *     website: string|null,
     *     socials: list<array{type: string, url: string}>,
     *     categories: list<string>,
     *     hours: string|null,
     *     rating: float|null,
     *     reviews_count: int,
     *     has_full_card: bool,
     *     source_updated_at: string|null
     * }
     */
    public function normalize(array $item, ?string $fallbackCity = null): array
    {
        /** @var array<string, mixed> $card */
        $card = is_array($item['card'] ?? null) ? $item['card'] : [];
        $pick = fn (string $key) => $item[$key] ?? $card[$key] ?? null;

        $city = $this->string($pick('city')) ?? $fallbackCity;
        [$address, $details] = $this->splitAddress($this->string($pick('address')), $city);
        $details = $this->string($card['addressDetails'] ?? null) ?? $details;

        $coords = $pick('coordinates');
        $links = $this->links($item, $card);

        return [
            'external_id' => (string) ($pick('externalId') ?? ''),
            'parser_id' => $this->string($item['id'] ?? null),
            'name' => $this->string($pick('name')) ?? 'Без названия',
            'city_name' => $city,
            'region' => $this->string($pick('region')),
            'address' => $address,
            'address_details' => $details,
            'lat' => is_array($coords) && is_numeric($coords['lat'] ?? null) ? (float) $coords['lat'] : null,
            'lng' => is_array($coords) && is_numeric($coords['lon'] ?? $coords['lng'] ?? null) ? (float) ($coords['lon'] ?? $coords['lng']) : null,
            'phones' => $this->phones(is_array($pick('phones')) ? $pick('phones') : []),
            'website' => $links['website'],
            'socials' => $links['socials'],
            'categories' => array_values(array_filter(array_map(fn ($c) => $this->string($c), is_array($pick('categories')) ? $pick('categories') : []))),
            'hours' => $this->string($card['hours'] ?? null),
            'rating' => is_numeric($pick('rating')) ? round((float) $pick('rating'), 2) : null,
            'reviews_count' => (int) ($pick('reviewCount') ?? 0),
            'has_full_card' => (bool) ($card['cardOpened'] ?? false) || isset($card['hoursSchedule']) || isset($card['services']),
            'source_updated_at' => $this->string($item['updatedAt'] ?? null),
        ];
    }

    /** @return array{0: string|null, 1: string|null} */
    public function splitAddress(?string $address, ?string $city): array
    {
        if ($address === null) {
            return [null, null];
        }

        if ($city !== null && $city !== '') {
            $address = preg_replace('/('.preg_quote($city, '/').')(?=(?:\d+\s*)?(?:этаж|офис|кабинет|помещение|вход|подъезд|цокольный))/iu', '$1, ', $address) ?? $address;
        }

        $details = null;
        if (preg_match(self::DETAILS_PATTERN, $address, $m, PREG_OFFSET_CAPTURE)) {
            $details = trim($m[1][0], ' ,;');
            $address = substr($address, 0, $m[1][1]);
        }

        $address = trim($address, ' ,;');
        if ($city !== null && $city !== '') {
            $address = trim(preg_replace('/,?\s*'.preg_quote($city, '/').'$/iu', '', $address) ?? $address, ' ,;');
        }

        return [$address !== '' ? $address : null, $details !== '' ? $details : null];
    }

    /**
     * @param  array<int, mixed>  $phones
     * @return list<string>
     */
    public function phones(array $phones): array
    {
        $out = [];
        foreach ($phones as $phone) {
            $e164 = $this->e164(is_scalar($phone) ? (string) $phone : '');
            if ($e164 !== null) {
                $out[$e164] = $e164;
            }
        }

        return array_values($out);
    }

    public function e164(string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';
        if (strlen($digits) === 11 && $digits[0] === '8') {
            $digits = '7'.substr($digits, 1);
        }
        if (strlen($digits) === 10) {
            $digits = '7'.$digits;
        }

        return strlen($digits) >= 11 && strlen($digits) <= 15 ? '+'.$digits : null;
    }

    public function socialType(string $url): ?string
    {
        $host = $this->host($url);
        if ($host === null) {
            return null;
        }
        foreach (self::SOCIAL_HOSTS as $type => $hosts) {
            foreach ($hosts as $candidate) {
                if ($host === $candidate || str_ends_with($host, '.'.$candidate)) {
                    return $type;
                }
            }
        }

        return null;
    }

    public function host(?string $url): ?string
    {
        if ($url === null || $url === '') {
            return null;
        }
        $host = parse_url(str_contains($url, '://') ? $url : 'https://'.$url, PHP_URL_HOST);

        return is_string($host) && $host !== '' ? preg_replace('/^www\./', '', mb_strtolower($host)) : null;
    }

    /**
     * @param  array<string, mixed>  $item
     * @param  array<string, mixed>  $card
     * @return array{website: string|null, socials: list<array{type: string, url: string}>}
     */
    private function links(array $item, array $card): array
    {
        $website = null;
        $socials = [];
        $add = function (?string $url) use (&$website, &$socials): void {
            $url = $this->cleanUrl($url);
            if ($url === null) {
                return;
            }
            $type = $this->socialType($url);
            if ($type === null) {
                $website ??= $url;

                return;
            }
            $socials[$type.'|'.mb_strtolower(rtrim($url, '/'))] = ['type' => $type, 'url' => $url];
        };

        $add($this->string($item['website'] ?? $card['website'] ?? null));
        foreach ((array) ($card['socialLinks'] ?? []) as $link) {
            $add(is_array($link) ? $this->string($link['url'] ?? null) : $this->string($link));
        }
        foreach ((array) ($card['messagingLinks'] ?? []) as $link) {
            $add($this->string($link));
        }
        foreach ((array) ($card['additionalContacts'] ?? []) as $link) {
            $link = $this->string($link);
            if ($link !== null && str_starts_with($link, 'http') && $this->socialType($link) !== null) {
                $add($link);
            }
        }

        return ['website' => $website, 'socials' => array_values($socials)];
    }

    private function cleanUrl(?string $url): ?string
    {
        if ($url === null || $url === '') {
            return null;
        }
        if (! str_contains($url, '://')) {
            $url = 'https://'.$url;
        }
        $parts = parse_url($url);
        if (! is_array($parts) || empty($parts['host'])) {
            return null;
        }

        $query = [];
        parse_str($parts['query'] ?? '', $query);
        $query = array_filter($query, fn ($key) => ! str_starts_with((string) $key, 'utm_') && $key !== 'feature', ARRAY_FILTER_USE_KEY);

        return ($parts['scheme'] ?? 'https').'://'.$parts['host'].($parts['path'] ?? '/').($query !== [] ? '?'.http_build_query($query) : '');
    }

    private function string(mixed $value): ?string
    {
        if (! is_scalar($value)) {
            return null;
        }
        $value = trim((string) $value);

        return $value !== '' ? $value : null;
    }

    public function nameKey(string $name): string
    {
        $norm = Text::normalize($name);
        $norm = preg_replace('/\b(стоматология|стоматологическая|клиника|центр|ооо|ип|dental|дент|smile)\b/u', ' ', $norm) ?? $norm;

        return trim(preg_replace('/\s+/u', ' ', $norm) ?? $norm);
    }
}
