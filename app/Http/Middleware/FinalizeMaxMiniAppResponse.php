<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpFoundation\Response;

/** Сессия и CSRF в iframe MAX: SameSite=None и без X-Frame-Options. */
class FinalizeMaxMiniAppResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! $this->matches($request)) {
            return $response;
        }

        $response->headers->remove('X-Frame-Options');

        $names = [
            config('session.cookie'),
            'XSRF-TOKEN',
        ];

        foreach ($response->headers->getCookies() as $cookie) {
            if (! in_array($cookie->getName(), $names, true)) {
                continue;
            }

            $response->headers->setCookie(new Cookie(
                name: $cookie->getName(),
                value: $cookie->getValue(),
                expire: $cookie->getExpiresTime(),
                path: $cookie->getPath(),
                domain: $cookie->getDomain(),
                secure: true,
                httpOnly: $cookie->isHttpOnly(),
                raw: false,
                sameSite: Cookie::SAMESITE_NONE,
            ));
        }

        return $response;
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
