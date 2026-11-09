<?php

namespace App\Services\Clinics;

use App\Models\Clinic;
use App\Services\Parser\ParsedOrganizationNormalizer;

/**
 * Клиника регистрируется сама, а её карточка уже есть в каталоге (из парсера, без владельца).
 * Находит такие карточки, чтобы клиника забрала готовую, а не создавала дубль.
 */
class OwnerlessClinicMatcher
{
    private const NEARBY_METERS = 50;

    public function __construct(private readonly ParsedOrganizationNormalizer $normalizer) {}

    /**
     * @return list<array{id: int, slug: string, name: string, address: string|null, reason: string}>
     */
    public function find(Clinic $candidate): array
    {
        if ($candidate->city_id === null) {
            return [];
        }

        $phone = $candidate->phone ? $this->normalizer->e164((string) $candidate->phone) : null;
        $host = $this->normalizer->host($candidate->website);
        $nameKey = $this->normalizer->nameKey((string) $candidate->name);

        $matches = [];
        $clinics = Clinic::query()->where('city_id', $candidate->city_id)
            ->whereIn('status', Clinic::CLAIMABLE_STATUSES)->ownerless()
            ->when($candidate->exists, fn ($q) => $q->whereKeyNot($candidate->id))
            ->get(['id', 'slug', 'name', 'address', 'phone', 'website', 'lat', 'lng']);

        foreach ($clinics as $clinic) {
            $reason = match (true) {
                $phone !== null && $clinic->phone && $this->normalizer->e164((string) $clinic->phone) === $phone => 'совпадает телефон',
                $host !== null && $host === $this->normalizer->host($clinic->website) => 'совпадает сайт',
                $this->near($candidate, $clinic) && $this->similarNames($nameKey, $this->normalizer->nameKey((string) $clinic->name)) => 'то же место и похожее название',
                default => null,
            };
            if ($reason !== null) {
                $matches[] = ['id' => $clinic->id, 'slug' => $clinic->slug, 'name' => $clinic->name, 'address' => $clinic->address, 'reason' => $reason];
            }
        }

        return array_slice($matches, 0, 3);
    }

    private function near(Clinic $a, Clinic $b): bool
    {
        if ($a->lat === null || $a->lng === null || $b->lat === null || $b->lng === null) {
            return false;
        }
        $rad = M_PI / 180;
        $dLat = ($b->lat - $a->lat) * $rad;
        $dLng = ($b->lng - $a->lng) * $rad;
        $h = sin($dLat / 2) ** 2 + cos($a->lat * $rad) * cos($b->lat * $rad) * sin($dLng / 2) ** 2;

        return 6_371_000 * 2 * atan2(sqrt($h), sqrt(1 - $h)) <= self::NEARBY_METERS;
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
}
