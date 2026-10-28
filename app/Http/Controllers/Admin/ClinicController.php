<?php

namespace App\Http\Controllers\Admin;

use App\Models\City;
use App\Models\Clinic;
use App\Models\Doctor;
use App\Models\Lead;
use App\Models\Organization;
use App\Models\ParsedOrganization;
use App\Services\Audit;
use App\Services\Clinics\ClinicProfileForm;
use App\Services\Clinics\ClinicSeo;
use App\Services\ModerationService;
use App\Services\Monetization\ClinicSubscriptionService;
use App\Services\Organization\OrganizationModerationService;
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
            ->when($q !== '', fn ($b) => $b->where(fn ($w) => $w->whereLike('name', "%$q%")->orWhereLike('address', "%$q%")))
            ->when($status, fn ($b) => $b->where('status', $status))
            ->when($city, fn ($b) => $b->where('city_id', $city))
            ->orderByDesc('id')->paginate(20)->withQueryString();

        return $this->render('Admin/Clinics', 'Клиники', [
            'clinics' => $page->through(fn (Clinic $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'slug' => $c->slug,
                'city' => $c->city?->name,
                'organization' => $c->organization?->name,
                'address' => $c->address,
                'status' => $c->status,
                'is_verified' => $c->is_verified,
                'rating' => $c->rating,
                'reviews_count' => $c->reviews_count,
                'completeness' => $c->completeness,
            ])->toArray(),
            'cities' => City::orderBy('name')->get(['id', 'name']),
            'statuses' => Clinic::STATUSES,
            'filters' => array_filter(['q' => $q, 'status' => $status, 'city' => $city]),
        ]);
    }

    public function create(ClinicProfileForm $profile): Response
    {
        return $this->render('Admin/ClinicCreate', 'Новая клиника', $profile->props(null) + [
            'organizations' => Organization::query()->orderBy('name')->limit(1000)->get(['id', 'name']),
        ]);
    }

    /** Ручное добавление клиники администратором: черновик или сразу на сайт. */
    public function store(Request $request, ClinicProfileForm $profile, ProfileMetrics $metrics, ModerationService $moderation): RedirectResponse
    {
        $data = $profile->validate($request, phoneRequired: false);
        $extra = $request->validate([
            'organization_id' => ['nullable', 'integer', 'exists:organizations,id'],
            'publish' => ['boolean'],
        ]);

        $clinic = new Clinic($profile->attributes($data));
        $clinic->organization_id = $extra['organization_id'] ?? Organization::create([
            'owner_id' => null,
            'name' => $data['name'],
            'status' => 'active',
        ])->id;
        $clinic->slug = $profile->uniqueSlug($data['name']);
        $clinic->status = 'draft';
        $clinic->art_seed = random_int(1, 12);
        $clinic->rating = 0;
        $clinic->reviews_count = 0;
        $clinic->save();
        $clinic->specialties()->sync($data['specialty_ids'] ?? []);
        app(ClinicSubscriptionService::class)->assignDefaultIfNeeded($clinic);

        if ($extra['publish'] ?? false) {
            $moderation->decide('clinic', $clinic->id, 'approve', null);
            $clinic->refresh();
            if (in_array($clinic->status, ['approved', 'hidden'], true)) {
                $moderation->publishClinic($clinic);
            }
        }

        $metrics->recalcClinic($clinic->refresh());
        Audit::log('clinic.created_by_admin', $clinic, ['name' => $clinic->name]);
        Seo::flush();

        return redirect()->route('admin.clinics.show', $clinic)->with('success', 'Клиника «'.$clinic->name.'» добавлена. Заполните фото, цены и врачей в карточке.');
    }

    public function show(Clinic $clinic, ClinicProfileForm $profile, ClinicSeo $seo): Response
    {
        $clinic->load(['city:id,name,slug', 'district:id,name', 'organization:id,name,status,owner_id', 'organization.owner:id,name,email']);
        $parsed = ParsedOrganization::query()->where('clinic_id', $clinic->id)->first(['id', 'name', 'external_id', 'imported_at']);

        return $this->render('Admin/ClinicShow', $clinic->name, $profile->props($clinic) + [
            'clinic' => [
                'id' => $clinic->id,
                'name' => $clinic->name,
                'slug' => $clinic->slug,
                'city' => $clinic->city?->name,
                'district' => $clinic->district?->name,
                'organization' => $clinic->organization?->name,
                'organization_id' => $clinic->organization_id,
                'organization_status' => $clinic->organization?->status,
                'owner' => $clinic->organization?->owner ? ['name' => $clinic->organization->owner->name, 'email' => $clinic->organization->owner->email] : null,
                'address' => $clinic->address,
                'phone' => $clinic->phone,
                'email' => $clinic->email,
                'website' => $clinic->website,
                'status' => $clinic->status,
                'is_verified' => $clinic->is_verified,
                'rating' => $clinic->rating,
                'reviews_count' => $clinic->reviews_count,
                'completeness' => $clinic->completeness,
                'moderation_note' => $clinic->moderation_note,
                'seo_title' => $clinic->seo_title,
                'seo_description' => $clinic->seo_description,
                'created_at' => $clinic->created_at?->toIso8601String(),
                'updated_at' => $clinic->updated_at?->toIso8601String(),
                'stats' => [
                    'doctors' => $clinic->doctors()->count(),
                    'services' => $clinic->clinicServices()->count(),
                    'photos' => $clinic->photos()->count(),
                    'leads' => Lead::query()->where('clinic_id', $clinic->id)->count(),
                    'min_price' => $clinic->min_price,
                ],
                'schedule' => $clinic->schedule,
                'is_24_7' => (bool) $clinic->is_24_7,
                'parsed' => $parsed ? ['id' => $parsed->id, 'source_url' => 'https://yandex.ru/maps/org/'.$parsed->external_id.'/', 'imported_at' => $parsed->imported_at?->toIso8601String()] : null,
            ],
            'seoAuto' => $seo->auto($clinic),
            'statuses' => Clinic::STATUSES,
        ]);
    }

    /** Полное редактирование профиля клиники администратором. */
    public function updateProfile(Request $request, Clinic $clinic, ClinicProfileForm $profile, ProfileMetrics $metrics): RedirectResponse
    {
        $data = $profile->validate($request, phoneRequired: false);

        $clinic->update($profile->attributes($data));
        $clinic->specialties()->sync($data['specialty_ids'] ?? []);
        $metrics->recalcClinic($clinic);
        Audit::log('clinic.profile_updated_by_admin', $clinic);
        Seo::flush();

        return back()->with('success', 'Профиль клиники сохранён.');
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
        if ($statusChanged) {
            $note = $data['moderation_note'] ?? null;
            if ($data['status'] === 'rejected' && in_array($clinic->status, ['pending', 'draft'], true)) {
                $moderation->decide('clinic', $clinic->id, 'reject', $note);
                unset($data['status'], $data['moderation_note']);
            } elseif ($data['status'] === 'approved' && in_array($clinic->status, ['pending', 'draft'], true)) {
                $moderation->decide('clinic', $clinic->id, 'approve', $note);
                unset($data['status'], $data['moderation_note']);
            } elseif ($data['status'] === 'published') {
                if (in_array($clinic->status, ['pending', 'draft'], true)) {
                    $moderation->decide('clinic', $clinic->id, 'approve', $note);
                    $clinic->refresh();
                }
                if (in_array($clinic->status, ['approved', 'hidden'], true)) {
                    $moderation->publishClinic($clinic);
                }
                unset($data['status'], $data['moderation_note']);
            }
        }

        $wasBlocked = $clinic->status === 'blocked';
        $clinic->update($data);
        $metrics->recalcClinic($clinic);

        if (! $wasBlocked && $clinic->status === 'blocked') {
            app(OrganizationModerationService::class)->notifyClinicBlocked($clinic, $data['moderation_note'] ?? null);
        }

        Audit::log('clinic.updated', $clinic, $data);
        Seo::flush();

        return back()->with('success', 'Клиника обновлена.');
    }

    public function blockOrganization(Request $request, Clinic $clinic, OrganizationModerationService $moderation): RedirectResponse
    {
        abort_unless($clinic->organization_id, 404);
        $data = $request->validate(['note' => ['nullable', 'string', 'max:500']]);
        $moderation->block($clinic->organization, $data['note'] ?? null);

        return back()->with('success', 'Организация и её филиалы заблокированы.');
    }

    public function unblockOrganization(Clinic $clinic, OrganizationModerationService $moderation): RedirectResponse
    {
        abort_unless($clinic->organization_id, 404);
        $moderation->unblock($clinic->organization);

        return back()->with('success', 'Блокировка организации снята.');
    }

    public function destroy(Clinic $clinic): RedirectResponse
    {
        Audit::log('clinic.deleted', $clinic, ['name' => $clinic->name]);
        $clinic->delete();

        return redirect()->route('admin.clinics')->with('success', 'Клиника удалена.');
    }

    public function doctors(Request $request): Response
    {
        $q = trim((string) $request->query('q'));
        $status = $request->query('status');

        $page = Doctor::with('clinic:id,name')
            ->when($q !== '', fn ($b) => $b->whereLike('name', "%$q%"))
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
