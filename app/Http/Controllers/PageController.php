<?php

namespace App\Http\Controllers;

use App\Models\CmsPage;
use App\Services\Seo;
use Illuminate\Support\Str;
use Inertia\Response;

class PageController extends Controller
{
    public function show(string $slug, Seo $seo): Response
    {
        $page = CmsPage::where('slug', $slug)->where('status', 'published')->firstOrFail();

        $seoData = $seo->build('page', ['name' => $page->title], canonical: route('pages.show', $page->slug));
        $seoData['title'] = $page->meta_title ?: $page->title.' | '.config('app.name');
        $seoData['description'] = $page->meta_description ?: '';
        $seoData['og'] = ['type' => 'article', 'title' => $seoData['title'], 'description' => $seoData['description'], 'url' => $seoData['canonical'], 'site_name' => config('app.name'), 'locale' => 'ru_RU'];

        return $this->page('Page', [
            'page' => [
                'slug' => $page->slug,
                'title' => $page->title,
                'html' => Str::markdown((string) $page->body, ['html_input' => 'strip', 'allow_unsafe_links' => false]),
                'updated_at' => $page->updated_at?->toDateString(),
            ],
        ], $seoData);
    }
}
