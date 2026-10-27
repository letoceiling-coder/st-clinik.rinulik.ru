<?php

namespace App\Http\Controllers\Admin;

use App\Models\AnalyticsEvent;
use App\Models\City;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Response;

class AnalyticsController extends AdminController
{
    public function index(Request $request): Response
    {
        $days = min(90, max(7, (int) $request->query('days', 30)));
        $since = now()->subDays($days);

        $counts = AnalyticsEvent::query()
            ->where('created_at', '>=', $since)
            ->selectRaw('event, count(*) as aggregate')
            ->groupBy('event')
            ->pluck('aggregate', 'event');

        $funnel = collect(AnalyticsEvent::FUNNEL)->map(fn (string $event) => [
            'event' => $event,
            'label' => AnalyticsEvent::LABELS[$event],
            'count' => (int) ($counts[$event] ?? 0),
        ])->values();

        $base = (int) ($counts[AnalyticsEvent::EVENT_PAGE_VIEW] ?? 0);

        $funnelWithRate = $funnel->map(function (array $row) use ($base) {
            $row['rate'] = $base > 0 ? round(100 * $row['count'] / $base, 1) : 0;

            return $row;
        });

        $byCity = AnalyticsEvent::query()
            ->where('created_at', '>=', $since)
            ->whereNotNull('city_id')
            ->select('city_id', DB::raw('count(*) as aggregate'))
            ->groupBy('city_id')
            ->orderByDesc('aggregate')
            ->limit(15)
            ->get();

        $cityNames = City::query()->whereIn('id', $byCity->pluck('city_id'))->pluck('name', 'id');

        return $this->render('Admin/Analytics', 'Аналитика', [
            'days' => $days,
            'funnel' => $funnelWithRate,
            'totals' => collect(AnalyticsEvent::LABELS)->map(fn (string $label, string $event) => [
                'event' => $event,
                'label' => $label,
                'count' => (int) ($counts[$event] ?? 0),
            ])->values(),
            'by_city' => $byCity->map(fn ($row) => [
                'city' => $cityNames[$row->city_id] ?? '#'.$row->city_id,
                'count' => (int) $row->aggregate,
            ]),
            'metrika_configured' => ctype_digit((string) config('services.yandex_metrika.counter_id')),
            'metrika_goals' => collect(AnalyticsEvent::LABELS)->map(fn (string $label, string $event) => [
                'id' => $event,
                'label' => $label,
            ])->values(),
        ]);
    }
}
