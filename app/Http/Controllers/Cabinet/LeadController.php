<?php

namespace App\Http\Controllers\Cabinet;

use App\Models\Lead;
use App\Models\LeadDispatch;
use App\Models\OrganizationStaff;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\AppointmentBookingService;
use App\Services\Assistant\AssistantLeadAcceptService;
use App\Services\Leads\LeadResponseStats;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Response;

class LeadController extends CabinetController
{
    /** Вкладки списка: что требует действий, кто записан, все. */
    private const TABS = [
        'active' => Lead::ACTIVE_STATUSES,
        'booked' => ['confirmed'],
        'closed' => ['completed', 'cancelled', 'no_show'],
    ];

    public function index(Request $request, LeadResponseStats $stats): Response
    {
        $branch = $this->branch($request);
        $status = $request->query('status');
        $tab = $request->query('tab', $status ? 'all' : 'active');
        $tab = isset(self::TABS[$tab]) || $tab === 'all' ? $tab : 'active';
        $onlyMine = $request->boolean('mine');

        $branchId = (int) $branch->id;
        $base = fn (): Builder => Lead::query()->where(function ($q) use ($branchId) {
            $q->where('clinic_id', $branchId)
                ->orWhereHas('dispatches', fn ($d) => $d->where('clinic_id', $branchId));
        });

        $page = $base()
            ->when($status && isset(Lead::STATUSES[$status]), fn ($q) => $q->where('status', $status))
            ->when(! $status && $tab !== 'all', fn ($q) => $q->whereIn('status', self::TABS[$tab]))
            ->when($onlyMine, fn ($q) => $q->where('assigned_to', $request->user()->id))
            ->with(['service:id,name', 'doctor:id,name', 'concern:id,name', 'appointment:id,lead_id', 'dispatches', 'assignee:id,name'])
            // Новые — первыми, затем «перезвонить» по времени, затем свежие.
            ->orderByRaw("case when status = 'new' then 0 else 1 end")
            ->orderByRaw('callback_at is null')
            ->orderBy('callback_at')
            ->latest()
            ->paginate(15)
            ->withQueryString();

        $counts = $base()->selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status');
        $tabCounts = collect(self::TABS)->map(fn (array $statuses) => (int) collect($statuses)->sum(fn ($s) => $counts[$s] ?? 0))
            ->put('all', (int) $counts->sum());

        $acceptService = app(AssistantLeadAcceptService::class);
        foreach ($page as $lead) {
            $acceptService->markViewed($lead, $branch);
        }

        $takenLeadIds = LeadDispatch::query()
            ->where('status', 'accepted')
            ->whereIn('lead_id', $page->getCollection()->pluck('id'))
            ->pluck('lead_id')
            ->all();

        return $this->render($request, 'Cabinet/Leads', 'Заявки', [
            'leads' => $page->through(function (Lead $l) use ($branchId, $takenLeadIds) {
                $dispatch = $l->dispatches->firstWhere('clinic_id', $branchId);
                $acceptedElsewhere = $l->assistant_broadcast && in_array($l->id, $takenLeadIds, true)
                    && ($dispatch === null || $dispatch->status !== 'accepted');

                return [
                    'id' => $l->id, 'name' => $l->name, 'phone' => $l->phone, 'status' => $l->status,
                    'status_label' => Lead::STATUSES[$l->status] ?? $l->status, 'service' => $l->service?->name, 'doctor' => $l->doctor?->name,
                    'concern' => $l->concern?->name, 'comment' => $l->comment, 'is_child' => $l->is_child,
                    'preferred_date' => $l->preferred_date?->toDateString(), 'preferred_time' => $l->preferred_time,
                    'clinic_note' => $l->clinic_note, 'created_at' => $l->created_at?->format('d.m.Y H:i'),
                    'created_at_iso' => $l->created_at?->toIso8601String(),
                    'first_response_at' => $l->first_response_at?->toIso8601String(),
                    'response_minutes' => $l->first_response_at ? (int) round($l->created_at->diffInMinutes($l->first_response_at)) : null,
                    'assigned_to' => $l->assigned_to,
                    'assignee' => $l->assignee?->name,
                    'callback_at' => $l->callback_at?->timezone(config('app.timezone'))->format('Y-m-d\\TH:i'),
                    'callback_overdue' => $l->callback_at !== null && $l->callback_at->isPast() && in_array($l->status, Lead::ACTIVE_STATUSES, true),
                    'cancel_reason' => $l->cancel_reason,
                    'source' => $l->source,
                    'has_appointment' => $l->appointment !== null,
                    'assistant_broadcast' => (bool) $l->assistant_broadcast,
                    'dispatch_status' => $dispatch?->status,
                    'can_take_in_work' => $l->assistant_broadcast
                        && $dispatch !== null
                        && in_array($dispatch->status, ['sent', 'viewed'], true)
                        && ! in_array($l->id, $takenLeadIds, true),
                    'taken_by_other_clinic' => $acceptedElsewhere,
                ];
            })->toArray(),
            'statuses' => Lead::STATUSES,
            'cancelReasons' => Lead::CANCEL_REASONS,
            'staff' => $this->staffOptions($request),
            'tabs' => $tabCounts,
            'tab' => $status ? 'all' : $tab,
            'response' => ($response = $stats->forClinic($branchId)) + ['median_label' => LeadResponseStats::humanize($response['median_minutes'])],
            'filters' => array_filter(['status' => $status, 'mine' => $onlyMine ? '1' : null]),
        ]);
    }

