<?php

namespace App\Http\Controllers\Cabinet;

use App\Models\City;
use App\Models\Clinic;
use App\Models\ClinicPropertyType;
use App\Models\District;
use App\Models\Specialty;
use App\Services\Audit;
use App\Services\ProfileMetrics;
use App\Support\Schedule;
use App\Support\Text;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Response;

class BranchController extends CabinetController
{
    public const PAYMENTS = ['Наличные', 'Банковская карта', 'СБП', 'Рассрочка', 'ДМС', 'Безналичный расчёт'];

    public function index(Request $request, ProfileMetrics $metrics): Response
    {
        $branches = $request->attributes->get('branches');

        return $this->render($request, 'Cabinet/Branches', 'Филиалы', [
            'branches' => $branches->map(fn (Clinic $b) => [
                'id' => $b->id, 'name' => $b->name, 'slug' => $b->slug, 'address' => $b->address, 'status' => $b->status,
                'moderation_note' => $b->moderation_note, 'completeness' => $metrics->completeness($b)['percent'],
                'rating' => $b->rating, 'reviews_count' => $b->reviews_count, 'city' => $b->city?->name,
            ])->values(),
        ]);
    }

    public function create(Request $request): Response
    {
        return $this->form($request, null);
    }

    public function edit(Request $request, Clinic $clinic): Response
    {
        $this->authorizeBranch($request, $clinic);

        return $this->form($request, $clinic);
    }

