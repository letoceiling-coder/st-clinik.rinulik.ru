<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Cookies с SameSite=None для сессии и CSRF внутри iframe MAX. */
class PrepareMaxMiniAppSession
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($this->matches($request)) {
            config([
                'session.same_site' => 'none',
                'session.secure' => true,
            ]);
        }

        return $next($request);
    }

    private function matches(Request $request): bool
    {
        if ($request->routeIs('max.miniapp', 'max.session')) {
            return true;
        }

        $path = trim($request->path(), '/');

        return $path === 'max' || str_starts_with($path, 'max/');
    }
}
