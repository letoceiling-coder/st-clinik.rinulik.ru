<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** perm:admin.users — проверка права роли из админки «Роли». */
class RequirePermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $user = $request->user();
        abort_unless($user && $user->hasPermission($permission), 403, 'Недостаточно прав для этого раздела.');

        return $next($request);
    }
}
