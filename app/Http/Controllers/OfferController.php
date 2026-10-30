<?php

namespace App\Http\Controllers;

use App\Http\Resources\ClinicDetailResource;
use App\Http\Resources\ClinicResource;
use App\Http\Resources\ReviewResource;
use App\Models\CampaignRecipient;
use App\Models\Clinic;
use App\Models\Offer;
use App\Models\ParsedOrganization;
use App\Models\StopListEntry;
use App\Models\User;
use App\Models\UserNotification;
use App\Repositories\Contracts\ReviewRepository;
use App\Rules\RussianPhone;
use App\Services\Audit;
use App\Services\Monetization\MonetizationSettings;
use App\Services\Offers\DemoSession;
use App\Services\Offers\OfferRenderer;
use App\Services\Offers\OfferService;
use App\Services\Offers\OfferSettings;
use App\Services\Organization\OrganizationClaimService;
use App\Services\Seo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Cookie;
use Inertia\Response;
use RuntimeException;

/** Публичные страницы КП: персональное предложение, демо-кабинет, заявка, отписка, пиксель открытия письма. */
class OfferController extends Controller
{
    private const PIXEL = 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    public function short(string $code): RedirectResponse
    {
        $offer = Offer::query()->where('short_code', $code)->first();
        abort_unless($offer, 404);

        return redirect()->to($offer->url());
    }

    /** Постоянная ссылка из текста КП на действующую демо-ссылку предложения. */
    public function shortDemo(string $code): RedirectResponse
    {
        $offer = Offer::query()->where('short_code', $code)->first();
        abort_unless($offer, 404);
        $link = $offer->isAvailable() ? $offer->demoLink : null;
        if ($link === null || $link->unavailableReason() !== null) {
            return redirect()->to($offer->url())->with('error', 'Демо-доступ по этой ссылке закрыт. Оставьте заявку — менеджер откроет новый.');
        }

        return redirect()->to($link->url());
    }

    /**
     * Что уже заполнено в карточке по данным парсера — показываем клинике, сколько работы сделано за неё.
     *
     * @return list<array{label: string, value: string|null, done: bool}>
     */
    private function prepared(Clinic $clinic, ?ParsedOrganization $parsed): array
    {
        $services = $clinic->clinicServices->count();
        $photos = $clinic->photos->count();
        $specialties = $clinic->specialties->count();

        return [
            ['label' => $clinic->lat !== null ? 'Адрес и точка на карте' : 'Адрес', 'value' => $clinic->address ?: null, 'done' => filled($clinic->address)],
            ['label' => 'Телефон', 'value' => $clinic->phone, 'done' => filled($clinic->phone)],
            ['label' => 'Сайт', 'value' => $clinic->website ? preg_replace('~^https?://~', '', $clinic->website) : null, 'done' => filled($clinic->website)],
            ['label' => 'Режим работы', 'value' => $parsed?->hours, 'done' => ! empty($clinic->schedule)],
            ['label' => 'Направления', 'value' => $specialties ? (string) $specialties : null, 'done' => $specialties > 0],
            ['label' => 'Услуги и цены', 'value' => $services ? (string) $services : null, 'done' => $services > 0],
            ['label' => 'Фотографии', 'value' => $photos ? (string) $photos : null, 'done' => $photos > 0],
            ['label' => 'Врачи', 'value' => null, 'done' => $clinic->doctors()->exists()],
        ];
    }

