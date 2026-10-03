<?php

namespace App\Http\Controllers;

use App\Http\Resources\ClinicResource;
use App\Http\Resources\DoctorResource;
use App\Http\Resources\ReviewResource;
use App\Models\HistoryEntry;
use App\Repositories\Contracts\ClinicRepository;
use App\Repositories\Contracts\DoctorRepository;
use App\Repositories\Contracts\ReviewRepository;
use App\Services\SchemaOrg;
use App\Services\Seo;
use Illuminate\Http\Request;
use Inertia\Response;

class DoctorController extends Controller
{
    public function show(
        Request $request,
        string $slug,
        DoctorRepository $doctors,
        ClinicRepository $clinics,
        ReviewRepository $reviews,
        Seo $seo,
        SchemaOrg $schema,
    ): Response {
        $doctor = $doctors->findPublishedBySlug($slug) ?? abort(404);
        abort_unless($doctor->clinic?->status === 'published', 404);

        if ($user = $request->user()) {
            HistoryEntry::create(['user_id' => $user->id, 'type' => 'view', 'entity_type' => 'doctor', 'entity_id' => $doctor->id]);
        }

        $reviewPage = $reviews->forDoctor($doctor, 6);
        $schemaReviews = $reviews->forDoctor($doctor, 5)->getCollection();
        $clinic = $clinics->findPublishedBySlug($doctor->clinic->slug);

        $specIds = $doctor->specialties->pluck('id');
        $prices = $clinic
            ? $clinic->clinicServices->filter(fn ($cs) => $specIds->contains($cs->service->specialty_id))->take(8)->map(fn ($cs) => [
                'name' => $cs->service->name, 'slug' => $cs->service->slug, 'price_from' => $cs->price_from, 'price_to' => $cs->price_to,
            ])->values()
            : collect();

        $crumbs = [
            ['Главная', url('/')],
            [$doctor->clinic->city->name, route('city.doctors', $doctor->clinic->city->slug)],
            [$doctor->name, route('doctors.show', $doctor->slug)],
        ];

        $seoData = $seo->build('doctor', [
            'name' => $doctor->name,
            'position' => mb_strtolower((string) $doctor->position),
            'city' => $doctor->clinic->city->name,
            'clinic' => $doctor->clinic->name,
            'experience' => $doctor->experience_years.' '.trans_choice('год|года|лет', $doctor->experience_years),
            'rating' => $doctor->reviews_count ? number_format($doctor->rating, 1, ',', '') : 'нет оценок',
            'reviews' => $doctor->reviews_count,
        ], [$schema->doctor($doctor, $schemaReviews), $schema->breadcrumbs($crumbs)], canonical: route('doctors.show', $doctor->slug));

        return $this->page('Doctors/Show', [
            'doctor' => DoctorResource::make($doctor)->resolve() + [
                'bio' => $doctor->bio,
                'education' => $doctor->education ?? [],
                'achievements' => $doctor->achievements ?? [],
                'schedule_days' => $doctor->schedule_days ?? [],
            ],
            'clinic' => $clinic ? ClinicResource::make($clinic)->resolve() : null,
            'prices' => $prices,
            'reviews' => $this->paged($reviewPage, ReviewResource::class),
            'distribution' => $reviews->distribution($doctor),
            'colleagues' => DoctorResource::collection($doctors->colleagues($doctor, 3))->resolve(),
            'breadcrumbs' => $crumbs,
        ], $seoData);
    }
}
