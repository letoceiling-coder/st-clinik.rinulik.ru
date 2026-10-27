<?php

namespace App\Http\Controllers\Max;

use App\Http\Controllers\Auth\Concerns\HandlesSocialLogin;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\Controller;
use App\Http\Resources\ClinicDetailResource;
use App\Http\Resources\ClinicResource;
use App\Http\Resources\ReviewResource;
use App\Models\Appointment;
use App\Models\HistoryEntry;
use App\Repositories\Contracts\CatalogRepository;
use App\Repositories\Contracts\ClinicRepository;
use App\Repositories\Contracts\ReviewRepository;
use App\Services\Audit;
use App\Services\Auth\MaxWebAppValidator;
use App\Services\Auth\SocialAuthService;
use App\Services\Broadcasts\ClinicFollowerService;
use App\Services\Max\MaxDeepLink;
use App\Services\Max\MaxUserSync;
use App\Services\Notifications\NotificationSubscriptionService;
use App\Services\PublicHomePage;
use App\Services\SchemaOrg;
use App\Services\Seo;
use App\Support\Text;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Response;

class MaxMiniAppController extends Controller
{
    use HandlesSocialLogin;

    private const BRIDGE = 'https://st.max.ru/js/max-web-app.js';

    public function __construct(private readonly Seo $seo) {}

    public function home(PublicHomePage $home, SchemaOrg $schema): Response
    {
        $city = $this->city();
        $props = $home->inertiaProps($city);
        $seoData = $this->seo->build('home', ['count' => $props['stats']['clinics_total'], 'city' => $city->name], [$schema->website()]);

        return $this->page('Max/Home', $this->maxProps($props), $this->seo->private('СтомКлиник в MAX'));
    }

    public function clinics(Request $request, CatalogController $catalog): Response
    {
        $city = $this->city();
        $built = $catalog->buildClinicsPage($request, $city, forMaxApp: true);

        return $this->page('Max/Clinics', $this->maxProps($built['props']), $this->seo->private('Клиники в MAX'));
    }

    public function clinic(
        Request $request,
        string $slug,
        ClinicRepository $clinics,
        ReviewRepository $reviews,
        CatalogRepository $catalog,
        SchemaOrg $schema,
        ClinicFollowerService $followers,
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
            ['Главная', route('max.miniapp')],
            ['Клиники', route('max.clinics')],
            [$clinic->name, route('max.clinic', $clinic->slug)],
        ];

        $seoData = $this->seo->build('clinic', [
            'name' => $clinic->name,
            'city' => $clinic->city->name,
            'address' => $clinic->address,
            'rating' => $clinic->reviews_count ? number_format($clinic->rating, 1, ',', '') : 'нет оценок',
            'reviews' => $clinic->reviews_count,
            'doctors' => $clinic->doctors_count,
            'price' => $clinic->min_price ? Text::money($clinic->min_price) : 'по запросу',
        ], [$schema->clinic($clinic, $schemaReviews), $schema->breadcrumbs($crumbs)], canonical: route('clinics.show', $clinic->slug));

        $services = $clinic->clinicServices->pluck('service_id');

        return $this->page('Max/ClinicShow', $this->maxProps([
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
        ]), $seoData);
    }

    public function appointments(Request $request): Response|RedirectResponse
    {
        if (! $request->user()) {
            return redirect()->route('max.miniapp');
        }

        $scope = $request->query('scope') === 'past' ? 'past' : 'upcoming';

        $appointments = Appointment::query()
            ->where('user_id', $request->user()->id)
            ->with(['clinic:id,slug,name,address,phone', 'doctor:id,slug,name,position', 'service:id,name'])
            ->when(
                $scope === 'upcoming',
                fn ($q) => $q->where('starts_at', '>=', now()->startOfDay())->whereIn('status', Appointment::ACTIVE)->orderBy('starts_at'),
                fn ($q) => $q->where(fn ($w) => $w->where('starts_at', '<', now()->startOfDay())->orWhereNotIn('status', Appointment::ACTIVE))->orderByDesc('starts_at'),
            )
            ->paginate(10)
            ->withQueryString();

        return $this->page('Max/Appointments', $this->maxProps([
            'appointments' => $appointments->through(fn (Appointment $a) => BookingController::payload($a))->toArray(),
            'scope' => $scope,
            'counts' => [
                'upcoming' => Appointment::query()->where('user_id', $request->user()->id)->where('starts_at', '>=', now()->startOfDay())->active()->count(),
            ],
        ]), $this->seo->private('Мои записи'));
    }

    public function session(
        Request $request,
        MaxWebAppValidator $validator,
        SocialAuthService $social,
        MaxDeepLink $deepLink,
        MaxUserSync $maxUsers,
        NotificationSubscriptionService $subscriptions,
    ): JsonResponse|RedirectResponse {
        $request->validate([
            'init_data' => ['required', 'string', 'max:8192'],
        ]);

        $validated = $validator->validate($request->string('init_data')->toString());
        $profile = $validator->profileFromInitData($validated);

        $result = $social->resolveLogin($profile, $request->user());
        if ($result['action'] === 'link_prompt' && isset($result['user'])) {
            return $this->handleSocialResult($request, $social, $result, $profile);
        }

        if (! isset($result['user'])) {
            if ($request->expectsJson() || $request->header('X-Inertia')) {
                return response()->json(['message' => 'Не удалось выполнить вход через MAX.'], 422);
            }

            return redirect()->route('max.miniapp')->withErrors(['init_data' => 'Не удалось выполнить вход через MAX.']);
        }

        $user = $result['user'];
        if (! $user->isActive()) {
            $message = 'Учётная запись заблокирована.';

            if ($request->header('X-Inertia') || $request->expectsJson()) {
                return response()->json(['message' => $message], 422);
            }

            return redirect()->route('max.miniapp')->withErrors(['init_data' => $message]);
        }

        Auth::login($user, true);
        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()])->save();
        Audit::log('auth.max_miniapp_login', $user);

        $maxUserId = $profile->providerUserId;
        $subscriptions->activateMax($user, $maxUserId);
        $maxPayload = is_array($validated['user'] ?? null) ? $validated['user'] : [];
        $maxPayload['user_id'] = $maxUserId;
        $maxUsers->touch($maxUserId, $maxPayload, null);

        $redirectTo = $deepLink->url($validated['start_param'] ?? null) ?? route('max.miniapp');

        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            return response()->json(['ok' => true, 'redirect' => $redirectTo]);
        }

        return redirect($redirectTo);
    }

    /** @param  array<string, mixed>  $props */
    private function maxProps(array $props): array
    {
        return $props + ['maxBridgeScript' => self::BRIDGE];
    }
}
