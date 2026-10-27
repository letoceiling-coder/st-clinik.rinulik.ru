<?php

namespace App\Http\Middleware;

use App\Models\Organization;
use App\Services\Organization\CabinetAuthorization;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Проверка роли сотрудника для маршрутов кабинета (см. config/cabinet_abilities.php). */
class RequireCabinetAbility
{
    public function __construct(
        private readonly CabinetAuthorization $authorization,
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->attributes->get('demo_link') !== null) {
            return $next($request);
        }

        $routeName = $request->route()?->getName();
        $ability = $routeName ? config('cabinet_abilities.'.$routeName) : null;
        if ($ability === null) {
            return $next($request);
        }

        $user = $request->user();
        $org = $request->attributes->get('org');
        abort_unless($user && $org instanceof Organization, 403);

        abort_unless($this->authorization->allows($user, $org, $ability), 403, 'Недостаточно прав для этого действия.');

        return $next($request);
    }
}
