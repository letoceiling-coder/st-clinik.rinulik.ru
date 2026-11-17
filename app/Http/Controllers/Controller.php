<?php

namespace App\Http\Controllers;

use App\Models\City;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Resources\Json\JsonResource;
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
     * @param  class-string<JsonResource>  $resource
     * @return array<string,mixed>
     */
    protected function paged(LengthAwarePaginator $paginator, string $resource): array
    {
        return $paginator->withQueryString()
            ->through(fn ($model) => $resource::make($model)->resolve())
            ->toArray();
    }
}
