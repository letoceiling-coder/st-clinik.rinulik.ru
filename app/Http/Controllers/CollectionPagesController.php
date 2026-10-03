<?php

namespace App\Http\Controllers;

use App\Services\Seo;
use Inertia\Response;

/** Избранное и сравнение: для гостей данные в localStorage, для авторизованных — в БД. */
class CollectionPagesController extends Controller
{
    public function favorites(Seo $seo): Response
    {
        return $this->page('Collections/Favorites', [], $seo->private('Избранное'));
    }

    public function compare(Seo $seo): Response
    {
        return $this->page('Collections/Compare', [], $seo->private('Сравнение'));
    }
}
