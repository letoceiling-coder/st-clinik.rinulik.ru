<?php

namespace App\Http\Controllers;

use App\Models\HistoryEntry;
use App\Repositories\Contracts\CatalogRepository;
use App\Services\SearchService;
use App\Services\Seo;
use Illuminate\Http\Request;
use Inertia\Response;

class SearchController extends Controller
{
    public function index(Request $request, SearchService $search, Seo $seo, CatalogRepository $catalog): Response
    {
        $q = trim((string) $request->query('q', ''));
        $city = $this->city();
        $results = $q !== '' ? $search->search($q, $city) : null;

        if ($q !== '' && ($user = $request->user())) {
            HistoryEntry::create(['user_id' => $user->id, 'type' => 'search', 'query' => mb_substr($q, 0, 120)]);
        }

        $seoData = $seo->build('search', ['city' => $city->name, 'city_in' => $city->name_in], forceNoindex: true, canonical: url('/search'));

        return $this->page('Search/Index', [
            'q' => $q,
            'results' => $results,
            'concerns' => $catalog->concerns()->take(8)->map(fn ($c) => ['slug' => $c->slug, 'name' => $c->name, 'icon' => $c->icon])->values(),
        ], $seoData);
    }
}
