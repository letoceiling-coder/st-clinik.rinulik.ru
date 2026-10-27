<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\ClinicCardDisplaySettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClinicCardAppearanceController extends Controller
{
    public function index(ClinicCardDisplaySettings $settings): Response
    {
        $variants = collect($settings->premiumVariants())->map(fn (array $meta, string $id) => [
            'id' => $id,
            'label' => $meta['label'],
            'description' => $meta['description'],
            'class' => $meta['class'],
        ])->values();

        return Inertia::render('Admin/ClinicCardAppearance', [
            'variant' => $settings->premiumVariant(),
            'variants' => $variants,
        ]);
    }

    public function update(Request $request, ClinicCardDisplaySettings $settings): RedirectResponse
    {
        $keys = array_keys($settings->premiumVariants());

        $data = $request->validate([
            'variant' => ['required', 'string', 'in:'.implode(',', $keys)],
        ]);

        $settings->setPremiumVariant($data['variant']);

        return back()->with('success', 'Стиль премиальных карточек сохранён.');
    }
}
