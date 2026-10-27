<?php

namespace App\Http\Middleware;

use App\Models\City;
use App\Models\DemoLink;
use App\Models\UserCollection;
use App\Repositories\Contracts\CatalogRepository;
use App\Services\Assistant\AssistantSettings;
use App\Services\CityGeolocationService;
use App\Services\ClinicCardDisplaySettings;
use App\Services\IntegrationSettings;
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
        $cardDisplay = app(ClinicCardDisplaySettings::class);

        return [
            ...parent::share($request),
            'app' => [
                'name' => config('app.name'),
                'noindex' => (bool) config('app.noindex'),
                'consent_version' => '2026-10',
                'yandex_maps_key' => app(IntegrationSettings::class)->valueForConfigPath('services.yandex.maps_api_key'),
            ],
            'demo' => fn () => $this->offerDemo($request) ?? (is_array($demoPersona) ? [
                'mode' => $demoMode,
                'label' => $demoPersona['label'] ?? 'Демо-режим',
            ] : null),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'email_verified' => $user->hasVerifiedEmail(),
                    'is_admin' => $user->hasAnyAdminPermission(),
                    'is_clinic_owner' => $user->isClinicOwner() && $user->organization()->exists(),
                    'permissions' => $user->permissions(),
                    'unread' => $user->notificationsList()->whereNull('read_at')->count(),
                ] : null,
            ],
            'oauth' => fn () => [
                'yandex' => (bool) config('services.yandex_oauth.enabled') && filled(config('services.yandex_oauth.client_id')),
                'vk' => (bool) config('services.vk_oauth.enabled') && filled(config('services.vk_oauth.client_id')),
                'max' => (bool) config('services.max_bot.login_enabled') && filled(config('services.max_bot.token')),
            ],
            'city' => $city ? ['id' => $city->id, 'slug' => $city->slug, 'name' => $city->name, 'name_in' => $city->name_in] : null,
            'city_prompt' => fn () => $this->cityPrompt($request, $city instanceof City ? $city : null),
            'cities' => fn () => $catalog->cities()->map(fn ($c) => ['slug' => $c->slug, 'name' => $c->name, 'region' => $c->region])->values(),
            'collections' => fn () => $user ? $this->collections($user->id) : null,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'import_report' => fn () => $request->session()->get('import_report'),
            ],
            'display' => [
                'premium_clinic_card_variant' => fn () => $cardDisplay->premiumVariant(),
                'premium_clinic_card_class' => fn () => $cardDisplay->premiumVariantClass(),
            ],
            'max_app' => $request->routeIs('max.miniapp', 'max.clinics', 'max.session')
                || str_starts_with(trim($request->path(), '/'), 'max'),
            'webpush' => fn () => filled(config('services.webpush.public_key')) ? [
                'public_key' => (string) config('services.webpush.public_key'),
            ] : null,
            'assistant' => fn () => app(AssistantSettings::class)->publicProps(),
        ];
    }

    /** @return array{suggested: array{slug: string, name: string, name_in: string|null}, source: string}|null */
    private function cityPrompt(Request $request, ?City $current): ?array
    {
        if ($current === null) {
            return null;
        }

        if ($request->routeIs('admin.*', 'cabinet.*', 'max.*', 'max.miniapp', 'max.clinics')) {
            return null;
        }

        if ($request->cookie('city_confirmed') === '1' || $request->hasCookie('city')) {
            return null;
        }

        if ($request->user()?->city_id) {
            return null;
        }

        $detected = app(CityGeolocationService::class)->detectFromIp($request->ip());
        $suggested = $detected ?? $current;

        return [
            'suggested' => [
                'slug' => $suggested->slug,
                'name' => $suggested->name,
                'name_in' => $suggested->name_in,
            ],
            'source' => $detected ? 'ip' : 'default',
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

    /** @return array{mode:string,label:string,readonly:bool,sections:list<string>,connect_url:?string,exit_url:string,expires_at:?string}|null */
    private function offerDemo(Request $request): ?array
    {
        $link = $request->attributes->get('demo_link');
        if (! $link instanceof DemoLink) {
            return null;
        }

        return [
            'mode' => 'offer',
            'label' => 'Демо-режим: '.$link->clinic->name,
            'readonly' => true,
            'sections' => array_values((array) $link->sections),
            'connect_url' => $link->offer ? $link->offer->url().'#connect' : null,
            'exit_url' => route('demo.leave'),
            'expires_at' => $link->expires_at?->toIso8601String(),
        ];
    }
}
