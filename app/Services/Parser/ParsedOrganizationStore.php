<?php

namespace App\Services\Parser;

use App\Models\City;
use App\Models\Clinic;
use App\Models\OrganizationContact;
use App\Models\ParsedOrganization;
use App\Models\ParserTask;
use App\Support\Text;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Записывает карточки парсера в промежуточную таблицу. Клиники на сайте не создаёт и не меняет.
 */
class ParsedOrganizationStore
{
    private const CONTACT_SOCIALS = ['telegram', 'whatsapp', 'vk', 'max'];

    private const NEARBY_METERS = 50;

    /** @var array<string, int>|null */
    private ?array $cityIds = null;

    public function __construct(private readonly ParsedOrganizationNormalizer $normalizer) {}

    /**
     * @param  list<array<string, mixed>>  $items
     * @return array{found: int, created: int, updated: int, skipped: int}
     */
    public function upsert(array $items, ?ParserTask $task = null, ?string $fallbackCity = null, bool $onlyExisting = false): array
    {
        $stats = ['found' => 0, 'created' => 0, 'updated' => 0, 'skipped' => 0];
        $touched = [];

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }
            $data = $this->normalizer->normalize($item, $fallbackCity);
            if ($data['external_id'] === '' || ! $this->isDental($data['categories'])) {
                $stats['skipped']++;

                continue;
            }
            $stats['found']++;

            $existing = ParsedOrganization::query()->where('external_id', $data['external_id'])->first();
            if ($existing === null && $onlyExisting) {
                $stats['skipped']++;

                continue;
            }

            $record = DB::transaction(fn () => $existing
                ? $this->updateExisting($existing, $data, $item, $task)
                : $this->create($data, $item, $task));

