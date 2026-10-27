<?php

namespace App\Http\Controllers\Cabinet;

use App\Models\CardBonusType;
use App\Models\ClinicCardBonus;
use App\Services\ClinicCardBonusService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Response;

class CardBonusController extends CabinetController
{
    public function index(Request $request, ClinicCardBonusService $bonuses): Response
    {
        $branch = $this->branch($request);

        return $this->render($request, 'Cabinet/CardBonuses', 'Бонусы на карточке', [
            'types' => $bonuses->formTypesForClinic($branch),
            'help' => 'Включайте только те предложения, которые действуют в клинике. «Запись на сегодня» показывается только при свободных слотах в календаре.',
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $branch = $this->branch($request);

        $data = $request->validate([
            'bonuses' => ['required', 'array'],
            'bonuses.*.type_id' => ['required', 'integer', Rule::exists('card_bonus_types', 'id')],
            'bonuses.*.enabled' => ['boolean'],
            'bonuses.*.short_label' => ['nullable', 'string', 'max:120'],
            'bonuses.*.description' => ['nullable', 'string', 'max:2000'],
        ]);

        $activeTypeIds = CardBonusType::query()->where('is_active', true)->pluck('id');

        foreach ($data['bonuses'] as $row) {
            if (! $activeTypeIds->contains($row['type_id'])) {
                continue;
            }

            $enabled = (bool) ($row['enabled'] ?? false);
            $short = trim((string) ($row['short_label'] ?? ''));
            $description = trim((string) ($row['description'] ?? ''));

            if ($enabled && ($short === '' || $description === '')) {
                return back()->withErrors([
                    'bonuses' => 'Для включённого бонуса заполните короткое название и описание.',
                ]);
            }

            ClinicCardBonus::query()->updateOrCreate(
                [
                    'clinic_id' => $branch->id,
                    'card_bonus_type_id' => $row['type_id'],
                ],
                [
                    'enabled' => $enabled,
                    'short_label' => $short !== '' ? $short : null,
                    'description' => $description !== '' ? $description : null,
                ],
            );
        }

        return back()->with('success', 'Настройки бонусов сохранены.');
    }
}
