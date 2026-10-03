<?php

namespace App\Http\Middleware;

use App\Models\Clinic;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Доступ в кабинет клиники: роль clinic_owner с организацией (суперадмин — к любой, но только на чтение через админку).
 * Кладёт в request attributes организацию и выбранный филиал.
 */
class RequireClinicOwner
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_unless($user && $user->role === 'clinic_owner', 403, 'Кабинет доступен представителям клиник.');

        $org = $user->organization;
        abort_unless($org, 403, 'К вашей учётной записи не привязана организация.');

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
}