            $stats[$existing ? 'updated' : 'created']++;
            $touched[] = $record->id;
        }

        if ($touched !== []) {
            $this->detectDuplicates(ParsedOrganization::query()->whereIn('id', $touched)->get());
            $this->assignGroups();
        }

        return $stats;
    }

    /**
     * Ищет совпадения с клиниками на сайте: id Яндекса, телефон, домен сайта, координаты + похожее название.
     *
     * @param  Collection<int, ParsedOrganization>  $records
     */
    public function detectDuplicates(Collection $records): void
    {
        $clinicsByCity = [];

        foreach ($records as $record) {
            if (in_array($record->status, ParsedOrganization::LOCKED_STATUSES, true)) {
                continue;
            }

            $key = $record->city_id ?? 0;
            $clinicsByCity[$key] ??= Clinic::query()
                ->when($record->city_id, fn ($q) => $q->where('city_id', $record->city_id))
                ->get(['id', 'name', 'phone', 'website', 'lat', 'lng', 'yandex_org_id']);

            [$clinicId, $reason] = $this->findMatch($record, $clinicsByCity[$key]);
            if ($clinicId === null && $record->city_id !== null) {
                $byYandex = Clinic::query()->where('yandex_org_id', $record->external_id)->value('id');
                [$clinicId, $reason] = $byYandex ? [$byYandex, 'Совпадает id Яндекса'] : [null, null];
            }

            $record->forceFill(['match_clinic_id' => $clinicId, 'match_reason' => $reason])->save();
        }
    }

    /**
     * Для сайта нужны только стоматологии: зуботехнические лаборатории, косметология и т.п. отсекаются.
     * Карточки без рубрик (быстрый сбор из выдачи) принимаются — поиск уже шёл по стоматологиям.
     *
     * @param  list<string>  $categories
     */
    public function isDental(array $categories): bool
    {
        if ($categories === []) {
            return true;
        }

        foreach ($categories as $category) {
            $norm = Text::normalize($category);
            if (str_contains($norm, 'стоматолог') && ! str_contains($norm, 'материал') && ! str_contains($norm, 'оборудован')) {
                return true;
            }
        }

        return false;
    }

    /** Объединяет карточки с общим доменом сайта или телефоном в «сеть». */
    public function assignGroups(): void
    {
        $rows = ParsedOrganization::query()->get(['id', 'website', 'phones', 'group_key']);
        $members = [];
        foreach ($rows as $row) {
            foreach ($this->groupCandidates($row) as $key) {
                $members[$key][] = $row->id;
            }
        }

        foreach ($rows as $row) {
            $group = null;
            foreach ($this->groupCandidates($row) as $key) {
                if (count($members[$key] ?? []) > 1) {
                    $group = $key;
                    break;
                }
            }
            if ($row->group_key !== $group) {
                ParsedOrganization::query()->whereKey($row->id)->update(['group_key' => $group]);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $item
     */
    private function create(array $data, array $item, ?ParserTask $task): ParsedOrganization
    {
        $record = ParsedOrganization::create([
            ...$this->columns($data),
            'raw' => $item,
            'status' => 'new',
            'parser_task_id' => $task?->id,
            'last_synced_at' => now(),
        ]);
        $this->syncContacts($record);

        return $record;
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $item
     */
    private function updateExisting(ParsedOrganization $record, array $data, array $item, ?ParserTask $task): ParsedOrganization
    {
        $raw = $record->raw ?? [];
        $hasNewCard = is_array($item['card'] ?? null) && $item['card'] !== [];
        $raw = $hasNewCard || ! is_array($raw['card'] ?? null) ? $item : [...$item, 'card' => $raw['card']];

        $columns = array_filter($this->columns($data), fn ($value) => $value !== null && $value !== [] && $value !== '');
        if ($record->has_full_card && ! $data['has_full_card']) {
            unset($columns['has_full_card'], $columns['hours'], $columns['address_details']);
        }

        $record->fill([
            ...$columns,
            'raw' => $raw,
            'parser_task_id' => $record->parser_task_id ?? $task?->id,
            'last_synced_at' => now(),
        ])->save();
        $this->syncContacts($record);

        return $record;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function columns(array $data): array
    {
        return [
            'external_id' => $data['external_id'],
            'parser_id' => $data['parser_id'],
            'name' => mb_substr($data['name'], 0, 255),
            'city_name' => $data['city_name'],
            'region' => $data['region'],
            'city_id' => $this->cityId($data['city_name']),
            'address' => $data['address'] !== null ? mb_substr($data['address'], 0, 500) : null,
            'address_details' => $data['address_details'] !== null ? mb_substr($data['address_details'], 0, 255) : null,
            'lat' => $data['lat'],
            'lng' => $data['lng'],
            'phones' => $data['phones'],
            'website' => $data['website'] !== null ? mb_substr($data['website'], 0, 500) : null,
            'socials' => $data['socials'],
            'categories' => $data['categories'],
            'hours' => $data['hours'] !== null ? mb_substr($data['hours'], 0, 255) : null,
            'rating' => $data['rating'],
            'reviews_count' => $data['reviews_count'],
            'has_full_card' => $data['has_full_card'],
            'source_updated_at' => $data['source_updated_at'] !== null ? now()->parse($data['source_updated_at']) : null,
        ];
    }

    private function syncContacts(ParsedOrganization $record): void
    {
        $contacts = collect($record->phones ?? [])->map(fn (string $phone) => ['type' => 'phone', 'value' => $phone]);
        if ($record->website) {
            $contacts->push(['type' => 'website', 'value' => $record->website]);
        }
        foreach ($record->socials ?? [] as $social) {
            if (in_array($social['type'] ?? '', self::CONTACT_SOCIALS, true)) {
                $contacts->push(['type' => $social['type'], 'value' => $social['url']]);
            }
        }

        foreach ($contacts as $contact) {
            OrganizationContact::query()->firstOrCreate(
                ['parsed_organization_id' => $record->id, 'type' => $contact['type'], 'value' => mb_substr($contact['value'], 0, 255)],
                ['source' => 'yandex', 'clinic_id' => $record->clinic_id],
            );
        }
    }

    /**
     * @param  Collection<int, Clinic>  $clinics
     * @return array{0: int|null, 1: string|null}
     */
    private function findMatch(ParsedOrganization $record, Collection $clinics): array
    {
        $phones = collect($record->phones ?? [])->map(fn (string $p) => $this->digits($p))->filter()->all();
        $domain = $this->normalizer->host($record->website);
        $nameKey = $this->normalizer->nameKey($record->name);

        $byYandex = $clinics->firstWhere('yandex_org_id', $record->external_id);
        if ($byYandex) {
            return [$byYandex->id, 'Совпадает id Яндекса'];
        }

        foreach ($clinics as $clinic) {
            if ($phones !== [] && in_array($this->digits((string) $clinic->phone), $phones, true)) {
                return [$clinic->id, 'Совпадает телефон'];
            }
            if ($domain !== null && $domain === $this->normalizer->host($clinic->website)) {
                return [$clinic->id, 'Совпадает сайт'];
            }
            if ($record->lat !== null && $clinic->lat !== null
                && $this->distance($record->lat, $record->lng, (float) $clinic->lat, (float) $clinic->lng) <= self::NEARBY_METERS
                && $this->similarNames($nameKey, $this->normalizer->nameKey($clinic->name))) {
                return [$clinic->id, 'Рядом (до 50 м) и похожее название'];
            }
        }

        return [null, null];
    }

    /** @return list<string> */
    private function groupCandidates(ParsedOrganization $row): array
    {
        $keys = [];
        $domain = $this->normalizer->host($row->website);
        if ($domain !== null) {
            $keys[] = 'site:'.$domain;
        }
        foreach ($row->phones ?? [] as $phone) {
            $keys[] = 'phone:'.$phone;
        }

        return $keys;
    }

    private function similarNames(string $a, string $b): bool
    {
        if ($a === '' || $b === '') {
            return false;
        }
        if (str_contains($a, $b) || str_contains($b, $a)) {
            return true;
        }
        similar_text($a, $b, $percent);

        return $percent >= 70;
    }

    private function distance(float $lat1, ?float $lng1, float $lat2, float $lng2): float
    {
        if ($lng1 === null) {
            return INF;
        }
        $rad = M_PI / 180;
        $dLat = ($lat2 - $lat1) * $rad;
        $dLng = ($lng2 - $lng1) * $rad;
        $a = sin($dLat / 2) ** 2 + cos($lat1 * $rad) * cos($lat2 * $rad) * sin($dLng / 2) ** 2;

        return 6_371_000 * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function digits(string $phone): string
    {
        $e164 = $this->normalizer->e164($phone);

        return $e164 !== null ? $e164 : '';
    }

    private function cityId(?string $name): ?int
    {
        if ($name === null) {
            return null;
        }
        $this->cityIds ??= City::query()->get(['id', 'name'])
            ->mapWithKeys(fn (City $city) => [Text::normalize($city->name) => $city->id])
            ->all();

        return $this->cityIds[Text::normalize($name)] ?? null;
    }
}
