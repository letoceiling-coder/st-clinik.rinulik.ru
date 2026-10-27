<?php

namespace App\Http\Middleware;

use App\Models\Clinic;
use App\Models\DemoLink;
use App\Services\Offers\DemoSession;
use App\Services\Organization\OrganizationStaffService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Доступ в кабинет клиники: роль clinic_owner с организацией (суперадмин — к любой, но только на чтение через админку).
 * Кладёт в request attributes организацию и выбранный филиал.
 */
class RequireClinicOwner
{
    public function __construct(
        private readonly DemoSession $demo,
        private readonly OrganizationStaffService $staffService,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $hadDemo = $request->session()->has(DemoSession::SESSION_KEY);
        $demoLink = $this->demo->current($request);
        if ($demoLink !== null) {
            return $this->demo($request, $next, $demoLink);
        }
        if ($hadDemo && $request->user() === null) {
            return redirect('/')->with('error', 'Демо-доступ закончился: ссылка истекла или отозвана.');
        }

        $user = $request->user();
        if ($user === null) {
            return redirect()->guest(route('login'));
        }
        $org = $this->staffService->organizationFor($user);
        abort_unless($org, 403, 'К вашей учётной записи не привязана организация.');
        abort_if($org->status === 'blocked', 403, 'Доступ организации заблокирован. Обратитесь в поддержку.');

        $branches = Clinic::where('organization_id', $org->id)->orderBy('id')->get();
        $current = $branches->firstWhere('id', (int) $request->query('branch', $request->session()->get('cabinet_branch')))
            ?? $branches->first();
        if ($current) {
            $request->session()->put('cabinet_branch', $current->id);
        }

        $request->attributes->set('org', $org);
        $request->attributes->set('branches', $branches);
        $request->attributes->set('branch', $current);

        return $next($request);
    }

    /** Демо-режим: только просмотр черновика из КП и только разрешённые ссылкой разделы. */
    private function demo(Request $request, Closure $next, DemoLink $link): Response
    {
        if (! $request->isMethodSafe()) {
            return back()->with('error', 'Это демо-режим: изменения не сохраняются. Подключитесь, чтобы управлять карточкой клиники.');
        }

        $section = (string) ($request->segment(2) ?? 'dashboard');
        $section = array_key_exists($section, DemoLink::SECTIONS) ? $section : 'dashboard';
        if (! $link->allows($section)) {
            $first = (array) $link->sections;
            $target = ($first[0] ?? 'dashboard') === 'dashboard' ? '/clinic-cabinet' : '/clinic-cabinet/'.$first[0];

            abort_if($request->path() === ltrim($target, '/'), 403, 'Раздел недоступен в демо-режиме.');

            return redirect($target)->with('error', 'Раздел «'.DemoLink::SECTIONS[$section].'» недоступен в демо-режиме.');
        }
        $this->demo->touch($request, $section);

        $clinic = $link->clinic;
        $request->attributes->set('org', $clinic->organization);
        $request->attributes->set('branches', collect([$clinic]));
        $request->attributes->set('branch', $clinic);
        $request->attributes->set('demo_link', $link);

        return $next($request);
    }
}
