<?php

namespace App\Http\Controllers\Cabinet;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class OrganizationController extends CabinetController
{
    public function edit(Request $request): Response
    {
        $org = $request->attributes->get('org');

        return $this->render($request, 'Cabinet/Organization', 'Организация', [
            'organization' => $org->only([
                'id', 'name', 'legal_name', 'inn', 'ogrn', 'kpp', 'legal_address',
                'license_number', 'license_issuer', 'license_date',
            ]),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $org = $request->attributes->get('org');

        $data = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:160'],
            'legal_name' => ['nullable', 'string', 'max:200'],
            'inn' => ['nullable', 'string', 'max:12'],
            'ogrn' => ['nullable', 'string', 'max:15'],
            'kpp' => ['nullable', 'string', 'max:9'],
            'legal_address' => ['nullable', 'string', 'max:300'],
            'license_number' => ['nullable', 'string', 'max:80'],
            'license_issuer' => ['nullable', 'string', 'max:160'],
            'license_date' => ['nullable', 'date'],
        ]);

        $org->update($data);

        return back()->with('success', 'Данные организации сохранены.');
    }
}
