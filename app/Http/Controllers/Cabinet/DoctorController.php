<?php

namespace App\Http\Controllers\Cabinet;

use App\Models\Doctor;
use App\Models\Specialty;
use App\Services\Audit;
use App\Services\ProfileMetrics;
use App\Support\Schedule;
use App\Support\Text;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class DoctorController extends CabinetController
{
    public function index(Request $request): Response
    {
        $branch = $this->branch($request);

        return $this->render($request, 'Cabinet/Doctors', 'Врачи', [
            'doctors' => Doctor::where('clinic_id', $branch->id)->with('specialties:id,name')->orderBy('name')->get()->map(fn (Doctor $d) => [
                'id' => $d->id, 'name' => $d->name, 'position' => $d->position, 'experience_years' => $d->experience_years,
                'status' => $d->status, 'moderation_note' => $d->moderation_note, 'rating' => $d->rating, 'reviews_count' => $d->reviews_count,
                'specialties' => $d->specialties->pluck('name'), 'slug' => $d->slug,
            ]),
        ]);
    }

    public function create(Request $request): Response
    {
        return $this->form($request, null);
    }

    public function edit(Request $request, Doctor $doctor): Response
    {
        $this->ownedBy($request, $doctor);

        return $this->form($request, $doctor);
    }

    private function form(Request $request, ?Doctor $doctor): Response
    {
        return $this->render($request, 'Cabinet/DoctorForm', $doctor ? 'Редактирование врача' : 'Новый врач', [
            'doctorForm' => $doctor ? array_merge($doctor->only([
                'id', 'name', 'position', 'experience_years', 'bio', 'education', 'achievements', 'schedule_days',
                'accepts_children', 'children_age_from', 'consult_price', 'status', 'moderation_note',
            ]), ['specialty_ids' => $doctor->specialties()->pluck('specialties.id')]) : null,
            'specialties' => Specialty::orderBy('name')->get(['id', 'name']),
            'weekdays' => Schedule::DAYS,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $branch = $this->branch($request);
        $data = $this->validated($request);

        $doctor = new Doctor($this->fields($data));
        $doctor->clinic_id = $branch->id;
        $doctor->slug = $this->uniqueSlug($data['name']);
        $doctor->status = 'pending';
        $doctor->art_seed = random_int(1, 12);
        $doctor->save();
        $doctor->specialties()->sync($data['specialty_ids']);
        app(ProfileMetrics::class)->recalcClinic($branch);
        Audit::log('doctor.created', $doctor);

        return redirect()->route('cabinet.doctors')->with('success', 'Врач добавлен и отправлен на модерацию.');
    }

    public function update(Request $request, Doctor $doctor): RedirectResponse
    {
        $this->ownedBy($request, $doctor);
        $data = $this->validated($request);

        $doctor->update($this->fields($data));
        $doctor->specialties()->sync($data['specialty_ids']);
        if ($doctor->status === 'rejected') {
            $doctor->update(['status' => 'pending', 'moderation_note' => null]);
        }
        app(ProfileMetrics::class)->recalcClinic($this->branch($request));
        Audit::log('doctor.updated', $doctor);

        return back()->with('success', 'Данные врача сохранены.');
    }

    public function destroy(Request $request, Doctor $doctor): RedirectResponse
    {
        $this->ownedBy($request, $doctor);
        Audit::log('doctor.deleted', $doctor, ['name' => $doctor->name]);
        $doctor->delete();
        app(ProfileMetrics::class)->recalcClinic($this->branch($request));

        return redirect()->route('cabinet.doctors')->with('success', 'Врач удалён.');
    }

    /** @return array<string,mixed> */
    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|min:5|max:120',
            'position' => 'required|string|max:120',
            'experience_years' => 'required|integer|between:0,60',
            'bio' => 'nullable|string|max:2000',
            'education' => 'nullable|array|max:8',
            'education.*' => 'string|max:200',
            'achievements' => 'nullable|array|max:8',
            'achievements.*' => 'string|max:200',
            'schedule_days' => 'nullable|array',
            'schedule_days.*' => 'in:'.implode(',', array_keys(Schedule::DAYS)),
            'accepts_children' => 'boolean',
            'children_age_from' => 'nullable|integer|between:0,17',
            'consult_price' => 'nullable|integer|between:0,100000',
            'specialty_ids' => 'required|array|min:1',
            'specialty_ids.*' => 'exists:specialties,id',
        ], [
            'name.required' => 'Укажите ФИО врача.', 'name.min' => 'Укажите ФИО полностью.',
            'position.required' => 'Укажите должность.', 'experience_years.required' => 'Укажите стаж.',
            'specialty_ids.required' => 'Выберите хотя бы одну специализацию.', 'specialty_ids.min' => 'Выберите хотя бы одну специализацию.',
        ]);
    }

    /** @param array<string,mixed> $data */
    private function fields(array $data): array
    {
        unset($data['specialty_ids']);
        foreach (['education', 'achievements', 'schedule_days'] as $k) {
            $data[$k] = array_values(array_filter($data[$k] ?? [], fn ($v) => filled($v))) ?: null;
        }
        if (empty($data['accepts_children'])) {
            $data['children_age_from'] = null;
        }

        return $data;
    }

    private function uniqueSlug(string $name): string
    {
        $base = Text::slug($name) ?: 'doctor';
        $slug = $base;
        $i = 2;
        while (Doctor::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
