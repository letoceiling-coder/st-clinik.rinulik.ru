<?php

namespace App\Http\Controllers\Cabinet;

use App\Models\ClinicService;
use App\Models\Service;
use App\Services\ProfileMetrics;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Response;

class PriceController extends CabinetController
{
    public function index(Request $request): Response
    {
        $branch = $this->branch($request);

        return $this->render($request, 'Cabinet/Prices', 'Услуги и прайс', [
            'prices' => ClinicService::where('clinic_id', $branch->id)->with('service.specialty:id,name')->get()
                ->sortBy(fn ($p) => $p->service->specialty?->name.$p->service->name)->values()
                ->map(fn (ClinicService $p) => [
                    'id' => $p->id, 'service_id' => $p->service_id, 'name' => $p->service->name,
                    'specialty' => $p->service->specialty?->name,
                    'price_from' => $p->price_from, 'price_to' => $p->price_to, 'is_promo' => $p->is_promo, 'note' => $p->note,
                ]),
            'services' => Service::with('specialty:id,name')->orderBy('name')->get()->map(fn ($s) => [
                'id' => $s->id, 'name' => $s->name, 'specialty' => $s->specialty?->name,
            ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $branch = $this->branch($request);
        $data = $request->validate([
            'service_id' => ['required', 'exists:services,id', Rule::unique('clinic_services')->where('clinic_id', $branch->id)],
            ...$this->rules(),
        ], ['service_id.unique' => 'Эта услуга уже есть в прайсе.', 'service_id.required' => 'Выберите услугу.']);

        $branch->clinicServices()->create($this->normalize($data));
        app(ProfileMetrics::class)->recalcClinic($branch);

        return back()->with('success', 'Услуга добавлена.');
    }

    public function update(Request $request, ClinicService $price): RedirectResponse
    {
        $this->ownedBy($request, $price);
        $data = $request->validate($this->rules());
        $price->update($this->normalize($data));
        app(ProfileMetrics::class)->recalcClinic($this->branch($request));

        return back()->with('success', 'Цена обновлена.');
    }

    public function destroy(Request $request, ClinicService $price): RedirectResponse
    {
        $this->ownedBy($request, $price);
        $price->delete();
        app(ProfileMetrics::class)->recalcClinic($this->branch($request));

        return back()->with('success', 'Услуга удалена из прайса.');
    }

    /** @return array<string,mixed> */
    private function rules(): array
    {
        return [
            'price_from' => 'required|integer|min:100|max:3000000',
            'price_to' => 'nullable|integer|gt:price_from|max:3000000',
            'is_promo' => 'boolean',
            'note' => 'nullable|string|max:120',
        ];
    }

    /** @param array<string,mixed> $data */
    private function normalize(array $data): array
    {
        $data['is_promo'] = (bool) ($data['is_promo'] ?? false);

        return $data;
    }
}
