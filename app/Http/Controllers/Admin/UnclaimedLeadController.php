<?php

namespace App\Http\Controllers\Admin;

use App\Models\City;
use App\Models\Clinic;
use App\Models\Lead;
use App\Services\Audit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

/**
 * Заявки пациентов в клиники без владельца: их некому принять в кабинете, поэтому их обрабатывает
 * оператор платформы — звонит в клинику и пациенту. Когда клиника заберёт карточку, заявки появятся у неё в кабинете.
 */
class UnclaimedLeadController extends AdminController
{
    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q'));
        $status = (string) $request->query('status', 'active');
        $cityId = $request->query('city');

        $page = Lead::query()
            ->whereHas('clinic', fn (Builder $c) => $c->ownerless())
            ->with(['clinic:id,name,slug,phone,city_id', 'clinic.city:id,name', 'service:id,name'])
            ->when($q !== '', fn (Builder $b) => $b->where(fn (Builder $w) => $w
                ->whereLike('name', "%{$q}%")
                ->orWhereLike('phone', "%{$q}%")
                ->orWhereHas('clinic', fn (Builder $c) => $c->whereLike('name', "%{$q}%"))))
            ->when($status === 'active', fn (Builder $b) => $b->whereIn('status', Lead::ACTIVE_STATUSES))
            ->when($status !== 'active' && $status !== 'all', fn (Builder $b) => $b->where('status', $status))
            ->when($cityId, fn (Builder $b, string $id) => $b->whereHas('clinic', fn (Builder $c) => $c->where('city_id', (int) $id)))
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return $this->render('Admin/UnclaimedLeads', 'Заявки без владельца', [
            'leads' => $page->through(fn (Lead $lead) => [
                'id' => $lead->id,
                'created_at' => $lead->created_at?->format('d.m.Y H:i'),
                'status' => $lead->status,
                'status_label' => Lead::STATUSES[$lead->status] ?? $lead->status,
                'name' => $lead->name,
                'phone' => $lead->phone,
                'preferred' => trim(($lead->preferred_date?->format('d.m.Y') ?? '').' '.($lead->preferred_time ?? '')) ?: null,
                'service' => $lead->service?->name,
                'comment' => $lead->comment,
                'note' => $lead->clinic_note,
                'clinic' => $lead->clinic ? [
                    'name' => $lead->clinic->name,
                    'slug' => $lead->clinic->slug,
                    'phone' => $lead->clinic->phone,
                    'city' => $lead->clinic->city?->name,
                ] : null,
            ])->toArray(),
            'statuses' => Lead::STATUSES,
            'active_count' => Lead::query()->whereHas('clinic', fn (Builder $c) => $c->ownerless())->whereIn('status', Lead::ACTIVE_STATUSES)->count(),
            'cities' => City::query()->orderBy('name')->get(['id', 'name']),
            'filters' => array_filter(['q' => $q, 'status' => $status, 'city' => $cityId]),
        ]);
    }

    public function update(Request $request, Lead $lead): RedirectResponse
    {
        abort_unless(Clinic::query()->whereKey($lead->clinic_id)->ownerless()->exists(), 404);
        $data = $request->validate([
            'status' => 'required|in:'.implode(',', array_keys(Lead::STATUSES)),
            'note' => 'nullable|string|max:500',
        ]);

        $lead->update(['status' => $data['status'], 'clinic_note' => $data['note'] ?? null]);
        $lead->markResponded();
        Audit::log('leads.unclaimed_updated', $lead, ['status' => $data['status']]);

        return back()->with('success', 'Заявка обновлена.');
    }
}