    public function update(Request $request, Lead $lead): RedirectResponse
    {
        abort_unless($lead->visibleForClinicId((int) $this->branch($request)->id), 404);

        $staffIds = array_column($this->staffOptions($request), 'id');
        $data = $request->validate([
            'status' => 'required|in:'.implode(',', array_keys(Lead::STATUSES)),
            'clinic_note' => 'nullable|string|max:500',
            'assigned_to' => ['nullable', 'integer', Rule::in($staffIds)],
            'callback_at' => 'nullable|date',
            'cancel_reason' => ['nullable', Rule::in(array_keys(Lead::CANCEL_REASONS))],
        ]);
        if ($data['status'] !== 'cancelled') {
            $data['cancel_reason'] = null;
        }
        if (! in_array($data['status'], Lead::ACTIVE_STATUSES, true)) {
            $data['callback_at'] = null;
        }

        $changed = $lead->status !== $data['status'];
        $lead->update($data);
        if ($changed || filled($data['clinic_note'] ?? null)) {
            $lead->markResponded();
        }

        if ($changed && $lead->user_id) {
            UserNotification::create([
                'user_id' => $lead->user_id, 'type' => 'lead_status',
                'title' => 'Статус заявки: '.Lead::STATUSES[$lead->status],
                'body' => 'Клиника «'.$lead->clinic->name.'» обновила статус вашей заявки.', 'url' => '/account/leads',
            ]);
        }

        return back()->with('success', 'Заявка обновлена.');
    }

    public function accept(Request $request, Lead $lead, AssistantLeadAcceptService $accept): RedirectResponse
    {
        $branch = $this->branch($request);
        abort_unless($lead->visibleForClinicId((int) $branch->id), 404);

        $accept->accept($lead, $branch, $request->user());
        $lead->markResponded();

        return back()->with('success', 'Заявка взята в работу. Свяжитесь с пациентом для записи.');
    }

    public function appointment(Request $request, Lead $lead, AppointmentBookingService $booking): RedirectResponse
    {
        abort_unless((int) $lead->clinic_id === (int) $this->branch($request)->id, 404);

        $appointment = $booking->createFromLead($lead, $request->user());
        if (! $appointment) {
            return back()->with('error', 'Нельзя создать запись: нет даты или нет свободного времени.');
        }
        $lead->markResponded();

        return redirect('/clinic-cabinet/calendar?day='.$appointment->starts_at->toDateString())
            ->with('success', 'Запись создана из заявки.');
    }

    /**
     * Кому можно поручить заявку: владелец и активные сотрудники организации.
     *
     * @return list<array{id: int, name: string}>
     */
    private function staffOptions(Request $request): array
    {
        $org = $request->attributes->get('org');
        $users = OrganizationStaff::query()
            ->where('organization_id', $org->id)
            ->whereNull('revoked_at')
            ->with('user:id,name')
            ->get()
            ->pluck('user')
            ->filter(fn ($u) => $u instanceof User);
        if ($org->owner instanceof User) {
            $users->push($org->owner);
        }

        return $users->unique('id')->map(fn (User $u) => ['id' => (int) $u->id, 'name' => (string) $u->name])->values()->all();
    }
}
