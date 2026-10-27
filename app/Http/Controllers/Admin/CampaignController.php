<?php

namespace App\Http\Controllers\Admin;

use App\Models\Campaign;
use App\Models\CampaignRecipient;
use App\Models\City;
use App\Models\Clinic;
use App\Models\OfferTemplate;
use App\Models\OrganizationContact;
use App\Models\ParsedOrganization;
use App\Services\Audit;
use App\Services\Offers\CampaignService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Кампании КП: подбор черновиков, автоматическая отправка email/SMS, ручные каналы, воронка и экспорт. */
class CampaignController extends AdminController
{
    private const HAS = ['phone' => 'Телефон', 'email' => 'Email', 'vk' => 'VK', 'telegram' => 'Telegram', 'max' => 'MAX', 'whatsapp' => 'WhatsApp'];

    public function index(): Response
    {
        $funnel = $this->funnelQuery()->get()->keyBy('campaign_id');

        return $this->render('Admin/Campaigns', 'Кампании КП', [
            'campaigns' => Campaign::query()->with(['template:id,name', 'creator:id,name'])->withCount('recipients')->latest('id')->paginate(30)
                ->through(fn (Campaign $c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'template' => $c->template?->name,
                    'channels' => $c->channels,
                    'status' => $c->status,
                    'recipients' => $c->recipients_count,
                    'funnel' => $this->funnelRow($funnel->get($c->id)),
                    'created_at' => $c->created_at?->format('d.m.Y H:i'),
                    'by' => $c->creator?->name,
                ])->toArray(),
            'templates' => OfferTemplate::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'cities' => City::query()->orderBy('name')->get(['id', 'name']),
            'channels' => Campaign::CHANNELS,
            'auto_channels' => Campaign::AUTO_CHANNELS,
            'statuses' => Campaign::STATUSES,
            'has_options' => self::HAS,
            'drafts' => fn () => $this->drafts(request()),
        ]);
    }

    /** Сколько черновиков попадёт под фильтры (для формы создания). */
    public function estimate(Request $request, CampaignService $campaigns): JsonResponse
    {
        $filters = $this->filters($request);
        $query = $campaigns->candidates($filters);

        return response()->json([
            'count' => (clone $query)->count(),
            'sample' => (clone $query)->with('city:id,name')->limit(8)->get(['id', 'name', 'city_id'])
                ->map(fn (Clinic $c) => ['id' => $c->id, 'name' => $c->name, 'city' => $c->city?->name]),
        ]);
    }

