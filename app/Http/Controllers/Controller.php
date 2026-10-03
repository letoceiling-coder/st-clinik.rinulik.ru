<?php

namespace App\Http\Controllers;

use App\Models\City;
use Inertia\Inertia;
use Inertia\Response;

abstract class Controller
{
    /**
     * Рендер Inertia-страницы. SEO-данные уходят и в props (для client-side навигации),
     * и в root-шаблон (title/meta/canonical/JSON-LD доступны без выполнения JS).
     *
     * @param  array<string,mixed>  $props
     * @param  array<string,mixed>  $seo
     */
    protected function page(string $component, array $props, array $seo): Response
    {
        return Inertia::render($component, $props + ['seo' => $this->clientSeo($seo)])->withViewData(['seo' => $seo]);
    }

    /** @param array<string,mixed> $seo */
    private function clientSeo(array $seo): array
    {
        return array_intersect_key($seo, array_flip(['title', 'description', 'h1', 'canonical', 'robots']));
    }

    protected function city(): City
    {
        return app('currentCity');
    }

    /**
     * @param  class-string<\Illuminate\Http\Resources\Json\JsonResource>  $resource
     * @return array<string,mixed>
     */
    protected function paged(\Illuminate\Contracts\Pagination\LengthAwarePaginator $paginator, string $resource): array
    {
        return $paginator->withQueryString()
            ->through(fn ($model) => $resource::make($model)->resolve())
            ->toArray();
    }
}
