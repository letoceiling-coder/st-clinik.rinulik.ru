<?php

namespace App\Http\Middleware;

use App\Models\UserCollection;
use App\Repositories\Contracts\CatalogRepository;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /** @return array<string,mixed> */
    public function share(Request $request): array
    {
        $user = $request->user();
        $city = app()->bound('currentCity') ? app('currentCity') : null;
        $catalog = app(CatalogRepository::class);

        $demoMode = $request->session()->get('demo_mode');
        $demoPersona = is_string($demoMode) ? config("demo.personas.{$demoMode}") : null;

        return [
            ...parent::share($request),
            'app' => [
                'name' => config('app.name'),
                'noindex' => (bool) config('app.noindex'),
                'consent_version' => '2026-10',
                'yandex_maps_key' => config('services.yandex.maps_api_key'),
            ],
            'demo' => is_array($demoPersona) ? [
                'mode' => $demoMode,
                'label' => $demoPersona['label'] ?? 'Демо-режим',
            ] : null,
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'is_admin' => $user->hasAnyAdminPermission(),
                    'is_clinic_owner' => $user->isClinicOwner() && $user->organization()->exists(),
                    'permissions' => $user->permissions(),
                    'unread' => $user->notificationsList()->whereNull('read_at')->count(),
                ] : null,
            ],
            'city' => $city ? ['id' => $city->id, 'slug' => $city->slug, 'name' => $city->name, 'name_in' => $city->name_in] : null,
            'cities' => fn () => $catalog->cities()->map(fn ($c) => ['slug' => $c->slug, 'name' => $c->name, 'region' => $c->region])->values(),
            'collections' => fn () => $user ? $this->collections($user->id) : null,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'import_report' => fn () => $request->session()->get('import_report'),
            ],
        ];
    }

    /** @return array<string,array<string,list<int>>> */
    private function collections(int $userId): array
    {
        $rows = UserCollection::where('user_id', $userId)->get(['kind', 'entity_type', 'entity_id']);
        $out = ['favorite' => ['clinic' => [], 'doctor' => []], 'compare' => ['clinic' => [], 'doctor' => []]];
        foreach ($rows as $r) {
            $out[$r->kind][$r->entity_type][] = (int) $r->entity_id;
        }

        return $out;
    }
}
