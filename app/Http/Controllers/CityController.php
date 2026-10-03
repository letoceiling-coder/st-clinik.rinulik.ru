<?php

namespace App\Http\Controllers;

use App\Models\City;
use App\Repositories\Contracts\CatalogRepository;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Cookie;

class CityController extends Controller
{
    /** Переключение города: ставит cookie и, на городских страницах, подменяет сегмент города. */
    public function switch(City $city, CatalogRepository $catalog): RedirectResponse
    {
        $previous = parse_url((string) url()->previous(), PHP_URL_PATH) ?: '/';
        $segments = array_values(array_filter(explode('/', $previous)));

        if ($segments && $catalog->city($segments[0])) {
            $section = in_array($segments[1] ?? '', ['clinics', 'doctors', 'directions', 'prices', 'reviews'], true) ? $segments[1] : 'clinics';
            $target = '/'.$city->slug.'/'.$section;
        } else {
            $target = $previous === '' ? '/' : $previous;
        }

        return redirect($target)->withCookie(Cookie::make('city', $city->slug, 60 * 24 * 365, '/', null, null, false));
    }
}
