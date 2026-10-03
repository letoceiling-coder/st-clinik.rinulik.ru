<?php

namespace App\Repositories\Filters;

final class DoctorFilters
{
    public const SORTS = ['relevance', 'rating', 'reviews', 'experience', 'price_asc'];

    /** Флаги, относящиеся к клинике врача. */
    public const CLINIC_FLAGS = [
        'is_24_7' => 'is_24_7',
        'same_day' => 'same_day',
        'installment' => 'has_installment',
        'dms' => 'accepts_dms',
        'sedation' => 'has_sedation',
        'anesthesia' => 'has_anesthesia',
        'microscope' => 'has_microscope',
        'ct' => 'has_ct',
    ];

    public function __construct(
        public readonly ?int $cityId = null,
        public readonly ?string $clinic = null,
        public readonly ?string $specialty = null,
        public readonly ?string $q = null,
        public readonly ?int $priceMax = null,
        public readonly ?float $ratingMin = null,
        public readonly ?int $reviewsMin = null,
        public readonly bool $verified = false,
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
        $base = ClinicFilters::fromArray($input, $cityId);
        $str = fn ($k) => isset($input[$k]) && is_string($input[$k]) && trim($input[$k]) !== '' ? trim($input[$k]) : null;
        $sort = $str('sort');

        return new self(
            cityId: $cityId,
            clinic: $str('clinic'),
            specialty: $base->specialty,
            q: $base->q,
            priceMax: $base->priceMax,
            ratingMin: $base->ratingMin,
            reviewsMin: $base->reviewsMin,
            verified: in_array('verified', $base->flags, true),
            children: $base->children,
            childAge: $base->childAge,
            experienceMin: $base->experienceMin,
            achievements: $base->achievements,
            flags: array_values(array_intersect($base->flags, array_keys(self::CLINIC_FLAGS))),
            sort: in_array($sort, self::SORTS, true) ? $sort : 'relevance',
            ids: $base->ids,
        );
    }

    /** @return list<string> */
    public function tokens(): array
    {
        return (new ClinicFilters(q: $this->q))->tokens();
    }

    /** @return array<string,mixed> */
    public function active(): array
    {
        return array_filter([
            'clinic' => $this->clinic,
            'specialty' => $this->specialty,
            'q' => $this->q,
            'price_max' => $this->priceMax,
            'rating_min' => $this->ratingMin,
            'reviews_min' => $this->reviewsMin,
            'verified' => $this->verified ? 1 : null,
            'children' => $this->children ? 1 : null,
            'child_age' => $this->childAge,
            'experience_min' => $this->experienceMin,
            'achievements' => $this->achievements ? 1 : null,
            'sort' => $this->sort !== 'relevance' ? $this->sort : null,
            ...array_fill_keys($this->flags, 1),
        ], fn ($v) => $v !== null && $v !== '');
    }
}
