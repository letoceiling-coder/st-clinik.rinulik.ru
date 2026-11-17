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
            $body = "User-agent: *\nAllow: /\nDisallow: /account\nDisallow: /admin\nDisallow: /clinic-cabinet\nDisallow: /login\nDisallow: /register\nDisallow: /search\nDisallow: /compare\nDisallow: /favorites\nDisallow: /api/\n\nSitemap:  ".url('/sitemap.xml')."\n";
        }

        return response($body, 200, ['Content-Type' => 'text/plain; charset=UTF-8']);
    }

    /** Максимум URL в одном файле по протоколу sitemap — 50 000; берём с запасом. */
    public const SITEMAP_CHUNK = 40000;

    /** Индекс sitemap: ссылки на файлы pages / clinics / doctors, разбитые по SITEMAP_CHUNK URL. */
    public function sitemap(): Response
    {
        $xml = Cache::remember('sitemap.index.xml', 3600, function () {
            $counts = [
                'pages' => count($this->pageUrls()),
                'clinics' => Clinic::published()->count(),
                'doctors' => $this->publishedDoctors()->count(),
            ];

            $out = '<?xml version="1.0" encoding="UTF-8"?>'.'
'.'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'.'
';
            foreach ($counts as $type => $count) {
                $parts = max(1, (int) ceil($count / self::SITEMAP_CHUNK));
                for ($page = 1; $page <= $parts; $page++) {
                    $out .= '  <sitemap><loc>'.e(url("/sitemap-{$type}-{$page}.xml")).'</loc><lastmod>'.now()->toDateString().'</lastmod></sitemap>'.'
';
                }
            }

            return $out.'</sitemapindex>';
        });

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }

    public function sitemapPart(string $type, int $page): Response
    {
        abort_unless(in_array($type, ['pages', 'clinics', 'doctors'], true) && $page >= 1, 404);

        $xml = Cache::remember("sitemap.{$type}.{$page}.xml", 3600, function () use ($type, $page) {
            $offset = ($page - 1) * self::SITEMAP_CHUNK;

            $urls = match ($type) {
                'pages' => array_slice($this->pageUrls(), $offset, self::SITEMAP_CHUNK),
                'clinics' => Clinic::published()->orderBy('id')->offset($offset)->limit(self::SITEMAP_CHUNK)->get(['slug', 'updated_at'])
                    ->map(fn ($c) => [route('clinics.show', $c->slug), $c->updated_at->toDateString(), '0.6'])->all(),
                'doctors' => $this->publishedDoctors()->orderBy('doctors.id')->offset($offset)->limit(self::SITEMAP_CHUNK)->get(['doctors.slug', 'doctors.updated_at'])
                    ->map(fn ($d) => [route('doctors.show', $d->slug), $d->updated_at->toDateString(), '0.5'])->all(),
            };

            $out = '<?xml version="1.0" encoding="UTF-8"?>'.'
'.'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'.'
';
            foreach ($urls as [$loc, $lastmod, $priority]) {
                $out .= '  <url><loc>'.e($loc).'</loc><lastmod>'.$lastmod.'</lastmod><priority>'.$priority.'</priority></url>'.'
';
            }

            return $out.'</urlset>';
        });

        return response($xml, 200, ['Content-Type' => 'application/xml; charset=UTF-8']);
    }

    private function publishedDoctors()
    {
        return Doctor::published()->whereHas('clinic', fn ($q) => $q->published());
    }

    /** @return list<array{0: string, 1: string, 2: string}> */
    private function pageUrls(): array
    {
        $urls = [[url('/'), now()->toDateString(), '1.0']];
        $specialties = Specialty::where('is_active', true)->get(['slug']);

        foreach (City::where('is_active', true)->get(['slug']) as $city) {
            foreach (['clinics', 'doctors', 'directions', 'prices', 'reviews'] as $section) {
                $urls[] = [route("city.$section", $city->slug), now()->toDateString(), '0.8'];
            }
            foreach ($specialties as $spec) {
                $urls[] = [route('city.direction', [$city->slug, $spec->slug]), now()->toDateString(), '0.7'];
            }
        }
        foreach (CmsPage::where('status', 'published')->get(['slug', 'updated_at']) as $p) {
            $urls[] = [route('pages.show', $p->slug), $p->updated_at->toDateString(), '0.3'];
        }

        return $urls;
    }
}
