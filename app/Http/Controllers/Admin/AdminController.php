<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\Seo;
use Inertia\Response;

abstract class AdminController extends Controller
{
    /** @param array<string,mixed> $props */
    protected function render(string $component, string $title, array $props = []): Response
    {
        return $this->page($component, $props, app(Seo::class)->private($title));
    }

    protected function appUrl(): string
    {
        return rtrim((string) config('app.url'), '/');
    }
}
