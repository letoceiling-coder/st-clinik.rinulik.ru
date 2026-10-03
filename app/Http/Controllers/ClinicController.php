<?php

namespace App\Http\Controllers;

use App\Http\Resources\ClinicDetailResource;
use App\Http\Resources\ClinicResource;
use App\Http\Resources\ReviewResource;
use App\Models\HistoryEntry;
use App\Repositories\Contracts\CatalogRepository;
use App\Repositories\Contracts\ClinicRepository;
use App\Repositories\Contracts\ReviewRepository;
use App\Services\SchemaOrg;
use App\Services\Seo;
use App\Support\Text;
use Illuminate\Http\Request;
use Inertia\Response;

class ClinicController extends Controller
{
    public function show(
        Request $request,
        string $slug,
        ClinicRepository $clinics,
        ReviewRepository $reviews,
        CatalogRepository $catalog,
        Seo $seo,
        SchemaOrg $schema,
    ): Response {
        $clinic = $clinics->findPublishedBySlug($slug) ?? abort(404);
        $clinic->increment('views_count');

        if ($user = $request->user()) {
            HistoryEntry::create(['user_id' => $user->id, 'type' => 'view', 'entity_type' => 'clinic', 'entity_id' => $clinic->id]);
        }

        $rating = $request->integer('rating') ?: null;
        $reviewPage = $reviews->forClinic($clinic, 6, $rating, (string) $request->query('sort', 'new'));
        $schemaReviews = $reviews->forClinic($clinic, 5)->getCollection();

        $crumbs = [
            ['Главная', url('/')],
            [$clinic->city->name, route('city.clinics', $clinic->city->slug)],
            [$clinic->name, route('clinics.show', $clinic->slug)],
        ];

        $seoData = $seo->build('clinic', [
            'name' => $clinic->name,
            'city' => $clinic->city->name,
            'address' => $clinic->address,
            'rating' => $clinic->reviews_count ? number_format($clinic->rating, 1, ',', '') : 'нет оценок',
            'reviews' => $clinic->reviews_count,
            'doctors' => $clinic->doctors_count,
            'price' => $clinic->min_price ? Text::money($clinic->min_price) : 'по запросу',
        ], [$schema->clinic($clinic, $schemaReviews), $schema->breadcrumbs($crumbs)], canonical: route('clinics.show', $clinic->slug));

        $services = $clinic->clinicServices->pluck('service_id');

        return $this->page('Clinics/Show', [
            'clinic' => ClinicDetailResource::make($clinic)->resolve(),
            'reviews' => $this->paged($reviewPage, ReviewResource::class),
            'review_filters' => array_filter(['rating' => $rating]),
            'distribution' => $reviews->distribution($clinic),
            'similar' => ClinicResource::collection($clinics->similar($clinic, 3))->resolve(),
            'concerns' => $catalog->concerns()->filter(fn ($c) => $c->services->pluck('id')->intersect($services)->isNotEmpty())->take(6)
                ->map(fn ($c) => ['slug' => $c->slug, 'name' => $c->name, 'icon' => $c->icon])->values(),
            'review_options' => [
                'doctors' => $clinic->doctors->map(fn ($d) => ['id' => $d->id, 'name' => $d->name])->values(),
                'services' => $clinic->clinicServices->map(fn ($cs) => ['id' => $cs->service_id, 'name' => $cs->service->name])->values(),
            ],
            'breadcrumbs' => $crumbs,
        ], $seoData);
    }
}
