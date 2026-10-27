<?php

namespace App\Http\Controllers\Admin;

use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\City;
use App\Models\Clinic;
use App\Models\DemoLink;
use App\Models\DemoVisit;
use App\Models\Offer;
use App\Models\OfferApplication;
use App\Models\OfferTemplate;
use App\Models\OfferTemplateVersion;
use App\Models\ParsedOrganization;
use App\Models\StopListEntry;
use App\Rules\RussianPhone;
use App\Services\Audit;
use App\Services\Offers\OfferRenderer;
use App\Services\Offers\OfferService;
use App\Services\Offers\OfferSettings;
use App\Services\Parser\ParsedOrganizationImporter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Response;
use RuntimeException;

/** Раздел «КП и демо»: предложения, демо-ссылки и визиты, заявки, шаблоны, стоп-лист, настройки. */
class OfferController extends AdminController
{
    private const TABS = ['offers', 'applications', 'templates', 'stop-list', 'settings'];

    public function index(Request $request, OfferSettings $settings): Response
    {
        $tab = in_array($request->query('tab'), self::TABS, true) ? $request->query('tab') : 'offers';

        return $this->render('Admin/Offers', 'КП и демо-кабинеты', [
            'tab' => $tab,
            'counts' => fn () => [
                'offers' => Offer::query()->whereNull('revoked_at')->count(),
                'applications' => OfferApplication::query()->where('status', 'new')->count(),
                'templates' => OfferTemplate::query()->count(),
                'stop-list' => StopListEntry::query()->count(),
            ],
            'offers' => fn () => $tab === 'offers' ? $this->offers($request) : null,
            'applications' => fn () => $tab === 'applications' ? $this->applications($request) : null,
            'templates' => fn () => $tab === 'templates' ? $this->templates() : null,
            'stop_list' => fn () => $tab === 'stop-list' ? $this->stopList($request) : null,
            'settings' => fn () => $tab === 'settings' ? $settings->all() : null,
            'cities' => fn () => City::query()->orderBy('name')->get(['id', 'name']),
            'offer_statuses' => Offer::STATUSES,
            'application_statuses' => OfferApplication::STATUSES,
            'stop_reasons' => StopListEntry::REASONS,
            'sections' => DemoLink::SECTIONS,
            'channels' => Campaign::CHANNELS,
            'filters' => $request->only(['q', 'status', 'city']),
        ]);
    }

    public function show(Offer $offer): Response
    {
        $offer->load(['clinic.city:id,name', 'templateVersion.template:id,name', 'creator:id,name', 'demoLinks.visits', 'applications.processor:id,name']);
        $recipients = $offer->recipients()->with('campaign:id,name')->latest('id')->get();

        return $this->render('Admin/Offer', 'КП: '.$offer->clinic->name, [
            'offer' => [
                ...$this->row($offer),
                'url' => $offer->url(),
                'short_url' => $offer->shortUrl(),
                'snapshot' => $offer->snapshot,
                'sms_segments' => OfferRenderer::smsSegments((string) ($offer->snapshot['sms'] ?? '')),
                'template' => $offer->templateVersion ? [
                    'id' => $offer->templateVersion->offer_template_id,
                    'name' => $offer->templateVersion->template?->name,
                    'version' => $offer->templateVersion->version,
                    'content' => $offer->templateVersion->only(OfferTemplateVersion::CONTENT_FIELDS),
                ] : null,
                'first_viewed_at' => $offer->first_viewed_at?->format('d.m.Y H:i'),
                'last_viewed_at' => $offer->last_viewed_at?->format('d.m.Y H:i'),
            ],
            'demo_links' => $offer->demoLinks->map(fn (DemoLink $l) => [
                'id' => $l->id,
                'url' => $l->url(),
                'state' => $l->unavailableReason(),
                'expires_at' => $l->expires_at?->format('Y-m-d'),
                'max_opens' => $l->max_opens,
                'max_devices' => $l->max_devices,
                'opens_count' => $l->opens_count,
                'devices_count' => $l->visits->pluck('device_hash')->unique()->count(),
                'sections' => (array) $l->sections,
                'show_tariffs' => $l->show_tariffs,
                'notify_manager' => $l->notify_manager,
                'revoke_on_connect' => $l->revoke_on_connect,
                'revoke_reason' => $l->revoke_reason,
                'last_opened_at' => $l->last_opened_at?->format('d.m.Y H:i'),
                'visits' => $l->visits->take(50)->map(fn (DemoVisit $v) => [
                    'id' => $v->id,
                    'started_at' => $v->started_at?->format('d.m.Y H:i'),
                    'duration' => $v->durationSeconds(),
                    'ip' => $v->ip_masked,
                    'device' => $v->device,
                    'sections' => collect((array) $v->sections)->map(fn (string $s) => DemoLink::SECTIONS[$s] ?? $s)->values(),
                    'pages' => $v->pages_count,
                ])->values(),
            ])->values(),
            'applications' => $offer->applications->map(fn (OfferApplication $a) => $this->applicationRow($a))->values(),
            'recipients' => $recipients->map(fn (CampaignRecipient $r) => [
                'id' => $r->id,
                'campaign' => $r->campaign?->only(['id', 'name']),
                'channel' => $r->channel,
                'contact' => $r->contact,
                'status' => $r->status,
                'error' => $r->error,
                'sent_at' => $r->sent_at?->format('d.m.Y H:i'),
            ])->values(),
            'sections' => DemoLink::SECTIONS,
            'offer_statuses' => Offer::STATUSES,
            'application_statuses' => OfferApplication::STATUSES,
            'recipient_statuses' => CampaignRecipient::STATUSES,
            'channels' => Campaign::CHANNELS,
        ]);
    }

