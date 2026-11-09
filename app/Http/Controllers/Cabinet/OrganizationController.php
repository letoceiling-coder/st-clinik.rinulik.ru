<?php

namespace App\Http\Controllers\Cabinet;

use App\Services\Audit;
use App\Services\ContentRevisionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class OrganizationController extends CabinetController
{
    private const FIELDS = [
        'id', 'name', 'legal_name', 'inn', 'ogrn', 'kpp', 'legal_address',
        'license_number', 'license_issuer', 'license_date',
    ];

    public function edit(Request $request, ContentRevisionService $revisions): Response
    {
        $org = $request->attributes->get('org');
        $values = $org->only(self::FIELDS);
        $values['license_date'] = $org->license_date?->toDateString();

        return $this->render($request, 'Cabinet/Organization', 'Организация', [
            'organization' => $revisions->overlay($org, $values),
            'pendingRevision' => $revisions->pendingSummary($org),
        ]);
    }

    public function update(Request $request, ContentRevisionService $revisions): RedirectResponse
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

        // Реквизиты организации с одобренными филиалами меняются только после проверки модератором.
        if ($revisions->requiresModeration($org)) {
            $revision = $revisions->propose($org, 'organization', $data, $request->user());
            Audit::log('organization.update_proposed', $org);

            return back()->with('success', $revision
                ? 'Изменения реквизитов отправлены на модерацию. До проверки действуют прежние данные.'
                : 'Изменений нет.');
        }

        $org->update($data);

        return back()->with('success', 'Данные организации сохранены.');
    }
}
