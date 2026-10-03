<?php

namespace App\Http\Controllers;

use App\Models\City;
use App\Models\Clinic;
use App\Models\CmsPage;
use App\Models\Doctor;
use App\Models\Specialty;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Cache;

class SeoController extends Controller
{
    public function robots(): Response
    {
        if (config('app.noindex')) {
            $body = "User-agent: *\nDisallow: /\n";
        } else {
            $body = "User-agent: *\nAllow: /\nDisallow: /account\nDisallow: /admin\nDisallow: /clinic-cabinet\nDisallow: /login\nDisallow: /register\nDisallow: /search\nDisallow: /compare\nDisallow: /favorites\nDisallow: /api/\n\nSitemap: ".url('/sitemap.xml')."\n";
        }

        return response($body, 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    public function sitemap(): Response
    {
        $xml = Cache::remember('sitemap.xml', 3600, function () {
            $urls = [[url('/'), now()->toDateString(), '1.0']];

            foreach (City::where('is_active', true)->get() as $city) {
                foreach (['clinics', 'doctors', 'directions', 'prices', 'reviews'] as $section) {
                    $urls[] = [route("city.$section", $city->slug), now()->toDateString(), '0.8'];
                }
                foreach (Specialty::where('is_active', true)->get() as $spec) {
                    $urls[] = [route('city.direction', [$city->slug, $spec->slug]), now()->toDateString(), '0.7'];
                }
            }
            foreach (Clinic::published()->get(['slug', 'updated_at']) as $c) {
                $urls[] = [route('clinics.show', $c->slug), $c->updated_at->toDateString(), '0.6'];
            }
            foreach (Doctor::published()->whereHas('clinic', fn ($q) => $q->published())->get(['slug', 'updated_at']) as $d) {
                $urls[] = [route('doctors.show', $d->slug), $d->updated_at->toDateString(), '0.5'];
            }
            foreach (CmsPage::where('status', 'published')->get(['slug', 'updated_at']) as $p) {
                $urls[] = [route('pages.show', $p->slug), $p->updated_at->toDateString(), '0.3'];
            }

            $out = '<?xml version="1.0" encoding="UTF-8"?>'."\n".'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";
            foreach ($urls as [$loc, $lastmod, $priority]) {
                $out .= '  <url><loc>'.e($loc).'</loc><lastmod>'.$lastmod.'</lastmod><priority>'.$priority.'</priority></url>'."\n";
            }

            return $out.'</urlset>';
        });

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }
}
