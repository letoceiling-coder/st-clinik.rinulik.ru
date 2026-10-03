<?php

namespace App\Http\Controllers\Cabinet;

use App\Models\Lead;
use App\Models\UserNotification;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class LeadController extends CabinetController
{
    public function index(Request $request): Response
    {
        $branch = $this->branch($request);
        $status = $request->query('status');

        $page = Lead::where('clinic_id', $branch->id)
            ->when($status && isset(Lead::STATUSES[$status]), fn ($q) => $q->where('status', $status))
            ->with(['service:id,name', 'doctor:id,name', 'concern:id,name'])
            ->latest()->paginate(15)->withQueryString();

        return $this->render($request, 'Cabinet/Leads', 'Заявки', [
            'leads' => $page->through(fn (Lead $l) => [
                'id' => $l->id, 'name' => $l->name, 'phone' => $l->phone, 'status' => $l->status,
                'status_label' => Lead::STATUSES[$l->status], 'service' => $l->service?->name, 'doctor' => $l->doctor?->name,
                'concern' => $l->concern?->name, 'comment' => $l->comment, 'is_child' => $l->is_child,
                'preferred_date' => $l->preferred_date?->toDateString(), 'preferred_time' => $l->preferred_time,
                'clinic_note' => $l->clinic_note, 'created_at' => $l->created_at?->format('d.m.Y H:i'),
            ])->toArray(),
            'statuses' => Lead::STATUSES,
            'filters' => array_filter(['status' => $status]),
        ]);
    }

    public function update(Request $request, Lead $lead): RedirectResponse
    {
        abort_unless((int) $lead->clinic_id === (int) $this->branch($request)->id, 404);

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
}
