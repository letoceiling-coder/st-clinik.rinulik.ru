<?php

namespace App\Http\Controllers\Admin;

use App\Services\Audit;
use App\Services\IntegrationSettings;
use App\Services\PublicDisplaySettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class SiteDisplayController extends AdminController
{
    public function index(PublicDisplaySettings $display, IntegrationSettings $integrations): Response
    {
        return $this->render('Admin/SiteDisplay', 'Сайт: карта и реклама', [
            'display_settings' => $display->all(),
            'yandex_maps_configured' => filled($integrations->valueForConfigPath('services.yandex.maps_api_key')),
        ]);
    }

    public function update(Request $request, PublicDisplaySettings $display): RedirectResponse
    {
        $data = $request->validate([
            'home_map_enabled' => ['required', 'boolean'],
            'ads_enabled' => ['required', 'boolean'],
        ]);

        $display->save([
            'home_map_enabled' => (bool) $data['home_map_enabled'],
            'ads_enabled' => (bool) $data['ads_enabled'],
        ]);

        Audit::log('site_display.updated', null, $data, 'success');

        return back()->with('success', 'Настройки отображения сохранены.');
    }
}
