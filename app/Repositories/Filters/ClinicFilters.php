<?php

namespace App\Repositories\Filters;

use App\Models\ClinicPropertyType;
use App\Support\Text;

/**
 * Параметры каталога клиник. Одни и те же фильтры используются в Inertia-страницах и в API v1.
 */
final class ClinicFilters
{
    public const SORTS = ['relevance', 'rating', 'reviews', 'price_asc', 'price_desc', 'experience'];

    /**
     * @param  list<int>  $ids
     * @param  list<string>  $flags
     */
    public function __construct(
        public readonly ?int $cityId = null,
        public readonly ?string $district = null,
        public readonly ?string $specialty = null,
        public readonly ?string $service = null,
        /** @var list<string> */
        public readonly array $services = [],
        public readonly ?string $q = null,
        public readonly ?int $priceMax = null,
        public readonly ?float $ratingMin = null,
        public readonly ?int $reviewsMin = null,
        public readonly bool $children = false,
        public readonly ?int $childAge = null,
        public readonly ?int $experienceMin = null,
        public readonly bool $achievements = false,
        public readonly array $flags = [],
        public readonly string $sort = 'relevance',
        public readonly array $ids = [],
    ) {}

    /** @param array<string,mixed> $input */
    public static function fromArray(array $input, ?int $cityId = null): self
    {
        $int = fn ($k) => isset($input[$k]) && $input[$k] !== '' && is_numeric($input[$k]) ? (int) $input[$k] : null;
        $bool = fn ($k) => filter_var($input[$k] ?? false, FILTER_VALIDATE_BOOLEAN);
        $str = fn ($k) => isset($input[$k]) && is_string($input[$k]) && trim($input[$k]) !== '' ? trim($input[$k]) : null;

        $flags = [];
        $achievements = $bool('achievements');
        $sort = $str('sort') ?? 'relevance';
        $specialty = $str('specialty');

        foreach (ClinicPropertyType::forFilter() as $type) {
            if (! $bool($type->slug)) {
                continue;
            }

            $flags[] = $type->slug;

            if ($type->filter_kind === 'achievement') {
                $achievements = true;
            }

            if ($type->filter_kind === 'sort' && filled($type->filter_value)) {
                $sort = $type->filter_value;
            }

            if ($type->filter_kind === 'specialty' && filled($type->filter_value) && $specialty === null) {
                $specialty = $type->filter_value;
            }
        }

        $ids = [];
        if ($str('ids')) {
            $ids = array_values(array_unique(array_filter(array_map('intval', explode(',', $str('ids'))))));
            $ids = array_slice($ids, 0, 24);
        }

        $rating = isset($input['rating_min']) && is_numeric($input['rating_min']) ? (float) $input['rating_min'] : null;
        $services = self::parseServices($input);

        return new self(
            cityId: $cityId,
            district: $str('district'),
            specialty: $specialty,
            service: count($services) === 1 ? $services[0] : null,
            services: $services,
            q: $str('q') ? mb_substr($str('q'), 0, 80) : null,
            priceMax: $int('price_max'),
            ratingMin: $rating,
            reviewsMin: $int('reviews_min'),
            children: $bool('children') || $int('child_age') !== null,
            childAge: $int('child_age'),
            experienceMin: $int('experience_min'),
            achievements: $achievements,
            flags: $flags,
            sort: in_array($sort, self::SORTS, true) ? $sort : 'relevance',
            ids: $ids,
        );
    }

    /** @return list<string> */
    public function tokens(): array
    {
        if (! $this->q) {
            return [];
        }

        return array_values(array_filter(array_map(
            fn (string $t) => self::stem($t),
            explode(' ', Text::normalize($this->q))
        )));
    }

    public static function stem(string $token): string
    {
        $len = mb_strlen($token);

        return match (true) {
            $len >= 7 => mb_substr($token, 0, $len - 2),
            $len >= 5 => mb_substr($token, 0, $len - 1),
            default => $token,
        };
    }

    /** @return array<string,mixed> активные параметры для ссылок и отображения чипов */
    public function active(): array
    {
        $sort = $this->sort !== 'relevance' ? $this->sort : null;
        foreach (ClinicPropertyType::forFilter()->where('filter_kind', 'sort') as $type) {
            if (in_array($type->slug, $this->flags, true) && $type->filter_value === $this->sort) {
                $sort = null;
                break;
            }
        }

        $specialty = $this->specialty;
        foreach (ClinicPropertyType::forFilter()->where('filter_kind', 'specialty') as $type) {
            if (in_array($type->slug, $this->flags, true) && $type->filter_value === $specialty) {
                $specialty = null;
                break;
            }
        }

        $service = count($this->services) === 1 ? $this->services[0] : null;
        $services = count($this->services) > 1 ? implode(',', $this->services) : null;

        return array_filter([
            'district' => $this->district,
            'specialty' => $specialty,
            'service' => $service,
            'services' => $services,
            'q' => $this->q,
            'price_max' => $this->priceMax,
            'rating_min' => $this->ratingMin,
            'reviews_min' => $this->reviewsMin,
            'children' => $this->children ? 1 : null,
            'child_age' => $this->childAge,
            'experience_min' => $this->experienceMin,
            'sort' => $sort,
            ...array_fill_keys($this->flags, 1),
        ], fn ($v) => $v !== null && $v !== '');
    }

    /** @return list<string> */
    public function serviceSlugs(): array
    {
        return $this->services;
    }

    /** @param array<string,mixed> $input */
    private static function parseServices(array $input): array
    {
        $raw = $input['services'] ?? $input['service'] ?? null;
        if ($raw === null || $raw === '') {
            return [];
        }

        if (is_array($raw)) {
            $parts = $raw;
        } else {
            $parts = explode(',', (string) $raw);
        }

        return array_values(array_unique(array_filter(array_map(
            fn (string $s) => preg_match('/^[a-z0-9\-]+$/', $s) ? $s : null,
            array_map(fn ($v) => trim((string) $v), $parts)
        ))));
    }
}
