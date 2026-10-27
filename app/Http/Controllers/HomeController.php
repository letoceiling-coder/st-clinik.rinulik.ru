<?php

namespace App\Http\Controllers;

use App\Services\PublicHomePage;
use App\Services\SchemaOrg;
use App\Services\Seo;
use Inertia\Response;

class HomeController extends Controller
{
    public function __invoke(PublicHomePage $home, Seo $seo, SchemaOrg $schema): Response
    {
        $city = $this->city();
        $props = $home->inertiaProps($city);
        $seoData = $seo->build('home', ['count' => $props['stats']['clinics_total'], 'city' => $city->name], [$schema->website()]);

        return $this->page('Home', $props, $seoData);
    }
}
