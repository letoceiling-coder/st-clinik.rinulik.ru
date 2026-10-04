<?php

use App\Http\Middleware\EnsureActiveUser;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RequireClinicOwner;
use App\Http\Middleware\RequirePermission;
use App\Http\Middleware\SeoHeaders;
use App\Http\Middleware\SetCurrentCity;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: '*');
        $middleware->encryptCookies(except: ['city']);

        $middleware->validateCsrfTokens(except: [
            'payments/yookassa/webhook',
        ]);

        $middleware->web(append: [
            SetCurrentCity::class,
            HandleInertiaRequests::class,
            EnsureActiveUser::class,
        ]);
        $middleware->append(SeoHeaders::class);

        $middleware->alias([
            'perm' => RequirePermission::class,
            'clinic.owner' => RequireClinicOwner::class,
        ]);

        $middleware->redirectGuestsTo(fn () => route('login'));
        $middleware->redirectUsersTo(fn () => route('account.overview'));
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->respond(function (Response $response, Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson() && ! $request->header('X-Inertia')) {
                return $response;
            }

            if (! app()->environment('local') && in_array($response->getStatusCode(), [403, 404, 419, 429, 500, 503], true)) {
                return Inertia::render('Error', ['status' => $response->getStatusCode(), 'seo' => ['title' => 'Ошибка', 'robots' => 'noindex, nofollow']])
                    ->toResponse($request)
                    ->setStatusCode($response->getStatusCode());
            }

            return $response;
        });
    })->create();
