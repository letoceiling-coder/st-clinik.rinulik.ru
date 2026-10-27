<?php

namespace App\Http\Controllers\Admin;

use App\Models\City;
use App\Models\Region;
use App\Services\Admin\CityImportService;
use App\Services\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class GeographyController extends AdminController
{
    public function index(): Response
    {
        return $this->render('Admin/Geography', 'География', [
            'stats' => [
                'regions' => Region::count(),
                'cities' => City::count(),
                'cities_active' => City::where('is_active', true)->count(),
            ],
            'csv_help' => 'name;slug;region;population;lat;lng;districts — районы через запятую, UTF-8, разделитель «;».',
        ]);
    }

    public function import(Request $request, CityImportService $import): RedirectResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:8192'],
        ]);

        $stats = $import->import($request->file('file'));

        Audit::log('geography.cities_imported', null, $stats, 'success');

        return back()->with('success', sprintf(
            'Импорт: городов +%d / обновлено %d, регионов +%d, районов +%d.',
            $stats['created'],
            $stats['updated'],
            $stats['regions'],
            $stats['districts'],
        ));
    }
}