    public function store(Request $request, CampaignService $campaigns): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'template_id' => ['required', 'integer', Rule::exists('offer_templates', 'id')->where('is_active', true)],
            'channels' => ['required', 'array', 'min:1'],
            'channels.*' => [Rule::in(array_keys(Campaign::CHANNELS))],
        ]);
        $filters = $this->filters($request);
        if (($filters['ids'] ?? []) === [] && $campaigns->candidates($filters)->count() > 1000) {
            return back()->with('error', 'Под фильтры попадает больше 1000 организаций — сузьте выборку.');
        }

        $campaign = Campaign::create([
            'name' => $data['name'],
            'offer_template_id' => $data['template_id'],
            'channels' => array_values(array_unique($data['channels'])),
            'filters' => $filters,
            'status' => 'draft',
            'created_by' => $request->user()->id,
        ]);
        $result = $campaigns->build($campaign, $request->user());

        return redirect()->route('admin.campaigns.show', $campaign)->with('success', $this->buildMessage($result));
    }

    public function show(Request $request, Campaign $campaign, CampaignService $campaigns): Response
    {
        $campaign->load(['template:id,name', 'creator:id,name']);
        $channel = $request->query('channel');
        $status = $request->query('status');
        $funnel = $this->funnelQuery()->where('campaign_id', $campaign->id)->first();
        $byChannel = $this->funnelQuery()->addSelect('channel')->where('campaign_id', $campaign->id)->groupBy('channel')->get()
            ->mapWithKeys(fn ($row) => [$row->channel => $this->funnelRow($row)]);

        $recipients = $campaign->recipients()->with(['clinic:id,name,city_id', 'clinic.city:id,name', 'offer:id,short_code,snapshot,status,revoked_at,expires_at', 'sender:id,name'])
            ->when($channel, fn (Builder $b, string $c) => $b->where('channel', $c))
            ->when($status, fn (Builder $b, string $s) => $b->where('status', $s))
            ->orderByRaw("case when status = 'queued' then 0 else 1 end")->orderBy('id')
            ->paginate(50)->withQueryString()
            ->through(fn (CampaignRecipient $r) => [
                'id' => $r->id,
                'clinic' => ['id' => $r->clinic_id, 'name' => $r->clinic?->name, 'city' => $r->clinic?->city?->name],
                'offer_id' => $r->offer_id,
                'channel' => $r->channel,
                'manual' => ! in_array($r->channel, Campaign::AUTO_CHANNELS, true),
                'contact' => $r->contact,
                'status' => $r->status,
                'error' => $r->error,
                'attempts' => $r->attempts,
                'sent_at' => $r->sent_at?->format('d.m.Y H:i'),
                'sent_by' => $r->sender?->name,
                'text' => ! in_array($r->channel, Campaign::AUTO_CHANNELS, true) && $r->offer ? $campaigns->manualText($r) : null,
                'link' => $r->offer?->short_code ? route('offer.short', $r->offer->short_code) : null,
            ])->toArray();

        return $this->render('Admin/Campaign', 'Кампания: '.$campaign->name, [
            'campaign' => [
                'id' => $campaign->id,
                'name' => $campaign->name,
                'template' => $campaign->template?->only(['id', 'name']),
                'channels' => $campaign->channels,
                'filters' => $this->describeFilters((array) $campaign->filters),
                'status' => $campaign->status,
                'started_at' => $campaign->started_at?->format('d.m.Y H:i'),
                'completed_at' => $campaign->completed_at?->format('d.m.Y H:i'),
                'by' => $campaign->creator?->name,
                'funnel' => $this->funnelRow($funnel),
                'by_channel' => $byChannel,
            ],
            'recipients' => $recipients,
            'channels' => Campaign::CHANNELS,
            'auto_channels' => Campaign::AUTO_CHANNELS,
            'statuses' => Campaign::STATUSES,
            'recipient_statuses' => CampaignRecipient::STATUSES,
            'funnel_labels' => CampaignRecipient::FUNNEL,
            'filters' => $request->only(['channel', 'status']),
        ]);
    }

    public function start(Request $request, Campaign $campaign, CampaignService $campaigns): RedirectResponse
    {
        if ($campaign->status === 'completed') {
            return back()->with('error', 'Кампания уже завершена.');
        }
        $campaigns->start($campaign, $request->user());

        return back()->with('success', 'Рассылка запущена: email и SMS уходят в рабочие часы с учётом дневных лимитов.');
    }

    public function pause(Request $request, Campaign $campaign, CampaignService $campaigns): RedirectResponse
    {
        $campaigns->pause($campaign, $request->user());

        return back()->with('success', 'Рассылка приостановлена.');
    }

    public function rebuild(Request $request, Campaign $campaign, CampaignService $campaigns): RedirectResponse
    {
        if ($campaign->status === 'completed') {
            return back()->with('error', 'Кампания уже завершена.');
        }

        return back()->with('success', $this->buildMessage($campaigns->build($campaign, $request->user())));
    }

    /** Отметка ручного канала (звонок, мессенджеры) или результата контакта. */
    public function mark(Request $request, CampaignRecipient $recipient, CampaignService $campaigns): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['sent', 'delivered', 'replied', 'connected', 'unsubscribed', 'skipped'])],
        ]);
        if ($data['status'] === 'skipped') {
            $recipient->update(['status' => 'skipped', 'error' => 'Пропущено менеджером', 'sent_by' => $request->user()->id]);
        } else {
            $campaigns->markManual($recipient, $data['status'], $request->user());
        }
        Audit::log('campaigns.recipient_marked', $recipient, ['status' => $data['status']]);

        return back()->with('success', 'Статус обновлён: '.CampaignRecipient::STATUSES[$data['status']].'.');
    }

    public function retry(CampaignRecipient $recipient): RedirectResponse
    {
        abort_unless($recipient->status === 'failed', 422);
        $recipient->update(['status' => 'queued', 'attempts' => 0, 'error' => null]);

        return back()->with('success', 'Получатель снова в очереди.');
    }

    /** CSV (UTF-8 с BOM, разделитель «;» — открывается в Excel). */
    public function export(Campaign $campaign): StreamedResponse
    {
        Audit::log('campaigns.exported', $campaign);
        $columns = ['ID', 'Клиника', 'Город', 'Канал', 'Контакт', 'Статус', 'Отправлено', 'Открыто', 'Переход на КП', 'Демо', 'Заявка', 'Подключение', 'Ошибка'];

        return response()->streamDownload(function () use ($campaign, $columns): void {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, $columns, ';');
            $campaign->recipients()->with('clinic:id,name,city_id', 'clinic.city:id,name')->orderBy('id')
                ->chunk(500, function ($rows) use ($out): void {
                    foreach ($rows as $r) {
                        fputcsv($out, [
                            $r->id, $r->clinic?->name, $r->clinic?->city?->name, Campaign::CHANNELS[$r->channel] ?? $r->channel, $r->contact,
                            CampaignRecipient::STATUSES[$r->status] ?? $r->status,
                            $r->sent_at?->format('d.m.Y H:i'), $r->opened_at?->format('d.m.Y H:i'), $r->clicked_at?->format('d.m.Y H:i'),
                            $r->demo_opened_at?->format('d.m.Y H:i'), $r->replied_at?->format('d.m.Y H:i'), $r->connected_at?->format('d.m.Y H:i'),
                            $r->error,
                        ], ';');
                    }
                });
            fclose($out);
        }, "campaign-{$campaign->id}.csv", ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /** @return array{city_id?: int, rating_min?: float, has?: list<string>, not_offered?: bool, ids?: list<int>} */
    private function filters(Request $request): array
    {
        $data = $request->validate([
            'filters.city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'filters.rating_min' => ['nullable', 'numeric', 'min:0', 'max:5'],
            'filters.has' => ['nullable', 'array'],
            'filters.has.*' => [Rule::in(array_keys(self::HAS))],
            'filters.not_offered' => ['nullable', 'boolean'],
            'filters.ids' => ['nullable', 'array', 'max:500'],
            'filters.ids.*' => ['integer'],
        ]);
        $f = $data['filters'] ?? [];

        return array_filter([
            'city_id' => isset($f['city_id']) ? (int) $f['city_id'] : null,
            'rating_min' => isset($f['rating_min']) && $f['rating_min'] !== '' ? (float) $f['rating_min'] : null,
            'has' => array_values($f['has'] ?? []),
            'not_offered' => (bool) ($f['not_offered'] ?? false),
            'ids' => array_values(array_map('intval', $f['ids'] ?? [])),
        ], fn ($v) => $v !== null && $v !== [] && $v !== false);
    }

    /**
     * @param  array<string, mixed>  $filters
     * @return list<string>
     */
    private function describeFilters(array $filters): array
    {
        return array_values(array_filter([
            isset($filters['city_id']) ? 'Город: '.City::query()->whereKey($filters['city_id'])->value('name') : null,
            isset($filters['rating_min']) ? 'Рейтинг от '.$filters['rating_min'] : null,
            ! empty($filters['has']) ? 'Есть: '.collect($filters['has'])->map(fn ($h) => self::HAS[$h] ?? $h)->implode(', ') : null,
            ! empty($filters['not_offered']) ? 'Ещё не получали КП' : null,
            ! empty($filters['ids']) ? 'Выбрано вручную: '.count($filters['ids']) : null,
        ]));
    }

    /** @return list<array<string, mixed>> */
    private function drafts(Request $request): array
    {
        $q = trim((string) $request->query('draft_q', ''));

        return Clinic::query()->where('status', 'draft')->with('city:id,name')
            ->when($q !== '', fn (Builder $b) => $b->where('name', 'like', "%{$q}%"))
            ->latest('id')->limit(100)->get(['id', 'name', 'city_id'])
            ->map(function (Clinic $c) {
                $types = OrganizationContact::query()->where('clinic_id', $c->id)->where('do_not_contact', false)->distinct()->pluck('type')->all();

                return [
                    'id' => $c->id, 'name' => $c->name, 'city' => $c->city?->name,
                    'rating' => ParsedOrganization::query()->where('clinic_id', $c->id)->value('rating'),
                    'contacts' => $types,
                ];
            })->values()->all();
    }

    /** @return Builder<CampaignRecipient> */
    private function funnelQuery(): Builder
    {
        $count = fn (string $column) => DB::raw("sum(case when {$column} is not null then 1 else 0 end) as n_{$column}");

        return CampaignRecipient::query()->select([
            'campaign_id',
            DB::raw('count(*) as total'),
            DB::raw("sum(case when status = 'queued' then 1 else 0 end) as queued"),
            DB::raw("sum(case when status = 'failed' then 1 else 0 end) as failed"),
            DB::raw("sum(case when status = 'skipped' then 1 else 0 end) as skipped"),
            ...array_map($count, ['sent_at', 'delivered_at', 'opened_at', 'clicked_at', 'demo_opened_at', 'replied_at', 'connected_at', 'unsubscribed_at']),
        ])->groupBy('campaign_id');
    }

    /** @return array<string, int> */
    private function funnelRow(?object $row): array
    {
        $value = fn (string $key) => (int) ($row->{$key} ?? 0);

        return [
            'total' => $value('total'),
            'queued' => $value('queued'),
            'sent' => $value('n_sent_at'),
            'delivered' => $value('n_delivered_at'),
            'opened' => $value('n_opened_at'),
            'clicked' => $value('n_clicked_at'),
            'demo_opened' => $value('n_demo_opened_at'),
            'replied' => $value('n_replied_at'),
            'connected' => $value('n_connected_at'),
            'failed' => $value('failed'),
            'skipped' => $value('skipped'),
            'unsubscribed' => $value('n_unsubscribed_at'),
        ];
    }

    /** @param array{recipients: int, skipped: int, errors: list<string>} $result */
    private function buildMessage(array $result): string
    {
        $message = "Получателей в очереди: {$result['recipients']}, пропущено: {$result['skipped']}.";
        if ($result['errors'] !== []) {
            $message .= ' Не сформировано КП: '.count($result['errors']).' ('.mb_substr($result['errors'][0], 0, 120).').';
        }

        return $message;
    }
}