    /** КП для черновика клиники или организации из парсера (она сначала импортируется в черновик). */
    public function store(Request $request, OfferService $offers, ParsedOrganizationImporter $importer): RedirectResponse
    {
        $data = $request->validate([
            'template_id' => ['required', 'integer', 'exists:offer_templates,id'],
            'clinic_id' => ['nullable', 'integer', 'exists:clinics,id', 'required_without:parsed_organization_id'],
            'parsed_organization_id' => ['nullable', 'integer', 'exists:parsed_organizations,id'],
        ]);

        try {
            $clinic = isset($data['clinic_id'])
                ? Clinic::query()->findOrFail($data['clinic_id'])
                : $this->draftFor(ParsedOrganization::query()->findOrFail($data['parsed_organization_id']), $importer, $request);
            $offer = $offers->createFor($clinic, OfferTemplate::query()->findOrFail($data['template_id']), $request->user());
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()->route('admin.offers.show', $offer)->with('success', 'КП сформировано: ссылки и демо-кабинет готовы.');
    }

    public function customize(Request $request, Offer $offer, OfferService $offers): RedirectResponse
    {
        $data = $request->validate($this->contentRules());
        $offers->customize($offer, $data, $request->user());

        return back()->with('success', 'Текст КП для этой организации сохранён.');
    }

    public function revoke(Request $request, Offer $offer, OfferService $offers): RedirectResponse
    {
        $offers->revoke($offer, $request->user());

        return back()->with('success', 'КП и демо-ссылки отозваны.');
    }

    public function connect(Request $request, Offer $offer, OfferService $offers): RedirectResponse
    {
        $offers->markConnected($offer, $request->user());

        return back()->with('success', 'Клиника отмечена как подключённая, демо-доступ закрыт.');
    }

    public function updateDemo(Request $request, DemoLink $demoLink): RedirectResponse
    {
        $data = $request->validate($this->demoRules());
        $demoLink->update([
            'expires_at' => $data['expires_at'] ?? null,
            'max_opens' => $data['max_opens'] ?? null,
            'max_devices' => $data['max_devices'] ?? null,
            'sections' => array_values($data['sections']),
            'show_tariffs' => (bool) ($data['show_tariffs'] ?? false),
            'notify_manager' => (bool) ($data['notify_manager'] ?? false),
            'revoke_on_connect' => (bool) ($data['revoke_on_connect'] ?? false),
        ]);
        Audit::log('offers.demo_updated', $demoLink, ['by' => $request->user()->id]);

        return back()->with('success', 'Ограничения демо-ссылки сохранены.');
    }

    public function revokeDemo(Request $request, DemoLink $demoLink): RedirectResponse
    {
        $demoLink->update(['revoked_at' => now(), 'revoke_reason' => 'Отозвана вручную']);
        Audit::log('offers.demo_revoked', $demoLink, ['by' => $request->user()->id]);

        return back()->with('success', 'Демо-ссылка отозвана.');
    }

    public function reissueDemo(Request $request, Offer $offer, OfferService $offers): RedirectResponse
    {
        if (! $offer->isAvailable()) {
            return back()->with('error', 'КП отозвано или истекло — сформируйте новое.');
        }
        $offers->reissueDemoLink($offer, $request->user());

        return back()->with('success', 'Выпущена новая демо-ссылка, прежняя отозвана. Ссылка в тексте КП ведёт на новую.');
    }

    public function updateApplication(Request $request, OfferApplication $application, OfferService $offers): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(array_keys(OfferApplication::STATUSES))],
            'admin_note' => ['nullable', 'string', 'max:2000'],
        ]);
        $application->update([...$data, 'processed_by' => $request->user()->id, 'processed_at' => now()]);
        if ($data['status'] === 'connected' && $application->offer->status !== 'connected') {
            $offers->markConnected($application->offer, $request->user());
        }
        Audit::log('offers.application_updated', $application, ['status' => $data['status']]);

        return back()->with('success', 'Заявка обновлена.');
    }

    public function updateSettings(Request $request, OfferSettings $settings): RedirectResponse
    {
        $data = $request->validate([
            'offer_expires_days' => ['required', 'integer', 'min:1', 'max:365'],
            'demo.expires_days' => ['required', 'integer', 'min:1', 'max:365'],
            'demo.max_opens' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'demo.max_devices' => ['nullable', 'integer', 'min:1', 'max:100'],
            'demo.sections' => ['required', 'array', 'min:1'],
            'demo.sections.*' => [Rule::in(array_keys(DemoLink::SECTIONS))],
            'demo.show_tariffs' => ['boolean'],
            'demo.notify_manager' => ['boolean'],
            'demo.revoke_on_connect' => ['boolean'],
            'rules.min_days_between' => ['required', 'integer', 'min:0', 'max:365'],
            'rules.daily_email' => ['required', 'integer', 'min:0', 'max:10000'],
            'rules.daily_sms' => ['required', 'integer', 'min:0', 'max:10000'],
            'rules.send_from_hour' => ['required', 'integer', 'min:0', 'max:23'],
            'rules.send_to_hour' => ['required', 'integer', 'min:1', 'max:24', 'gt:rules.send_from_hour'],
            'manager.name' => ['nullable', 'string', 'max:120'],
            'manager.phone' => ['nullable', 'string', 'max:32', new RussianPhone],
            'manager.email' => ['nullable', 'email', 'max:190'],
        ], ['rules.send_to_hour.gt' => 'Окончание рабочего окна должно быть позже начала.']);

        $current = $settings->all();
        $settings->save([
            'offer_expires_days' => (int) $data['offer_expires_days'],
            'demo' => [
                'expires_days' => (int) $data['demo']['expires_days'],
                'max_opens' => isset($data['demo']['max_opens']) ? (int) $data['demo']['max_opens'] : null,
                'max_devices' => isset($data['demo']['max_devices']) ? (int) $data['demo']['max_devices'] : null,
                'sections' => array_values($data['demo']['sections']),
                'show_tariffs' => (bool) ($data['demo']['show_tariffs'] ?? false),
                'notify_manager' => (bool) ($data['demo']['notify_manager'] ?? false),
                'revoke_on_connect' => (bool) ($data['demo']['revoke_on_connect'] ?? false),
            ],
            'rules' => array_map('intval', $data['rules']) + $current['rules'],
            'manager' => array_map(fn ($v) => (string) ($v ?? ''), ($data['manager'] ?? []) + $current['manager']),
        ]);
        Audit::log('offers.settings_updated', null, ['by' => $request->user()->id]);

        return back()->with('success', 'Настройки КП сохранены.');
    }

    public function storeStop(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'channel' => ['required', Rule::in(array_keys(Campaign::CHANNELS))],
            'value' => ['required', 'string', 'max:190'],
            'note' => ['nullable', 'string', 'max:190'],
        ]);
        StopListEntry::add($data['channel'], $data['value'], 'manual', $request->user()->id, $data['note'] ?? null);

        return back()->with('success', 'Контакт добавлен в стоп-лист.');
    }

    public function destroyStop(StopListEntry $entry): RedirectResponse
    {
        $entry->delete();
        Audit::log('offers.stop_removed', null, ['channel' => $entry->channel]);

        return back()->with('success', 'Контакт убран из стоп-листа.');
    }

    /** @return array<string, list<mixed>> */
    public static function contentRules(): array
    {
        return [
            'web_title' => ['required', 'string', 'max:190'],
            'web_body' => ['required', 'string', 'max:20000'],
            'email_subject' => ['required', 'string', 'max:190'],
            'email_body' => ['required', 'string', 'max:20000'],
            'sms_text' => ['required', 'string', 'max:300'],
            'messenger_text' => ['required', 'string', 'max:4000'],
            'call_script' => ['nullable', 'string', 'max:4000'],
        ];
    }

    /** @return array<string, list<mixed>> */
    private function demoRules(): array
    {
        return [
            'expires_at' => ['nullable', 'date', 'after:today'],
            'max_opens' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'max_devices' => ['nullable', 'integer', 'min:1', 'max:100'],
            'sections' => ['required', 'array', 'min:1'],
            'sections.*' => [Rule::in(array_keys(DemoLink::SECTIONS))],
            'show_tariffs' => ['boolean'],
            'notify_manager' => ['boolean'],
            'revoke_on_connect' => ['boolean'],
        ];
    }

    private function draftFor(ParsedOrganization $parsed, ParsedOrganizationImporter $importer, Request $request): Clinic
    {
        if ($parsed->clinic_id) {
            return Clinic::query()->findOrFail($parsed->clinic_id);
        }
        if (! $parsed->isImportable()) {
            throw new RuntimeException('Организацию нельзя импортировать (дубль, скрыта или город не в справочнике) — КП не формируется.');
        }

        return $importer->import($parsed, $request->user());
    }

    /** @return array<string, mixed> */
    private function offers(Request $request): array
    {
        $q = trim((string) $request->query('q', ''));

        return Offer::query()->with(['clinic:id,name,city_id,status', 'clinic.city:id,name', 'demoLink'])
            ->when($q !== '', fn (Builder $b) => $b->whereHas('clinic', fn (Builder $c) => $c->where('name', 'like', "%{$q}%")))
            ->when($request->query('status'), fn (Builder $b, string $s) => $b->where('status', $s))
            ->when($request->query('city'), fn (Builder $b, string $id) => $b->whereHas('clinic', fn (Builder $c) => $c->where('city_id', (int) $id)))
            ->latest('id')->paginate(30)->withQueryString()
            ->through(fn (Offer $o) => $this->row($o))->toArray();
    }

    /** @return array<string, mixed> */
    private function row(Offer $offer): array
    {
        $demo = $offer->demoLink;

        return [
            'id' => $offer->id,
            'clinic' => ['id' => $offer->clinic->id, 'name' => $offer->clinic->name, 'status' => $offer->clinic->status, 'city' => $offer->clinic->city?->name],
            'status' => $offer->status,
            'is_customized' => $offer->is_customized,
            'available' => $offer->isAvailable(),
            'views' => $offer->views_count,
            'expires_at' => $offer->expires_at?->format('d.m.Y'),
            'created_at' => $offer->created_at?->format('d.m.Y H:i'),
            'demo' => $demo ? ['opens' => $demo->opens_count, 'max_opens' => $demo->max_opens, 'state' => $demo->unavailableReason()] : null,
        ];
    }

    /** @return array<string, mixed> */
    private function applications(Request $request): array
    {
        return OfferApplication::query()->with(['offer.clinic:id,name', 'processor:id,name'])
            ->when($request->query('status'), fn (Builder $b, string $s) => $b->where('status', $s))
            ->latest('id')->paginate(30)->withQueryString()
            ->through(fn (OfferApplication $a) => $this->applicationRow($a))->toArray();
    }

    /** @return array<string, mixed> */
    private function applicationRow(OfferApplication $a): array
    {
        return [
            'id' => $a->id,
            'offer_id' => $a->offer_id,
            'clinic' => $a->offer?->clinic?->name,
            'name' => $a->name,
            'phone' => $a->phone,
            'email' => $a->email,
            'position' => $a->position,
            'comment' => $a->comment,
            'status' => $a->status,
            'admin_note' => $a->admin_note,
            'processor' => $a->processor?->name,
            'created_at' => $a->created_at?->format('d.m.Y H:i'),
        ];
    }

    /** @return list<array<string, mixed>> */
    private function templates(): array
    {
        return OfferTemplate::query()->with('latestVersion')->withCount('versions')->orderByDesc('is_active')->orderBy('name')->get()
            ->map(fn (OfferTemplate $t) => [
                'id' => $t->id,
                'name' => $t->name,
                'is_active' => $t->is_active,
                'version' => $t->latestVersion?->version,
                'versions' => $t->versions_count,
                'offers' => Offer::query()->whereIn('offer_template_version_id', $t->versions()->select('id'))->count(),
                'updated_at' => $t->latestVersion?->created_at?->format('d.m.Y H:i'),
            ])->values()->all();
    }

    /** @return array<string, mixed> */
    private function stopList(Request $request): array
    {
        $q = trim((string) $request->query('q', ''));

        return StopListEntry::query()
            ->when($q !== '', fn (Builder $b) => $b->where('value', 'like', '%'.mb_strtolower($q).'%'))
            ->latest('id')->paginate(50)->withQueryString()
            ->through(fn (StopListEntry $e) => [
                'id' => $e->id, 'channel' => $e->channel, 'value' => $e->value, 'reason' => $e->reason, 'note' => $e->note,
                'created_at' => $e->created_at?->format('d.m.Y H:i'),
            ])->toArray();
    }
}
