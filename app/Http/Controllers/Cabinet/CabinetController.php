<?php

namespace App\Http\Controllers\Cabinet;

use App\Http\Controllers\Controller;
use App\Models\Clinic;
use App\Models\Organization;
use App\Models\User;
use App\Services\Organization\CabinetAuthorization;
use App\Services\ProfileMetrics;
use App\Services\Seo;
use Illuminate\Http\Request;
use Inertia\Response;

/** Базовый контроллер кабинета клиники: филиал выбирается middleware `clinic.owner`. */
abstract class CabinetController extends Controller
{
    protected function branch(Request $request): Clinic
    {
        $branch = $request->attributes->get('branch');
        abort_unless($branch, 404, 'Сначала добавьте филиал.');

        return $branch;
    }

    /** @param array<string,mixed> $props */
    protected function render(Request $request, string $component, string $title, array $props = []): Response
    {
        $branch = $request->attributes->get('branch');
        $metrics = app(ProfileMetrics::class);

        return $this->page($component, $props + [
            'cabinet' => [
                'organization' => ['name' => $request->attributes->get('org')->name],
                'branches' => $request->attributes->get('branches')->map(fn ($b) => [
                    'id' => $b->id, 'name' => $b->name, 'address' => $b->address, 'status' => $b->status,
                ])->values(),
                'branch' => $branch ? [
                    'id' => $branch->id, 'name' => $branch->name, 'status' => $branch->status, 'slug' => $branch->slug,
                    'completeness' => $metrics->completeness($branch)['percent'],
                ] : null,
                'abilities' => $this->grantedAbilities($request),
            ],
        ], app(Seo::class)->private($title));
    }

    /** Право текущего сотрудника; в демо-режиме доступ к разделам ограничивает сама демо-ссылка. */
    protected function can(Request $request, string $ability): bool
    {
        if ($request->attributes->get('demo_link') !== null) {
            return true;
        }
        $user = $request->user();
        $org = $request->attributes->get('org');

        return $user instanceof User && $org instanceof Organization
            && app(CabinetAuthorization::class)->allows($user, $org, $ability);
    }

    /** @return list<string>|null */
    private function grantedAbilities(Request $request): ?array
    {
        $user = $request->user();
        $org = $request->attributes->get('org');
        if ($request->attributes->get('demo_link') !== null || ! $user instanceof User || ! $org instanceof Organization) {
            return null;
        }

        return app(CabinetAuthorization::class)->grantedAbilities($user, $org);
    }

    protected function ownedBy(Request $request, $model): void
    {
        abort_unless((int) $model->clinic_id === (int) $this->branch($request)->id, 404);
    }
}
