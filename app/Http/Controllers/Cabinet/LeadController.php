<?php

namespace App\Http\Controllers\Cabinet;

use App\Models\Lead;
use App\Models\LeadDispatch;
use App\Models\UserNotification;
use App\Services\AppointmentBookingService;
use App\Services\Assistant\AssistantLeadAcceptService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class LeadController extends CabinetController
{
    public function index(Request $request): Response
    {
        $branch = $this->branch($request);
        $status = $request->query('status');

        $branchId = (int) $branch->id;
        $page = Lead::query()
            ->where(function ($q) use ($branchId) {
                $q->where('clinic_id', $branchId)
                    ->orWhereHas('dispatches', fn ($d) => $d->where('clinic_id', $branchId));
            })
            ->when($status && isset(Lead::STATUSES[$status]), fn ($q) => $q->where('status', $status))
            ->with(['service:id,name', 'doctor:id,name', 'concern:id,name', 'appointment:id,lead_id', 'dispatches'])
            ->latest()->paginate(15)->withQueryString();

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
                    'status_label' => Lead::STATUSES[$l->status], 'service' => $l->service?->name, 'doctor' => $l->doctor?->name,
                    'concern' => $l->concern?->name, 'comment' => $l->comment, 'is_child' => $l->is_child,
                    'preferred_date' => $l->preferred_date?->toDateString(), 'preferred_time' => $l->preferred_time,
                    'clinic_note' => $l->clinic_note, 'created_at' => $l->created_at?->format('d.m.Y H:i'),
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
            'filters' => array_filter(['status' => $status]),
        ]);
    }

    public function update(Request $request, Lead $lead): RedirectResponse
    {
        abort_unless($lead->visibleForClinicId((int) $this->branch($request)->id), 404);

        $data = $request->validate([
            'status' => 'required|in:'.implode(',', array_keys(Lead::STATUSES)),
            'clinic_note' => 'nullable|string|max:500',
        ]);

        $changed = $lead->status !== $data['status'];
        $lead->update($data);

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

        return back()->with('success', 'Заявка взята в работу. Свяжитесь с пациентом для записи.');
    }

    public function appointment(Request $request, Lead $lead, AppointmentBookingService $booking): RedirectResponse
    {
        abort_unless((int) $lead->clinic_id === (int) $this->branch($request)->id, 404);

        $appointment = $booking->createFromLead($lead, $request->user());
        if (! $appointment) {
            return back()->with('error', 'Нельзя создать запись: нет даты или нет свободного времени.');
        }

        return redirect('/clinic-cabinet/calendar?day='.$appointment->starts_at->toDateString())
            ->with('success', 'Запись создана из заявки.');
    }
}
