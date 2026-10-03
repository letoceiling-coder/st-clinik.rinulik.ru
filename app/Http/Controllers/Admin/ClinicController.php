<?php

namespace App\Http\Controllers\Admin;

use App\Models\City;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Services\Audit;
use App\Services\ModerationService;
use App\Services\ProfileMetrics;
use App\Services\Seo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class ClinicController extends AdminController
{
    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q'));
        $status = $request->query('status');
        $city = $request->query('city');

        $page = Clinic::with(['city:id,name', 'organization:id,name'])
            ->when($q !== '', fn ($b) => $b->where(fn ($w) => $w->where('name', 'like', "%$q%")->orWhere('address', 'like', "%$q%")))
            ->when($status, fn ($b) => $b->where('status', $status))
            ->when($city, fn ($b) => $b->where('city_id', $city))
            ->orderByDesc('id')->paginate(20)->withQueryString();

        return $this->render('Admin/Clinics', 'Клиники', [
            'clinics' => $page->through(fn (Clinic $c) => [
                'id' => $c->id, 'name' => $c->name, 'slug' => $c->slug, 'city' => $c->city?->name, 'organization' => $c->organization?->name,
                'address' => $c->address, 'status' => $c->status, 'is_verified' => $c->is_verified, 'rating' => $c->rating,
                'reviews_count' => $c->reviews_count, 'completeness' => $c->completeness, 'moderation_note' => $c->moderation_note,
                'seo_title' => $c->seo_title, 'seo_description' => $c->seo_description,
            ])->toArray(),
            'cities' => City::orderBy('name')->get(['id', 'name']),
            'statuses' => Clinic::STATUSES,
            'filters' => array_filter(['q' => $q, 'status' => $status, 'city' => $city]),
        ]);
    }

    public function update(Request $request, Clinic $clinic, ModerationService $moderation, ProfileMetrics $metrics): RedirectResponse
    {
        $data = $request->validate([
            'status' => 'required|in:'.implode(',', Clinic::STATUSES),
            'is_verified' => 'boolean',
            'moderation_note' => 'nullable|string|max:500',
            'seo_title' => 'nullable|string|max:160',
            'seo_description' => 'nullable|string|max:400',
        ]);

        $statusChanged = $clinic->status !== $data['status'];
        if ($statusChanged && in_array($data['status'], ['published', 'rejected'], true)) {
            $moderation->decide('clinic', $clinic->id, $data['status'] === 'published' ? 'approve' : 'reject', $data['moderation_note'] ?? null);
            unset($data['status'], $data['moderation_note']);
        }

        $clinic->update($data);
        $metrics->recalcClinic($clinic);
        Audit::log('clinic.updated', $clinic, $data);
        Seo::flush();

        return back()->with('success', 'Клиника обновлена.');
    }

    public function destroy(Clinic $clinic): RedirectResponse
    {
        Audit::log('clinic.deleted', $clinic, ['name' => $clinic->name]);
        $clinic->delete();

        return back()->with('success', 'Клиника удалена.');
    }

    public function doctors(Request $request): Response
    {
        $q = trim((string) $request->query('q'));
        $status = $request->query('status');

        $page = Doctor::with('clinic:id,name')
            ->when($q !== '', fn ($b) => $b->where('name', 'like', "%$q%"))
            ->when($status, fn ($b) => $b->where('status', $status))
            ->orderByDesc('id')->paginate(20)->withQueryString();

        return $this->render('Admin/Doctors', 'Врачи', [
            'doctors' => $page->through(fn (Doctor $d) => [
                'id' => $d->id, 'name' => $d->name, 'slug' => $d->slug, 'position' => $d->position, 'clinic' => $d->clinic?->name,
                'status' => $d->status, 'is_verified' => $d->is_verified, 'rating' => $d->rating, 'moderation_note' => $d->moderation_note,
            ])->toArray(),
            'statuses' => ['pending', 'published', 'rejected', 'hidden'],
            'filters' => array_filter(['q' => $q, 'status' => $status]),
        ]);
    }

    public function updateDoctor(Request $request, Doctor $doctor, ModerationService $moderation, ProfileMetrics $metrics): RedirectResponse
    {
        $data = $request->validate([
            'status' => 'required|in:pending,published,rejected,hidden',
            'is_verified' => 'boolean',
            'moderation_note' => 'nullable|string|max:500',
        ]);

        if ($doctor->status !== $data['status'] && in_array($data['status'], ['published', 'rejected'], true)) {
            $moderation->decide('doctor', $doctor->id, $data['status'] === 'published' ? 'approve' : 'reject', $data['moderation_note'] ?? null);
            unset($data['status'], $data['moderation_note']);
        }

        $doctor->update($data);
        $metrics->recalcClinic($doctor->clinic);
        Audit::log('doctor.updated', $doctor, $data);

        return back()->with('success', 'Врач обновлён.');
    }
}
