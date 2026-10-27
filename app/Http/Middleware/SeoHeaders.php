<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Закрывает preview от индексации и добавляет базовые security-заголовки. */
class SeoHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (config('app.noindex') || $request->is('account*', 'admin*', 'clinic-cabinet*', 'login', 'register', 'favorites', 'compare', 'api/*', 'offer/*', 'o/*', 'demo/*', 'unsubscribe/*', 'max', 'max/*')) {
            $response->headers->set('X-Robots-Tag', 'noindex, nofollow, noarchive');
        }

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        if ($this->isMaxMiniApp($request)) {
            $response->headers->set('Content-Security-Policy', "frame-ancestors 'self' https://max.ru https://*.max.ru https://web.max.ru");
            $response->headers->remove('X-Frame-Options');
            $response->headers->set('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
        } else {
            $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
            $response->headers->set('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
        }

        return $response;
    }

    private function isMaxMiniApp(Request $request): bool
    {
        if ($request->routeIs('max.miniapp', 'max.session')) {
            return true;
        }

        $path = trim($request->path(), '/');

        return $path === 'max' || str_starts_with($path, 'max/');
    }
}
