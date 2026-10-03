<?php

namespace App\Repositories\Filters;

use App\Support\Text;

/**
 * Параметры каталога клиник. Одни и те же фильтры используются в Inertia-страницах и в API v1.
 */
final class ClinicFilters
{
    public const SORTS = ['relevance', 'rating', 'reviews', 'price_asc', 'price_desc', 'experience'];

    public const FLAGS = [
        'verified' => 'is_verified',
        'is_24_7' => 'is_24_7',
        'same_day' => 'same_day',
        'installment' => 'has_installment',
        'dms' => 'accepts_dms',
        'sedation' => 'has_sedation',
        'anesthesia' => 'has_anesthesia',
        'microscope' => 'has_microscope',
        'ct' => 'has_ct',
    ];

    /**
     * @param  list<int>  $ids
     */
    public function __construct(
        public readonly ?int $cityId = null,
        public readonly ?string $district = null,
        public readonly ?string $specialty = null,
        public readonly ?string $service = null,
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
        foreach (array_keys(self::FLAGS) as $flag) {
            if ($bool($flag)) {
                $flags[] = $flag;
            }
        }

        $sort = $str('sort');
        $ids = [];
        if ($str('ids')) {
            $ids = array_values(array_unique(array_filter(array_map('intval', explode(',', $str('ids'))))));
            $ids = array_slice($ids, 0, 24);
        }

        $rating = isset($input['rating_min']) && is_numeric($input['rating_min']) ? (float) $input['rating_min'] : null;

        return new self(
            cityId: $cityId,
            district: $str('district'),
            specialty: $str('specialty'),
            service: $str('service'),
            q: $str('q') ? mb_substr($str('q'), 0, 80) : null,
            priceMax: $int('price_max'),
            ratingMin: $rating,
            reviewsMin: $int('reviews_min'),
            children: $bool('children') || $int('child_age') !== null,
            childAge: $int('child_age'),
            experienceMin: $int('experience_min'),
            achievements: $bool('achievements'),
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
        return array_filter([
            'district' => $this->district,
            'specialty' => $this->specialty,
            'service' => $this->service,
            'q' => $this->q,
            'price_max' => $this->priceMax,
            'rating_min' => $this->ratingMin,
            'reviews_min' => $this->reviewsMin,
            'children' => $this->children ? 1 : null,
            'child_age' => $this->childAge,
            'experience_min' => $this->experienceMin,
            'achievements' => $this->achievements ? 1 : null,
            'sort' => $this->sort !== 'relevance' ? $this->sort : null,
            ...array_fill_keys($this->flags, 1),
        ], fn ($v) => $v !== null && $v !== '');
    }
}
