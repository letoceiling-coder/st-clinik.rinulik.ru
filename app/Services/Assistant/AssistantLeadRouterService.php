<?php

namespace App\Services\Assistant;

use App\Models\City;
use App\Models\Clinic;
use App\Models\Tariff;
use App\Services\Monetization\ClinicSubscriptionService;
use Illuminate\Support\Collection;

/** Подбор клиник города для рассылки лида ассистента. */
class AssistantLeadRouterService
{
    public function maxBroadcastCount(): int
    {
        $settings = app(AssistantSettings::class)->get();

        return max(1, min(5, (int) ($settings['assistant_lead_broadcast_count'] ?? 3)));
    }

    /**
     * @return Collection<int, Clinic>
     */
    public function pickBroadcastClinics(City $city, ?string $preferredSlug = null): Collection
    {
        $limit = $this->maxBroadcastCount();
        $query = Clinic::query()
            ->published()
            ->where('city_id', $city->id)
            ->where('accepts_assistant_leads', true)
            ->orderByDesc('rating')
            ->orderByDesc('reviews_count')
            ->orderBy('id');

        if ($preferredSlug !== null && $preferredSlug !== '') {
            $preferred = (clone $query)->where('slug', $preferredSlug)->first();
            if ($preferred !== null) {
                $others = (clone $query)
                    ->where('id', '!=', $preferred->id)
                    ->limit(max(0, $limit - 1))
                    ->get();

                return $this->withAssistantFeature(collect([$preferred])->concat($others), $limit);
            }
        }

        $clinics = $query->limit($limit * 2)->get();

        return $this->withAssistantFeature($clinics, $limit);
    }

    /** @param  Collection<int, Clinic>  $clinics */
    private function withAssistantFeature(Collection $clinics, int $limit): Collection
    {
        $subscriptions = app(ClinicSubscriptionService::class);

        return $clinics
            ->filter(fn (Clinic $c) => $subscriptions->featureEnabled($c, Tariff::FEATURE_ASSISTANT_LEADS))
            ->take($limit)
            ->values();
    }
}
