<?php

namespace App\Http\Middleware;

use App\Models\City;
use App\Repositories\Contracts\CatalogRepository;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Symfony\Component\HttpFoundation\Response;

/** Определяет текущий город: из URL, затем из cookie, затем город по умолчанию. */
class SetCurrentCity
{
    public function __construct(private readonly CatalogRepository $catalog) {}

    public function handle(Request $request, Closure $next): Response
    {
        $routeCity = $request->route('city');
        $city = $routeCity instanceof City ? $routeCity : null;

        if (! $city && ($slug = $request->cookie('city'))) {
            $city = $this->catalog->city((string) $slug);
        }
        if (! $city && $request->user()?->city_id) {
            $city = $this->catalog->cities()->firstWhere('id', $request->user()->city_id);
        }
        $city ??= $this->catalog->defaultCity();

        app()->instance('currentCity', $city);
        $response = $next($request);

        if ($routeCity instanceof City && $request->cookie('city') !== $city->slug) {
            $response->headers->setCookie(Cookie::make('city', $city->slug, 60 * 24 * 365, '/', null, null, false));
        }

        return $response;
    }
}
