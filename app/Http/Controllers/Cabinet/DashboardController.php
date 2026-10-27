<?php

namespace App\Http\Controllers\Cabinet;

use App\Models\Appointment;
use App\Models\ClinicDocument;
use App\Models\ClinicPhoto;
use App\Models\ClinicPromotion;
use App\Models\Doctor;
use App\Models\Lead;
use App\Models\Review;
use App\Services\Monetization\ClinicSubscriptionService;
use App\Services\ProfileMetrics;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Response;

class DashboardController extends CabinetController
{
    public function index(Request $request, ProfileMetrics $metrics, ClinicSubscriptionService $subscriptions): Response|RedirectResponse
    {
        $branch = $request->attributes->get('branch');
        if (! $branch) {
            return redirect()->route('cabinet.branches.create');
        }
        $subscription = $subscriptions->activeSubscription($branch);
        $since = now()->subDays(30);

        $leads30 = Lead::where('clinic_id', $branch->id)->where('created_at', '>=', $since);

        return $this->render($request, 'Cabinet/Dashboard', 'Кабинет клиники', [
            'completeness' => $metrics->completeness($branch),
            'kpi' => [
                'leads_30d' => (clone $leads30)->count(),
                'leads_new' => Lead::where('clinic_id', $branch->id)->where('status', 'new')->count(),
                'views' => (int) $branch->views_count,
                'rating' => (float) $branch->rating,
                'reviews' => (int) $branch->reviews_count,
                'unanswered' => Review::where('clinic_id', $branch->id)->where('status', 'published')->withoutPublishedReply()->count(),
                'appointments_upcoming' => Appointment::query()
                    ->where('clinic_id', $branch->id)
                    ->whereIn('status', Appointment::ACTIVE)
                    ->where('starts_at', '>=', now())
                    ->count(),
                'appointments_today' => Appointment::query()
                    ->where('clinic_id', $branch->id)
                    ->whereDate('starts_at', today())
                    ->whereNotIn('status', ['cancelled', 'no_show'])
                    ->count(),
                'active_promotions' => ClinicPromotion::query()->active()->where('clinic_id', $branch->id)->count(),
            ],
            'moderation' => [
                'clinic' => $branch->status,
                'clinic_note' => $branch->moderation_note,
                'doctors_pending' => Doctor::where('clinic_id', $branch->id)->where('status', 'pending')->count(),
                'photos_pending' => ClinicPhoto::where('clinic_id', $branch->id)->where('status', 'pending')->count(),
                'documents_pending' => ClinicDocument::where('clinic_id', $branch->id)->where('status', 'pending')->count(),
                'documents_rejected' => ClinicDocument::where('clinic_id', $branch->id)->where('status', 'rejected')->count(),
            ],
            'subscription' => $subscription ? [
                'tariff' => $subscription->tariff?->name,
                'ends_at' => $subscription->ends_at->format('d.m.Y'),
                'days_left' => max(0, now()->diffInDays($subscription->ends_at, false)),
            ] : null,
            'recent_leads' => Lead::where('clinic_id', $branch->id)->with(['service:id,name', 'doctor:id,name'])->latest()->limit(5)->get()->map(fn ($l) => [
                'id' => $l->id, 'name' => $l->name, 'phone' => $l->phone, 'status' => $l->status,
                'status_label' => Lead::STATUSES[$l->status] ?? $l->status, 'service' => $l->service?->name,
                'created_at' => $l->created_at?->format('d.m H:i'),
            ]),
        ]);
    }

    public function stats(Request $request): Response
    {
        $branch = $this->branch($request);
        $days = 30;
        $from = now()->subDays($days - 1)->startOfDay();

        $byDay = Lead::where('clinic_id', $branch->id)->where('created_at', '>=', $from)->get(['created_at'])
            ->groupBy(fn ($l) => $l->created_at->toDateString())->map->count();

        $series = collect(range(0, $days - 1))->map(function ($i) use ($from, $byDay) {
            $d = Carbon::parse($from)->addDays($i);

            return ['date' => $d->format('d.m'), 'value' => (int) ($byDay[$d->toDateString()] ?? 0)];
        });

        $statuses = Lead::where('clinic_id', $branch->id)->selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status');
        $total = max(1, $statuses->sum());

        return $this->render($request, 'Cabinet/Stats', 'Статистика', [
            'series' => $series,
            'statuses' => collect(Lead::STATUSES)->map(fn ($label, $key) => ['key' => $key, 'label' => $label, 'count' => (int) ($statuses[$key] ?? 0)])->values(),
            'conversion' => [
                'total' => (int) $statuses->sum(),
                'confirmed' => (int) (($statuses['confirmed'] ?? 0) + ($statuses['completed'] ?? 0)),
                'percent' => round((($statuses['confirmed'] ?? 0) + ($statuses['completed'] ?? 0)) / $total * 100),
            ],
            'top_services' => Lead::where('clinic_id', $branch->id)->whereNotNull('service_id')->with('service:id,name')
                ->get()->groupBy('service_id')->map(fn ($g) => ['name' => $g->first()->service->name, 'count' => $g->count()])
                ->sortByDesc('count')->take(6)->values(),
            'views' => (int) $branch->views_count,
            'rating' => (float) $branch->rating,
            'reviews' => (int) $branch->reviews_count,
        ]);
    }
}