    private function form(Request $request, ?Clinic $clinic): Response
    {
        $propertyTypes = ClinicPropertyType::forCabinet();
        $propertyColumns = $propertyTypes->pluck('db_column')->all();

        return $this->render($request, 'Cabinet/BranchForm', $clinic ? 'Редактирование филиала' : 'Новый филиал', [
            'branchForm' => $clinic ? array_merge($clinic->only(array_merge([
                'id', 'name', 'tagline', 'description', 'address', 'metro', 'lat', 'lng', 'phone', 'email', 'website', 'founded_year',
                'city_id', 'district_id', 'license_number', 'license_issuer', 'restrictions', 'payment_methods', 'achievements',
                'accepts_children', 'children_age_from', 'installment_months', 'status', 'moderation_note',
            ], $propertyColumns)), [
                'license_date' => $clinic->license_date?->toDateString(),
                'specialty_ids' => $clinic->specialties()->pluck('specialties.id'),
            ]) : null,
            'cities' => City::orderBy('name')->get(['id', 'name']),
            'districts' => District::orderBy('name')->get(['id', 'city_id', 'name']),
            'specialties' => Specialty::orderBy('name')->get(['id', 'name']),
            'payments' => self::PAYMENTS,
            'propertyTypes' => $propertyTypes->map(fn ($p) => [
                'slug' => $p->slug,
                'name' => $p->name,
                'group' => $p->group,
                'column' => $p->db_column,
            ])->values(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $org = $request->attributes->get('org');
        $data = $this->validated($request);

        $clinic = new Clinic($this->fields($data));
        $clinic->organization_id = $org->id;
        $clinic->slug = $this->uniqueSlug($data['name'], (int) $data['city_id']);
        $clinic->status = 'draft';
        $clinic->art_seed = random_int(1, 12);
        $clinic->save();
        $clinic->specialties()->sync($data['specialty_ids'] ?? []);
        app(ProfileMetrics::class)->recalcClinic($clinic);

        Audit::log('branch.created', $clinic);
        $request->session()->put('cabinet_branch', $clinic->id);

        return redirect()->route('cabinet.branches')->with('success', 'Филиал создан как черновик. Заполните профиль и отправьте на модерацию.');
    }

    public function update(Request $request, Clinic $clinic): RedirectResponse
    {
        $this->authorizeBranch($request, $clinic);
        $data = $this->validated($request);

        $clinic->update($this->fields($data));
        $clinic->specialties()->sync($data['specialty_ids'] ?? []);
        if ($clinic->status === 'rejected') {
            $clinic->update(['status' => 'draft']);
        }
        app(ProfileMetrics::class)->recalcClinic($clinic);
        Audit::log('branch.updated', $clinic);

        return back()->with('success', 'Изменения сохранены.');
    }

    public function submit(Request $request, Clinic $clinic, ProfileMetrics $metrics): RedirectResponse
    {
        $this->authorizeBranch($request, $clinic);
        abort_unless(in_array($clinic->status, ['draft', 'rejected'], true), 422);

        if ($metrics->completeness($clinic)['percent'] < 40) {
            return back()->with('error', 'Заполните профиль минимум на 40%, чтобы отправить его на модерацию.');
        }

        $clinic->update(['status' => 'pending', 'moderation_note' => null]);
        Audit::log('branch.submitted', $clinic);

        return back()->with('success', 'Филиал отправлен на модерацию. Обычно проверка занимает до 2 рабочих дней.');
    }

    // --- график ---------------------------------------------------------

    public function schedule(Request $request): Response
    {
        $branch = $this->branch($request);
        $schedule = $branch->schedule ?? [];

        return $this->render($request, 'Cabinet/Schedule', 'График работы', [
            'days' => collect(Schedule::DAYS)->map(fn ($label, $key) => [
                'key' => $key, 'label' => $label,
                'open' => $schedule[$key]['open'] ?? null, 'close' => $schedule[$key]['close'] ?? null,
                'enabled' => isset($schedule[$key]),
            ])->values(),
            'is_24_7' => $branch->is_24_7,
            'same_day' => $branch->same_day,
        ]);
    }

    public function updateSchedule(Request $request): RedirectResponse
    {
        $branch = $this->branch($request);
        $data = $request->validate([
            'is_24_7' => 'boolean',
            'same_day' => 'boolean',
            'days' => 'required|array',
            'days.*.enabled' => 'boolean',
            'days.*.open' => ['nullable', 'regex:/^([01]\d|2[0-3]):[0-5]\d$/'],
            'days.*.close' => ['nullable', 'regex:/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/'],
        ], ['days.*.open.regex' => 'Время — в формате ЧЧ:ММ.', 'days.*.close.regex' => 'Время — в формате ЧЧ:ММ.']);

        $schedule = [];
        foreach (array_keys(Schedule::DAYS) as $key) {
            $d = $data['days'][$key] ?? [];
            if (! empty($data['is_24_7'])) {
                $schedule[$key] = ['open' => '00:00', 'close' => '24:00'];
            } elseif (! empty($d['enabled'])) {
                if (empty($d['open']) || empty($d['close']) || $d['open'] >= $d['close']) {
                    return back()->withErrors(["days.$key.open" => 'Укажите корректное время: открытие раньше закрытия.']);
                }
                $schedule[$key] = ['open' => $d['open'], 'close' => $d['close']];
            }
        }

        $branch->update(['schedule' => $schedule ?: null, 'is_24_7' => (bool) ($data['is_24_7'] ?? false), 'same_day' => (bool) ($data['same_day'] ?? false)]);
        app(ProfileMetrics::class)->recalcClinic($branch);

        return back()->with('success', 'График сохранён.');
    }

    // --------------------------------------------------------------------

    private function authorizeBranch(Request $request, Clinic $clinic): void
    {
        abort_unless($request->attributes->get('branches')->contains('id', $clinic->id), 404);
        $request->session()->put('cabinet_branch', $clinic->id);
        $request->attributes->set('branch', $clinic);
    }

    /** @return array<string,mixed> */
    private function validated(Request $request): array
    {
        $rules = [
            'name' => 'required|string|min:3|max:120',
            'tagline' => 'nullable|string|max:160',
            'description' => 'nullable|string|max:3000',
            'city_id' => 'required|exists:cities,id',
            'district_id' => 'nullable|exists:districts,id',
            'address' => 'required|string|max:200',
            'metro' => 'nullable|string|max:80',
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
            'phone' => ['required', 'string', 'regex:/^\+?[0-9\s\-\(\)]{10,18}$/'],
            'email' => 'nullable|email|max:120',
            'website' => 'nullable|url|max:160',
            'founded_year' => 'nullable|integer|between:1900,'.date('Y'),
            'license_number' => 'nullable|string|max:80',
            'license_issuer' => 'nullable|string|max:160',
            'license_date' => 'nullable|date|before_or_equal:today',
            'restrictions' => 'nullable|string|max:1000',
            'payment_methods' => 'nullable|array',
            'payment_methods.*' => 'string|in:'.implode(',', self::PAYMENTS),
            'achievements' => 'nullable|array|max:12',
            'achievements.*' => 'string|max:160',
            'accepts_children' => 'boolean',
            'children_age_from' => 'nullable|integer|between:0,17',
            'installment_months' => 'nullable|integer|between:3,36',
            'specialty_ids' => 'nullable|array',
            'specialty_ids.*' => 'exists:specialties,id',
        ];

        foreach (ClinicPropertyType::forCabinet() as $type) {
            $rules[$type->db_column] = 'boolean';
        }

        return $request->validate($rules, [
            'name.required' => 'Укажите название филиала.', 'address.required' => 'Укажите адрес.',
            'phone.required' => 'Укажите телефон.', 'phone.regex' => 'Введите телефон в формате +7 (900) 000-00-00.',
            'city_id.required' => 'Выберите город.',
        ]);
    }

    /** @param array<string,mixed> $data */
    private function fields(array $data): array
    {
        unset($data['specialty_ids']);
        $data['achievements'] = array_values(array_filter($data['achievements'] ?? [], fn ($v) => filled($v))) ?: null;
        $data['payment_methods'] = array_values($data['payment_methods'] ?? []) ?: null;
        if (empty($data['accepts_children'])) {
            $data['children_age_from'] = null;
        }
        if (empty($data['has_installment'])) {
            $data['installment_months'] = null;
        }

        foreach (ClinicPropertyType::forCabinet() as $type) {
            $data[$type->db_column] = (bool) ($data[$type->db_column] ?? false);
        }

        return $data;
    }

    private function uniqueSlug(string $name, int $cityId): string
    {
        $base = Text::slug($name) ?: 'clinic';
        $slug = $base;
        $i = 2;
        while (Clinic::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return Str::limit($slug, 120, '');
    }
}