    /** Предпросмотр будущей страницы клиники (черновик не опубликован и не индексируется). */
    public function preview(string $code, ReviewRepository $reviews): Response
    {
        $offer = Offer::query()->where('short_code', $code)->first();
        abort_unless($offer && $offer->isAvailable(), 404);

        $clinic = Clinic::query()->whereKey($offer->clinic_id)->with([
            'organization:id,name,legal_name',
            'city', 'district', 'specialties',
            'doctors' => fn ($q) => $q->with('specialties:id,name,slug')->orderByDesc('rating'),
            'photos' => fn ($q) => $q->where('status', '!=', 'rejected')->orderBy('sort'),
            'documents' => fn ($q) => $q->where('status', 'approved'),
            'clinicServices' => fn ($q) => $q->with('service.specialty:id,name,slug')->orderBy('price_from'),
            'posts' => fn ($q) => $q->whereRaw('1 = 0'),
        ])->firstOrFail();

        return $this->page('Clinics/Show', [
            'clinic' => ClinicDetailResource::make($clinic)->resolve(),
            'reviews' => $this->paged($reviews->forClinic($clinic, 6), ReviewResource::class),
            'review_filters' => [],
            'distribution' => $reviews->distribution($clinic),
            'similar' => [],
            'concerns' => [],
            'review_options' => ['doctors' => [], 'services' => []],
            'breadcrumbs' => [['Главная', url('/')], [$clinic->city?->name ?? 'Город', url('/')], [$clinic->name, $offer->shortUrl()]],
            'clinic_follow' => ['subscribed' => false, 'can_subscribe' => false],
            'preview' => [
                'note' => 'Так страница клиники будет выглядеть для пациентов после подключения и проверки модератором. Запись и отзывы пока отключены.',
                'back_url' => $offer->shortUrl(),
                'back_label' => 'Вернуться к предложению',
            ],
        ], app(Seo::class)->private('Предпросмотр: '.$clinic->name));
    }

    public function show(string $token, OfferService $offers, OfferRenderer $renderer, OrganizationClaimService $claims, MonetizationSettings $monetization): Response
    {
        $offer = $this->offer($token);
        $offers->recordView($offer);
        $claimPreview = $claims->preview($offer);

        $clinic = Clinic::query()->with(['city', 'specialties', 'photos', 'clinicServices.service'])->findOrFail($offer->clinic_id);
        $parsed = ParsedOrganization::query()->where('clinic_id', $clinic->id)->first();
        $demo = $offer->demoLink;
        $vars = $renderer->variables($clinic, []);

        return $this->page('Offer/Show', [
            'offer' => [
                'title' => $offer->snapshot['web_title'] ?? $clinic->name,
                'html' => $offer->snapshot['web_html'] ?? '',
                'token' => $token,
                'applied' => $offer->applications()->exists(),
            ],
            'clinic' => ClinicResource::make($clinic)->resolve(),
            'stats' => [
                'city' => $clinic->city?->name,
                'yandex_rating' => $parsed?->rating ? (float) $parsed->rating : null,
                'yandex_reviews' => (int) ($parsed?->reviews_count ?? 0),
                'competitors' => (int) $vars['{competitors_in_city}'],
                'platform_clinics' => (int) $vars['{platform.clinics_in_city}'],
                'platform_views' => $vars['{platform.visitors_in_city}'],
            ],
            'tariffs' => $demo === null || $demo->show_tariffs ? $renderer->tariffList((int) $clinic->city_id) : [],
            'plans' => $demo === null || $demo->show_tariffs ? $renderer->plans() : [],
            'prepared' => $this->prepared($clinic, $parsed),
            'extra_html' => filled($offer->extra_note) ? $renderer->toHtml((string) $offer->extra_note) : null,
            'trial' => ['enabled' => $monetization->trialEnabled(), 'days' => $monetization->trialDays()],
            'preview_url' => route('offer.preview', ['code' => $offer->short_code]),
            'about_url' => route('alias.for-clinics'),
            'demo_url' => $demo !== null && $demo->unavailableReason() === null ? $demo->url() : null,
            'claim_url' => $claimPreview['claimable'] ? route('offer.claim.show', ['token' => $token]) : null,
            'manager' => array_filter(app(OfferSettings::class)->manager()),
        ], app(Seo::class)->private($offer->snapshot['web_title'] ?? 'Предложение для клиники'));
    }

