<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ClinicDetailResource;
use App\Http\Resources\ClinicResource;
use App\Http\Resources\DoctorResource;
use App\Http\Resources\ReviewResource;
use App\Models\City;
use App\Repositories\Contracts\CatalogRepository;
use App\Repositories\Contracts\ClinicRepository;
use App\Repositories\Contracts\DoctorRepository;
use App\Repositories\Contracts\ReviewRepository;
use App\Repositories\Filters\ClinicFilters;
use App\Repositories\Filters\DoctorFilters;
use App\Services\LeadService;
use App\Services\SearchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Публичный JSON API v1 — тот же слой репозиториев и ресурсов, что и у Inertia-страниц. */
class V1Controller extends Controller
{
    public function __construct(
        private readonly CatalogRepository $catalog,
        private readonly ClinicRepository $clinics,
        private readonly DoctorRepository $doctors,
        private readonly ReviewRepository $reviews,
    ) {}

    public function cities(): JsonResponse
    {
        return response()->json(['data' => $this->catalog->cities()->map(fn ($c) => [
            'slug' => $c->slug, 'name' => $c->name, 'name_in' => $c->name_in, 'region' => $c->region,
        ])->values()]);
    }

    public function specialties(): JsonResponse
    {
        return response()->json(['data' => $this->catalog->specialties()->map(fn ($s) => [
            'slug' => $s->slug, 'name' => $s->name, 'short' => $s->short, 'icon' => $s->icon,
        ])->values()]);
    }

    public function services(): JsonResponse
    {
        return response()->json(['data' => $this->catalog->services()->map(fn ($s) => [
            'id' => $s->id, 'slug' => $s->slug, 'name' => $s->name, 'specialty' => $s->specialty?->slug, 'price_hint_from' => $s->price_hint_from,
        ])->values()]);
    }

    public function concerns(): JsonResponse
    {
        return response()->json(['data' => $this->catalog->concerns()->map(fn ($c) => [
            'slug' => $c->slug, 'name' => $c->name, 'hint' => $c->hint, 'icon' => $c->icon, 'services' => $c->services->pluck('slug'),
        ])->values()]);
    }

    public function clinicsIndex(Request $request): array
    {
        $city = $this->cityFrom($request);
        $page = $this->clinics->paginate(ClinicFilters::fromArray($request->query(), $city->id), min((int) $request->query('per_page', 12), 30));

        return $this->paged($page, ClinicResource::class);
    }

    /** Выборка по id — для избранного и сравнения (гости хранят id в localStorage). */
    public function clinicsByIds(Request $request): JsonResponse
    {
        $ids = $this->ids($request);

        return response()->json(['data' => ClinicDetailResource::collection($this->orderByIds($this->clinics->byIds($ids), $ids))->resolve()]);
    }

    public function doctorsByIds(Request $request): JsonResponse
    {
        $ids = $this->ids($request);

        return response()->json(['data' => DoctorResource::collection($this->orderByIds($this->doctors->byIds($ids), $ids))->resolve()]);
    }

    public function clinic(string $slug): JsonResponse
    {
        $clinic = $this->clinics->findPublishedBySlug($slug) ?? abort(404);

        return response()->json(['data' => ClinicDetailResource::make($clinic)->resolve()]);
    }

    public function clinicDoctors(string $slug): JsonResponse
    {
        $clinic = $this->clinics->findPublishedBySlug($slug) ?? abort(404);

        return response()->json(['data' => DoctorResource::collection($this->doctors->byIds($clinic->doctors->pluck('id')->all()))->resolve()]);
    }

    public function clinicReviews(Request $request, string $slug): array
    {
        $clinic = $this->clinics->findPublishedBySlug($slug) ?? abort(404);

        return $this->paged($this->reviews->forClinic($clinic, 10, $request->integer('rating') ?: null, (string) $request->query('sort', 'new')), ReviewResource::class);
    }

    public function doctorsIndex(Request $request): array
    {
        $city = $this->cityFrom($request);

        return $this->paged($this->doctors->paginate(DoctorFilters::fromArray($request->query(), $city->id), min((int) $request->query('per_page', 12), 30)), DoctorResource::class);
    }

    public function doctor(string $slug): JsonResponse
    {
        $doctor = $this->doctors->findPublishedBySlug($slug) ?? abort(404);

        return response()->json(['data' => DoctorResource::make($doctor)->resolve()]);
    }

    public function suggest(Request $request, SearchService $search): JsonResponse
    {
        $q = trim((string) $request->query('q'));

        return response()->json(['data' => mb_strlen($q) < 2 ? new \stdClass : $search->suggest($q, $this->cityFrom($request))]);
    }

    public function search(Request $request, SearchService $search): JsonResponse
    {
        return response()->json(['data' => $search->search(trim((string) $request->query('q')), $this->cityFrom($request))]);
    }

    public function lead(Request $request, LeadService $leads): JsonResponse
    {
        $data = $leads->validate($request->all());
        $leads->create($data, $request->user(), 'api');

        return response()->json(['message' => 'Заявка принята.'], 201);
    }

    private function cityFrom(Request $request): City
    {
        $slug = $request->query('city');

        return ($slug ? $this->catalog->city((string) $slug) : null) ?? $this->catalog->defaultCity();
    }

    /** @return list<int> */
    private function ids(Request $request): array
    {
        return collect(explode(',', (string) $request->query('ids')))->map(fn ($v) => (int) $v)->filter()->unique()->take(50)->values()->all();
    }

    private function orderByIds($models, array $ids)
    {
        return $models->sortBy(fn ($m) => array_search($m->id, $ids, true))->values();
    }
}
