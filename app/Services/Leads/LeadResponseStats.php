<?php

namespace App\Services\Leads;

use App\Models\Lead;
use App\Services\Offers\DemoCabinetData;

/**
 * Как быстро клиника отвечает на заявки: медиана минут до первого действия за последние 30 дней.
 * Показывается в кабинете и (при достаточной выборке) пациентам на странице клиники.
 */
class LeadResponseStats
{
    /** Минимум заявок, чтобы показатель был честным и его можно было показать пациентам. */
    public const MIN_SAMPLE = 3;

    /** @return array{median_minutes: ?int, answered_percent: ?int, sample: int, waiting: int, reliable: bool} */
    public function forClinic(int $clinicId, int $days = 30): array
    {
        $leads = Lead::query()
            ->where('clinic_id', $clinicId)
            ->where('source', '!=', DemoCabinetData::LEAD_SOURCE)
            ->where('created_at', '>=', now()->subDays($days))
            ->get(['id', 'status', 'created_at', 'first_response_at']);

        $minutes = $leads
            ->filter(fn (Lead $l) => $l->first_response_at !== null)
            ->map(fn (Lead $l) => max(0, (int) round($l->created_at->diffInMinutes($l->first_response_at))))
            ->sort()
            ->values();

        $sample = $leads->count();

        return [
            'median_minutes' => $minutes->isEmpty() ? null : (int) $minutes->median(),
            'answered_percent' => $sample > 0 ? (int) round($minutes->count() * 100 / $sample) : null,
            'sample' => $sample,
            // Ждут ответа — все неотвеченные, а не только за период: старая заявка без звонка важнее всего.
            'waiting' => Lead::query()->where('clinic_id', $clinicId)->where('status', 'new')
                ->where('source', '!=', DemoCabinetData::LEAD_SOURCE)->count(),
            'reliable' => $minutes->count() >= self::MIN_SAMPLE,
        ];
    }

    /** «12 мин», «1 ч 20 мин», «2 дн» — для подписи. */
    public static function humanize(?int $minutes): ?string
    {
        if ($minutes === null) {
            return null;
        }
        if ($minutes < 60) {
            return max(1, $minutes).' мин';
        }
        if ($minutes < 60 * 24) {
            $hours = intdiv($minutes, 60);
            $rest = $minutes % 60;

            return $hours.' ч'.($rest > 0 ? ' '.$rest.' мин' : '');
        }

        return intdiv($minutes, 60 * 24).' дн';
    }
}
