<?php

namespace App\Services;

use App\Models\CardBonusType;
use App\Models\Clinic;
use App\Models\ClinicCardBonus;
use App\Support\ClinicCardPromos;
use Illuminate\Support\Collection;

class ClinicCardBonusService
{
    public function __construct(private SameDayAvailabilityService $sameDay) {}

    /** @return list<array{id: string, code: string, title: string, description: string, slug: string|null, icon: string}> */
    public function stripOffers(Clinic $clinic): array
    {
        return $this->visibleOffers($clinic, 'strip');
    }

    public function hasSameDayFeature(Clinic $clinic): bool
    {
        return $this->featureEnabled($clinic, 'same_day');
    }

    public function isPremiumCard(Clinic $clinic): bool
    {
        foreach ($this->enabledConfigured($clinic) as $bonus) {
            $type = $bonus->type;
            if ($type && $type->is_active && $type->triggers_premium) {
                return true;
            }
        }

        return false;
    }

    public function countSameDayAvailableInCity(int $cityId): int
    {
        $clinics = Clinic::query()
            ->published()
            ->where('city_id', $cityId)
            ->where('same_day', true)
            ->with('cardBonuses.type')
            ->get();

        return $clinics->filter(fn (Clinic $clinic) => $this->hasSameDayFeature($clinic))->count();
    }

    /** @return array{code: string, title: string, description: string}|null */
    public function sameDayOfferDetail(Clinic $clinic): ?array
    {
        if (! $this->hasSameDayFeature($clinic)) {
            return null;
        }

        $bonus = $this->findEnabledBonus($clinic, 'same_day');
        if ($bonus && trim((string) $bonus->description) !== '') {
            return [
                'code' => 'same_day',
                'title' => trim((string) $bonus->short_label),
                'description' => trim((string) $bonus->description),
            ];
        }

        return null;
    }

    /** @return list<array{id: string, code: string, title: string, description: string, slug: string|null, icon: string}> */
    private function visibleOffers(Clinic $clinic, string $placement): array
    {
        /** @var Collection<int, array{id: string, code: string, title: string, description: string, slug: string|null, icon: string}> $offers */
        $offers = collect();
        $seen = [];

        foreach ($this->enabledConfigured($clinic) as $bonus) {
            $type = $bonus->type;
            if (! $type || ! $type->is_active || $type->placement !== $placement) {
                continue;
            }
            if (! $this->passesRuntimeChecks($clinic, $type)) {
                continue;
            }

            $title = trim($bonus->short_label ?? '');
            if ($title === '') {
                continue;
            }

            $key = mb_strtolower($title);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;

            $offers->push([
                'id' => $type->code,
                'code' => $type->code,
                'title' => $title,
                'description' => trim((string) $bonus->description),
                'slug' => null,
                'icon' => $type->icon,
            ]);
        }

        if ($offers->isEmpty()) {
            return ClinicCardPromos::legacyStripOffers($clinic);
        }

        return $offers->take(3)->values()->all();
    }

    private function featureEnabled(Clinic $clinic, string $code): bool
    {
        $bonus = $this->findEnabledBonus($clinic, $code);
        if (! $bonus) {
            if ($code === 'same_day') {
                return $clinic->same_day && $this->sameDay->hasAvailableSlotToday($clinic);
            }

            return false;
        }

        $type = $bonus->type;
        if (! $type || ! $type->is_active || $type->placement !== 'features') {
            return false;
        }

        return $this->passesRuntimeChecks($clinic, $type);
    }

    private function passesRuntimeChecks(Clinic $clinic, CardBonusType $type): bool
    {
        if ($type->requires_calendar && $type->code === 'same_day') {
            return $this->sameDay->hasAvailableSlotToday($clinic);
        }

        return true;
    }

    /** @return Collection<int, ClinicCardBonus> */
    private function enabledConfigured(Clinic $clinic): Collection
    {
        $rows = $clinic->relationLoaded('cardBonuses')
            ? $clinic->cardBonuses
            : $clinic->cardBonuses()->with('type')->get();

        return $rows
            ->filter(fn (ClinicCardBonus $b) => $b->enabled
                && trim((string) $b->short_label) !== ''
                && trim((string) $b->description) !== ''
                && $b->type);
    }

    private function findEnabledBonus(Clinic $clinic, string $code): ?ClinicCardBonus
    {
        return $this->enabledConfigured($clinic)->first(fn (ClinicCardBonus $b) => $b->type?->code === $code);
    }

    /** @return list<array<string, mixed>> */
    public function formTypesForClinic(Clinic $clinic): array
    {
        $types = CardBonusType::query()->orderBy('sort')->get();
        $byType = $clinic->cardBonuses()->get()->keyBy('card_bonus_type_id');

        return $types->map(function (CardBonusType $type) use ($byType) {
            /** @var ClinicCardBonus|null $row */
            $row = $byType->get($type->id);

            return [
                'id' => $type->id,
                'code' => $type->code,
                'name' => $type->name,
                'default_short_label' => $type->default_short_label,
                'placement' => $type->placement,
                'is_active' => $type->is_active,
                'triggers_premium' => $type->triggers_premium,
                'requires_calendar' => $type->requires_calendar,
                'enabled' => (bool) ($row?->enabled),
                'short_label' => $row?->short_label ?? $type->default_short_label,
                'description' => $row?->description ?? '',
            ];
        })->values()->all();
    }
}
