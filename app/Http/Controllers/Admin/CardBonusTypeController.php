<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CardBonusType;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CardBonusTypeController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/CardBonuses', [
            'types' => CardBonusType::query()->orderBy('sort')->get()->map(fn (CardBonusType $t) => [
                'id' => $t->id,
                'code' => $t->code,
                'name' => $t->name,
                'default_short_label' => $t->default_short_label,
                'placement' => $t->placement,
                'is_active' => $t->is_active,
                'triggers_premium' => $t->triggers_premium,
                'requires_calendar' => $t->requires_calendar,
                'sort' => $t->sort,
            ]),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'types' => ['required', 'array'],
            'types.*.id' => ['required', 'integer', 'exists:card_bonus_types,id'],
            'types.*.is_active' => ['boolean'],
            'types.*.triggers_premium' => ['boolean'],
        ]);

        foreach ($data['types'] as $row) {
            CardBonusType::query()->whereKey($row['id'])->update([
                'is_active' => (bool) ($row['is_active'] ?? false),
                'triggers_premium' => (bool) ($row['triggers_premium'] ?? false),
            ]);
        }

        return back()->with('success', 'Справочник бонусов обновлён.');
    }
}
