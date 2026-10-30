<?php

namespace App\Http\Controllers;

use App\Http\Resources\ClinicDetailResource;
use App\Http\Resources\ClinicResource;
use App\Http\Resources\ReviewResource;
use App\Models\Clinic;
use App\Models\HistoryEntry;
use App\Repositories\Contracts\CatalogRepository;
use App\Repositories\Contracts\ClinicRepository;
use App\Repositories\Contracts\ReviewRepository;
use App\Services\Broadcasts\ClinicFollowerService;
use App\Services\Clinics\ClinicSeo;
use App\Services\SchemaOrg;
use App\Services\Seo;
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
        ClinicFollowerService $followers,
    ): Response {
        $clinic = $clinics->findPublishedBySlug($slug);
        if (! $clinic) {
            return $this->staffPreview($request, $slug, $reviews);
        }
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

        $clinicSeo = app(ClinicSeo::class);
        $seoData = $clinicSeo->applyOverrides(
            $seo->build('clinic', $clinicSeo->vars($clinic), [$schema->clinic($clinic, $schemaReviews), $schema->breadcrumbs($crumbs)], canonical: route('clinics.show', $clinic->slug)),
            $clinic,
        );

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
            'clinic_follow' => [
                'subscribed' => ($user = $request->user()) ? $followers->isFollowing($user, $clinic) : false,
                'can_subscribe' => $request->user() !== null,
            ],
        ], $seoData);
    }

    /**
     * Неопубликованная клиника: сотрудник с доступом к клиникам видит предпросмотр (без индексации,
     * без записи и отзывов), остальные — 404.
     */
    private function staffPreview(Request $request, string $slug, ReviewRepository $reviews): Response
    {
        abort_unless($request->user()?->hasPermission('admin.clinics'), 404);

        $clinic = Clinic::query()->where('slug', $slug)->with([
            'organization:id,name,legal_name',
            'city', 'district', 'specialties',
            'doctors' => fn ($q) => $q->with('specialties:id,name,slug')->orderByDesc('rating'),
            'photos' => fn ($q) => $q->where('status', '!=', 'rejected')->orderBy('sort'),
            'documents' => fn ($q) => $q->where('status', 'approved'),
            'clinicServices' => fn ($q) => $q->with('service.specialty:id,name,slug')->orderBy('price_from'),
            'posts' => fn ($q) => $q->whereRaw('1 = 0'),
        ])->first() ?? abort(404);

        $status = Clinic::STATUS_LABELS[$clinic->status] ?? 'Не опубликовано';

        return $this->page('Clinics/Show', [
            'clinic' => ClinicDetailResource::make($clinic)->resolve(),
            'reviews' => $this->paged($reviews->forClinic($clinic, 6), ReviewResource::class),
            'review_filters' => [],
            'distribution' => $reviews->distribution($clinic),
            'similar' => [],
            'concerns' => [],
            'review_options' => ['doctors' => [], 'services' => []],
            'breadcrumbs' => [],
            'clinic_follow' => ['subscribed' => false, 'can_subscribe' => false],
            'preview' => [
                'note' => "Клиника не опубликована (статус «{$status}»), посетители видят «Страница не найдена». Эту страницу видят только сотрудники. Запись и отзывы отключены.",
                'back_url' => '/admin/clinics/'.$clinic->id,
                'back_label' => 'Вернуться в админку',
            ],
        ], app(Seo::class)->private('Предпросмотр: '.$clinic->name));
    }
}
