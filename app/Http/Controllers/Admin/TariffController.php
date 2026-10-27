<?php

namespace App\Http\Controllers\Admin;

use App\Models\ClinicSubscription;
use App\Models\Tariff;
use App\Services\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Response;

class TariffController extends AdminController
{
    public function index(): Response
    {
        $tariffs = Tariff::query()->orderBy('sort')->get()->map(fn (Tariff $t) => [
            'id' => $t->id,
            'name' => $t->name,
            'slug' => $t->slug,
            'description' => $t->description,
            'price' => $t->price,
            'price_rub' => $t->priceRubles(),
            'duration_days' => $t->duration_days,
            'max_branches' => $t->max_branches,
            'max_doctors' => $t->max_doctors,
            'max_photos' => $t->max_photos,
            'features' => $t->features ?? [],
            'is_active' => $t->is_active,
            'is_default' => $t->is_default,
            'sort' => $t->sort,
            'clinics_count' => ClinicSubscription::query()
                ->where('tariff_id', $t->id)
                ->where('status', ClinicSubscription::STATUS_ACTIVE)
                ->where('ends_at', '>', now())
                ->count(),
        ]);

        return $this->render('Admin/Tariffs', 'Тарифы', [
            'tariffs' => $tariffs,
            'feature_labels' => $this->featureLabels(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        if ($data['is_default'] ?? false) {
            Tariff::query()->update(['is_default' => false]);
        }

        $tariff = Tariff::query()->create($data);
        Audit::log('tariff.created', $tariff);

        return back()->with('success', 'Тариф создан.');
    }

    public function update(Request $request, Tariff $tariff): RedirectResponse
    {
        $data = $this->validated($request, $tariff);
        if ($data['is_default'] ?? false) {
            Tariff::query()->where('id', '!=', $tariff->id)->update(['is_default' => false]);
        }

        $tariff->update($data);
        Audit::log('tariff.updated', $tariff);

        return back()->with('success', 'Тариф сохранён.');
    }

    /** @return array<string, string> */
    private function featureLabels(): array
    {
        return [
            Tariff::FEATURE_ONLINE_BOOKING => 'Онлайн-запись',
            Tariff::FEATURE_STATISTICS => 'Статистика',
            Tariff::FEATURE_PROMOTIONS => 'Продвижение',
            Tariff::FEATURE_ASSISTANT_LEADS => 'Лиды ассистента',
            Tariff::FEATURE_ADVERTISING => 'Реклама',
        ];
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?Tariff $tariff = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'slug' => ['nullable', 'string', 'max:64', Rule::unique('tariffs', 'slug')->ignore($tariff?->id)],
            'description' => ['nullable', 'string', 'max:5000'],
            'price' => ['required', 'integer', 'min:0'],
            'duration_days' => ['required', 'integer', 'min:1', 'max:3650'],
            'max_branches' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'max_doctors' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'max_photos' => ['nullable', 'integer', 'min:1', 'max:100000'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string', Rule::in(array_keys($this->featureLabels()))],
            'is_active' => ['boolean'],
            'is_default' => ['boolean'],
            'sort' => ['integer', 'min:0', 'max:9999'],
        ]);

        if (blank($data['slug'] ?? null)) {
            $data['slug'] = Str::slug($data['name']);
        }

        $data['is_active'] = (bool) ($data['is_active'] ?? false);
        $data['is_default'] = (bool) ($data['is_default'] ?? false);
        $data['features'] = array_values($data['features'] ?? []);

        return $data;
    }
}
