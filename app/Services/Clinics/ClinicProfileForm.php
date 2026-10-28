<?php

namespace App\Services\Clinics;

use App\Models\City;
use App\Models\Clinic;
use App\Models\ClinicPropertyType;
use App\Models\District;
use App\Models\Specialty;
use App\Rules\RussianPhone;
use App\Support\Text;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Профиль клиники: общая форма для кабинета владельца и админ-панели — одни и те же поля, правила и подготовка данных.
 */
class ClinicProfileForm
{
    public const PAYMENTS = ['Наличные', 'Банковская карта', 'СБП', 'Рассрочка', 'ДМС', 'Безналичный расчёт'];

    /** Поля профиля, которые редактирует форма (кроме свойств-флагов и направлений). */
    private const FIELDS = [
        'id', 'name', 'tagline', 'description', 'address', 'metro', 'lat', 'lng', 'phone', 'email', 'website', 'founded_year',
        'city_id', 'district_id', 'license_number', 'license_issuer', 'restrictions', 'payment_methods', 'achievements',
        'accepts_children', 'children_age_from', 'installment_months', 'status', 'moderation_note',
    ];

    /**
     * Данные для страницы формы: значения клиники и справочники.
     *
     * @return array<string, mixed>
     */
    public function props(?Clinic $clinic): array
    {
        $propertyTypes = ClinicPropertyType::forCabinet();
        $propertyColumns = $propertyTypes->pluck('db_column')->all();

        return [
            'branchForm' => $clinic ? array_merge($clinic->only(array_merge(self::FIELDS, $propertyColumns)), [
                'license_date' => $clinic->license_date?->toDateString(),
                'specialty_ids' => $clinic->specialties()->pluck('specialties.id'),
            ]) : null,
            'cities' => City::orderBy('name')->get(['id', 'name']),
            'districts' => District::orderBy('name')->get(['id', 'city_id', 'name']),
            'specialties' => Specialty::orderBy('name')->get(['id', 'name']),
            // Стандартные способы и те, что уже есть у клиники (например, взятые из карточки на Яндекс Картах).
            'payments' => array_values(array_unique(array_merge(self::PAYMENTS, array_filter((array) ($clinic?->payment_methods ?? []), 'is_string')))),
            'propertyTypes' => $propertyTypes->map(fn ($p) => [
                'slug' => $p->slug,
                'name' => $p->name,
                'group' => $p->group,
                'column' => $p->db_column,
            ])->values(),
        ];
    }

    /**
     * @param  bool  $phoneRequired  В кабинете телефон обязателен; админ может завести клинику из открытых данных без телефона.
     * @return array<string, mixed>
     */
    public function validate(Request $request, bool $phoneRequired = true): array
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
            'phone' => [$phoneRequired ? 'required' : 'nullable', 'string', 'max:32', new RussianPhone],
            'email' => 'nullable|email|max:120',
            'website' => 'nullable|url|max:160',
            'founded_year' => 'nullable|integer|between:1900,'.date('Y'),
            'license_number' => 'nullable|string|max:80',
            'license_issuer' => 'nullable|string|max:160',
            'license_date' => 'nullable|date|before_or_equal:today',
            'restrictions' => 'nullable|string|max:1000',
            'payment_methods' => 'nullable|array|max:20',
            'payment_methods.*' => 'string|max:80',
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
            'name.required' => 'Укажите название клиники.', 'address.required' => 'Укажите адрес.',
            'phone.required' => 'Укажите телефон.', 'phone.regex' => 'Введите телефон в формате +7 (900) 000-00-00.',
            'city_id.required' => 'Выберите город.',
        ]);
    }

    /**
     * Значения для сохранения в модель: без направлений, с нормализованными списками и флагами.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function attributes(array $data): array
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

    public function uniqueSlug(string $name): string
    {
        $base = Str::limit(Text::slug($name) ?: 'clinic', 110, '');
        $slug = $base;
        $i = 2;
        while (Clinic::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }
}