    public function apply(Request $request, string $token, OfferService $offers): RedirectResponse
    {
        $offer = $this->offer($token);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:32', new RussianPhone],
            'email' => ['nullable', 'email', 'max:190'],
            'position' => ['nullable', 'string', 'max:120'],
            'comment' => ['nullable', 'string', 'max:2000'],
            'consent' => ['accepted'],
        ], ['consent.accepted' => 'Нужно согласие на обработку персональных данных.']);

        $application = $offer->applications()->create([
            ...collect($data)->except('consent')->all(),
            'status' => 'new',
            'consent_at' => now(),
            'ip_hash' => hash('sha256', (string) $request->ip().config('app.key')),
        ]);
        $offer->update(['status' => in_array($offer->status, ['connected', 'revoked'], true) ? $offer->status : 'applied']);
        $offers->advanceRecipients($offer, 'replied');

        $notify = User::query()->whereKey($offer->created_by)->get();
        $notify->each(fn (User $u) => UserNotification::create([
            'user_id' => $u->id, 'type' => 'offer_application', 'title' => 'Заявка на подключение',
            'body' => "«{$offer->clinic->name}»: {$application->name}, {$application->phone}.",
            'url' => route('admin.offers.show', $offer->id),
        ]));
        Audit::log('offers.applied', $offer, ['application_id' => $application->id]);

        return back()->with('success', 'Заявка отправлена. Менеджер свяжется с вами в рабочее время.');
    }

    public function demo(Request $request, string $token, DemoSession $demo): RedirectResponse
    {
        try {
            $opened = $demo->open($request, $token);
        } catch (RuntimeException $e) {
            return redirect('/')->with('error', $e->getMessage());
        }

        return redirect()->route('cabinet.dashboard')
            ->withCookie(Cookie::make(DemoSession::DEVICE_COOKIE, $opened['device'], 60 * 24 * 365, httpOnly: true, sameSite: 'lax'));
    }

    public function leaveDemo(Request $request, DemoSession $demo): RedirectResponse
    {
        $link = $demo->current($request);
        $demo->leave($request);

        return $link?->offer ? redirect()->to($link->offer->url()) : redirect('/');
    }

    public function unsubscribe(Request $request, CampaignRecipient $recipient): Response|RedirectResponse
    {
        abort_unless($request->hasValidSignature(false), 403);

        if ($request->isMethod('post')) {
            StopListEntry::add($recipient->channel, $recipient->contact, 'unsubscribed');
            $recipient->advance('unsubscribed');
            Audit::log('offers.unsubscribed', $recipient, ['channel' => $recipient->channel]);

            return back()->with('success', 'Готово: больше не будем присылать предложения на этот адрес.');
        }

        return $this->page('Offer/Unsubscribe', [
            'contact' => $this->maskContact($recipient->contact),
            'done' => StopListEntry::blocks($recipient->channel, $recipient->contact),
        ], app(Seo::class)->private('Отписка от предложений'));
    }

    public function pixel(Request $request, CampaignRecipient $recipient): HttpResponse
    {
        if ($request->hasValidSignature(false)) {
            $recipient->advance('opened');
        }

        return response(base64_decode(self::PIXEL), 200, [
            'Content-Type' => 'image/gif',
            'Cache-Control' => 'no-store, max-age=0',
        ]);
    }

    private function offer(string $token): Offer
    {
        $offer = Offer::findByToken($token);
        abort_unless($offer, 404);
        abort_unless($offer->isAvailable(), 410, 'Срок действия предложения истёк. Свяжитесь с менеджером МирКлиник — пришлём актуальное.');

        return $offer;
    }

    private function maskContact(string $contact): string
    {
        if (str_contains($contact, '@')) {
            [$name, $domain] = explode('@', $contact, 2);

            return mb_substr($name, 0, 2).'***@'.$domain;
        }

        return mb_substr($contact, 0, 4).'***'.mb_substr($contact, -2);
    }
}
