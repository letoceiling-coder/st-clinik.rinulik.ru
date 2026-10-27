<?php

namespace App\Http\Controllers\Admin;

use App\Jobs\SyncParserOrganizationsJob;
use App\Models\City;
use App\Models\Clinic;
use App\Models\Offer;
use App\Models\OfferTemplate;
use App\Models\OrganizationContact;
use App\Models\ParsedOrganization;
use App\Models\ParserTask;
use App\Services\Audit;
use App\Services\Parser\ParsedOrganizationImporter;
use App\Services\Parser\ParserOrganizationsClient;
use App\Services\Parser\ParserTaskService;
use App\Support\Text;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;
use Inertia\Response;
use RuntimeException;
use Throwable;

class ParserController extends AdminController
{
    private const TABS = ['organizations', 'tasks', 'base'];

    public function index(Request $request): Response
    {
        $tab = in_array($request->query('tab'), self::TABS, true) ? $request->query('tab') : 'tasks';

        return $this->render('Admin/Parser', 'Парсер организаций', [
            'tab' => $tab,
            'configured' => ParserOrganizationsClient::fromConfig()->configured(),
            'counts' => fn () => $this->statusCounts(),
            'organizations' => fn () => $tab === 'organizations' ? $this->organizations($request) : null,
            'tasks' => fn () => $tab === 'tasks' ? $this->tasks() : null,
            'base' => fn () => $tab === 'base' ? $this->base($request) : null,
            'cities' => fn () => City::query()->orderBy('name')->get(['id', 'name']),
            'statuses' => ParsedOrganization::STATUSES,
            'task_types' => ParserTask::TYPES,
            'search_filters' => ParserTask::FILTERS,
            'task_statuses' => ParserTask::STATUSES,
            'limits' => fn () => $this->limits(),
            'offer_templates' => fn () => $request->user()?->hasPermission('offers.manage')
                ? OfferTemplate::query()->where('is_active', true)->orderBy('name')->get(['id', 'name'])
                : [],
            'filters' => $request->only(['q', 'status', 'city', 'has', 'match', 'base_city']),
        ]);
    }

    public function show(ParsedOrganization $parsed): Response
    {
        $parsed->load(['city:id,name', 'clinic:id,name,slug,status', 'matchClinic:id,name,slug,status,address,phone', 'task:id,type,created_at', 'importer:id,name', 'contacts']);
        $card = is_array($parsed->raw['card'] ?? null) ? $parsed->raw['card'] : [];

        $network = $parsed->group_key
            ? ParsedOrganization::query()->where('group_key', $parsed->group_key)->whereKeyNot($parsed->id)
                ->get(['id', 'name', 'address', 'status', 'clinic_id'])
            : collect();

        return $this->render('Admin/ParsedOrganization', $parsed->name, [
            'organization' => [
                ...$this->row($parsed),
                'region' => $parsed->region,
                'address_details' => $parsed->address_details,
                'lat' => $parsed->lat,
                'lng' => $parsed->lng,
                'socials' => $parsed->socials ?? [],
                'categories' => $parsed->categories ?? [],
                'hours' => $parsed->hours,
                'note' => $parsed->note,
                'source_url' => $parsed->raw['sourceUrl'] ?? $card['sourceUrl'] ?? null,
                'has_full_card' => $parsed->has_full_card,
                'services' => array_values(array_slice((array) ($card['services'] ?? []), 0, 40)),
                'products' => collect($card['products'] ?? [])->take(30)->map(fn ($p) => ['name' => (string) ($p['name'] ?? ''), 'price' => (string) ($p['price'] ?? '')])->values(),
                'amenities' => array_values(array_slice((array) ($card['amenities'] ?? []), 0, 30)),
                'photos_count' => count((array) ($card['photos'] ?? $parsed->raw['photoUrls'] ?? [])),
                'clinic' => $parsed->clinic?->only(['id', 'name', 'slug', 'status']),
                'match' => $parsed->matchClinic ? [...$parsed->matchClinic->only(['id', 'name', 'slug', 'status', 'address', 'phone']), 'reason' => $parsed->match_reason] : null,
                'task' => $parsed->task ? ['id' => $parsed->task->id, 'type' => ParserTask::TYPES[$parsed->task->type] ?? $parsed->task->type, 'at' => $parsed->task->created_at?->format('d.m.Y H:i')] : null,
                'imported' => $parsed->imported_at ? ['at' => $parsed->imported_at->format('d.m.Y H:i'), 'by' => $parsed->importer?->name] : null,
                'importable' => $parsed->isImportable(),
                'synced_at' => $parsed->last_synced_at?->format('d.m.Y H:i'),
            ],
            'contacts' => $parsed->contacts->sortBy('type')->values()->map(fn (OrganizationContact $c) => [
                'id' => $c->id,
                'type' => $c->type,
                'type_label' => OrganizationContact::TYPES[$c->type] ?? $c->type,
                'value' => $c->value,
                'source' => OrganizationContact::SOURCES[$c->source] ?? $c->source,
                'is_verified' => $c->is_verified,
                'do_not_contact' => $c->do_not_contact,
            ]),
            'network' => $network->map(fn (ParsedOrganization $p) => [...$p->only(['id', 'name', 'address', 'clinic_id']), 'status' => $p->status]),
            'email_tasks' => ParserTask::query()->where('parsed_organization_id', $parsed->id)->latest('id')->limit(5)->get()
                ->map(fn (ParserTask $t) => ['id' => $t->id, 'status' => $t->status, 'found' => $t->found_count, 'error' => $t->error, 'at' => $t->created_at?->format('d.m.Y H:i')]),
            'statuses' => ParsedOrganization::STATUSES,
            'contact_types' => OrganizationContact::TYPES,
            'task_statuses' => ParserTask::STATUSES,
            'offers' => request()->user()?->hasPermission('offers.manage') ? [
                'templates' => OfferTemplate::query()->where('is_active', true)->orderBy('name')->get(['id', 'name']),
                'current' => $parsed->clinic_id ? Offer::query()->where('clinic_id', $parsed->clinic_id)->latest('id')->first(['id', 'status'])?->only(['id', 'status']) : null,
                'allowed' => $parsed->clinic ? $parsed->clinic->status === 'draft' : $parsed->isImportable(),
            ] : null,
        ]);
    }

    public function storeTask(Request $request, ParserTaskService $service): RedirectResponse
    {
        $data = $request->validate([
            'city' => ['required', 'string', 'max:120', Rule::exists('cities', 'name')],
            'query' => ['nullable', 'string', Rule::in(array_keys(ParserTask::FILTERS))],
            'count' => ['required', 'integer', 'min:1', 'max:'.ParserTask::MAX_COLLECT_COUNT],
        ], [
            'city.exists' => 'Выберите город из справочника — импорт возможен только для них.',
            'count.max' => 'За один запуск — не больше '.ParserTask::MAX_COLLECT_COUNT.' клиник: парсер открывает каждую карточку, а задача ограничена 4 часами.',
        ]);

        try {
            $task = $service->launchSearch($data, $request->user());
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return to_route('admin.parser.index', ['tab' => 'tasks'])->with('success', $task->wasRecentlyCreated
            ? "Парсинг «{$data['city']}» запущен. Ход работы виден в индикаторе внизу экрана — можно переходить на другие страницы."
            : "Такой парсинг уже запускался сегодня (задача #{$task->id}).");
    }

    /** Состояние задач для индикатора процессов на всех страницах админки. */
    public function activity(Request $request): JsonResponse
    {
        $since = $request->query('since');
        $sinceAt = is_string($since) && $since !== '' ? rescue(fn () => now()->parse($since), null, false) : null;

        $active = ParserTask::query()->active()->with('parsedOrganization:id,name')->latest('id')->limit(10)->get();
        $finished = $sinceAt
            ? ParserTask::query()->whereIn('status', ParserTask::FINAL_STATUSES)->where('updated_at', '>', $sinceAt)
                ->with('parsedOrganization:id,name')->latest('id')->limit(10)->get()
            : collect();

        $row = fn (ParserTask $t) => [
            'id' => $t->id,
            'title' => $t->title(),
            'status' => $t->status,
            'status_label' => ParserTask::STATUSES[$t->status] ?? $t->status,
            'progress' => $t->type === 'page.html' && ! $t->isFinal() ? null : $t->progress,
            'stage' => $t->stage(),
            'purpose' => $t->purpose,
            'parsed_organization_id' => $t->parsed_organization_id,
            'found' => $t->found_count,
            'created' => $t->new_count,
            'started' => $t->created_at?->diffForHumans(),
            'checked' => $t->last_polled_at?->diffForHumans(),
            ...$this->collectInfo($t),
        ];

        return response()->json([
            'now' => now()->toIso8601String(),
            'active' => $active->map($row)->values(),
            'finished' => $finished->map($row)->values(),
        ]);
    }

    public function refreshTask(ParserTask $task, ParserTaskService $service): RedirectResponse
    {
        try {
            $task = $service->poll($task);
        } catch (Throwable $e) {
            return back()->with('error', 'Парсер не ответил: '.$e->getMessage());
        }

        return back()->with('success', 'Статус: '.ParserTask::STATUSES[$task->status].'.');
    }

    public function cancelTask(ParserTask $task, ParserTaskService $service): RedirectResponse
    {
        try {
            $service->cancel($task);
        } catch (Throwable $e) {
            return back()->with('error', 'Не удалось отменить: '.$e->getMessage());
        }

        return back()->with('success', "Задача #{$task->id} отменена.");
    }

    public function sync(Request $request): RedirectResponse
    {
        $data = $request->validate(['city' => ['required', 'string', 'max:120']]);

        $running = ParserTask::query()->active()->where('type', 'base.sync')->get()
            ->first(fn (ParserTask $t) => ($t->input['city'] ?? null) === $data['city']);
        if ($running) {
            return back()->with('error', "Загрузка «{$data['city']}» уже идёт — следите за индикатором внизу экрана.");
        }

        $task = ParserTask::create([
            'type' => 'base.sync',
            'purpose' => 'sync',
            'input' => ['city' => $data['city'], 'category' => ParserTask::CATEGORY],
            'status' => 'queued',
            'created_by' => $request->user()->id,
        ]);
        SyncParserOrganizationsJob::dispatch($task->id);
        Audit::log('parser.sync_requested', $task, ['city' => $data['city']]);

        return back()->with('success', "Загрузка стоматологий «{$data['city']}» запущена. Ход работы — в индикаторе внизу экрана.");
    }

    public function import(Request $request, ParsedOrganization $parsed, ParsedOrganizationImporter $importer): RedirectResponse
    {
        try {
            $clinic = $importer->import($parsed, $request->user(), withPhotos: $request->boolean('photos', true));
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', "Черновик «{$clinic->name}» создан. На сайте он не виден до публикации.");
    }

    public function importMany(Request $request, ParsedOrganizationImporter $importer): RedirectResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer', 'exists:parsed_organizations,id'],
            'photos' => ['boolean'],
        ]);

        $imported = 0;
        $errors = [];
        foreach (ParsedOrganization::query()->whereIn('id', $data['ids'])->orderBy('id')->get() as $parsed) {
            try {
                $importer->import($parsed, $request->user(), withPhotos: (bool) ($data['photos'] ?? true));
                $imported++;
            } catch (RuntimeException $e) {
                $errors[] = "«{$parsed->name}»: {$e->getMessage()}";
            }
        }

        $message = "Импортировано в черновики: {$imported}.";
        if ($errors !== []) {
            return back()->with('error', $message.' Пропущено '.count($errors).': '.implode(' ', array_slice($errors, 0, 3)));
        }

        return back()->with('success', $message);
    }

    public function updateStatus(Request $request, ParsedOrganization $parsed): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['new', 'reviewed', 'duplicate', 'ignored'])],
            'match_clinic_id' => ['nullable', 'integer', 'exists:clinics,id'],
            'note' => ['nullable', 'string', 'max:2000'],
        ]);

        if ($parsed->status === 'imported') {
            return back()->with('error', 'Карточка уже импортирована — изменяйте черновик клиники.');
        }

        $parsed->forceFill([
            'status' => $data['status'],
            'note' => array_key_exists('note', $data) ? $data['note'] : $parsed->note,
            'match_clinic_id' => $data['match_clinic_id'] ?? $parsed->match_clinic_id,
        ])->save();
        Audit::log('parser.status_changed', $parsed, ['status' => $data['status']]);

        return back()->with('success', 'Статус: «'.ParsedOrganization::STATUSES[$data['status']].'».');
    }

    public function updateMany(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:500'],
            'ids.*' => ['integer'],
            'status' => ['required', Rule::in(['new', 'reviewed', 'ignored'])],
        ]);

        $count = ParsedOrganization::query()->whereIn('id', $data['ids'])->where('status', '!=', 'imported')->update(['status' => $data['status']]);
        Audit::log('parser.status_changed', null, ['status' => $data['status'], 'count' => $count]);

        return back()->with('success', "Обновлено карточек: {$count}.");
    }

    public function findEmails(Request $request, ParsedOrganization $parsed, ParserTaskService $service): RedirectResponse
    {
        try {
            $service->launchEmailSearch($parsed, $request->user());
        } catch (RuntimeException $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Поиск email на сайте запущен. Результат появится в контактах через 1–2 минуты.');
    }

    public function storeContact(Request $request, ParsedOrganization $parsed): RedirectResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(array_keys(OrganizationContact::TYPES))],
            'value' => ['required', 'string', 'max:255', $request->input('type') === 'email' ? 'email' : 'string'],
        ]);

        $contact = OrganizationContact::query()->firstOrCreate(
            ['parsed_organization_id' => $parsed->id, 'type' => $data['type'], 'value' => trim($data['value'])],
            ['source' => 'manual', 'is_verified' => true, 'clinic_id' => $parsed->clinic_id],
        );
        Audit::log('parser.contact_added', $parsed, ['type' => $contact->type]);

        return back()->with('success', 'Контакт добавлен.');
    }

    public function updateContact(Request $request, OrganizationContact $contact): RedirectResponse
    {
        $data = $request->validate([
            'is_verified' => ['sometimes', 'boolean'],
            'do_not_contact' => ['sometimes', 'boolean'],
        ]);
        $contact->update($data);
        Audit::log('parser.contact_updated', $contact, $data);

        return back()->with('success', 'Контакт обновлён.');
    }

    public function destroyContact(OrganizationContact $contact): RedirectResponse
    {
        $contact->delete();
        Audit::log('parser.contact_deleted', $contact, ['type' => $contact->type]);

        return back()->with('success', 'Контакт удалён.');
    }

    /** @return array<string, int> */
    private function statusCounts(): array
    {
        $counts = ParsedOrganization::query()->selectRaw('status, count(*) as c')->groupBy('status')->pluck('c', 'status')->map(fn ($c) => (int) $c)->all();

        return [
            ...array_fill_keys(array_keys(ParsedOrganization::STATUSES), 0),
            ...$counts,
            'matches' => ParsedOrganization::query()->whereNotNull('match_clinic_id')->whereNotIn('status', ParsedOrganization::LOCKED_STATUSES)->count(),
            'active_tasks' => ParserTask::query()->active()->count(),
        ];
    }

    /** @return array<string, mixed> */
    private function organizations(Request $request): array
    {
        $q = trim((string) $request->query('q'));
        $status = $request->query('status');
        $has = $request->query('has');

        $page = ParsedOrganization::query()
            ->with(['city:id,name', 'matchClinic:id,name'])
            ->withCount(['contacts as emails_count' => fn (Builder $c) => $c->where('type', 'email')])
            ->when($q !== '', fn (Builder $b) => $b->where(fn (Builder $w) => $w->whereLike('name', "%{$q}%")->orWhereLike('address', "%{$q}%")->orWhere('external_id', $q)))
            ->when($status, fn (Builder $b) => $b->where('status', $status), fn (Builder $b) => $b->where('status', '!=', 'ignored'))
            ->when(is_string($request->query('city')) ? trim($request->query('city')) : '', fn (Builder $b, string $city) => ctype_digit($city)
                ? $b->where('city_id', (int) $city)
                : $b->where(fn (Builder $q) => $q->where('city_name', $city)->orWhereHas('city', fn (Builder $c) => $c->where('name', $city))))
            ->when($has === 'website', fn (Builder $b) => $b->whereNotNull('website'))
            ->when($has === 'no_website', fn (Builder $b) => $b->whereNull('website'))
            ->when($has === 'email', fn (Builder $b) => $b->whereHas('contacts', fn (Builder $c) => $c->where('type', 'email')))
            ->when($has === 'messenger', fn (Builder $b) => $b->whereHas('contacts', fn (Builder $c) => $c->whereIn('type', ['telegram', 'whatsapp', 'vk', 'max'])))
            ->when($has === 'full', fn (Builder $b) => $b->where('has_full_card', true))
            ->when($request->query('match') === 'yes', fn (Builder $b) => $b->whereNotNull('match_clinic_id'))
            ->when($request->query('match') === 'network', fn (Builder $b) => $b->whereNotNull('group_key'))
            ->orderByDesc('id')
            ->paginate(30)
            ->withQueryString();

        $groupSizes = ParsedOrganization::query()->whereIn('group_key', $page->getCollection()->pluck('group_key')->filter()->unique())
            ->selectRaw('group_key, count(*) as c')->groupBy('group_key')->pluck('c', 'group_key');
        $clinicIds = $page->getCollection()->pluck('clinic_id')->filter()->unique();
        $draftIds = Clinic::query()->whereIn('id', $clinicIds)->where('status', 'draft')->pluck('id')->flip();
        $offers = Offer::query()->whereIn('clinic_id', $clinicIds)->whereNull('revoked_at')->latest('id')->get(['id', 'clinic_id'])->keyBy('clinic_id');

        return $page->through(fn (ParsedOrganization $p) => [
            ...$this->row($p),
            'emails_count' => (int) $p->emails_count,
            'match' => $p->matchClinic ? ['id' => $p->matchClinic->id, 'name' => $p->matchClinic->name, 'reason' => $p->match_reason] : null,
            'network_size' => $p->group_key ? (int) ($groupSizes[$p->group_key] ?? 1) : 0,
            'importable' => $p->isImportable(),
            'offerable' => ($p->isImportable() || ($p->clinic_id && isset($draftIds[$p->clinic_id]))) && ! isset($offers[$p->clinic_id ?? 0]),
            'offer_id' => $p->clinic_id ? $offers[$p->clinic_id]?->id : null,
        ])->toArray();
    }

    /** @return array<string, mixed> */
    private function row(ParsedOrganization $p): array
    {
        return [
            'id' => $p->id,
            'external_id' => $p->external_id,
            'name' => $p->name,
            'city' => $p->city?->name ?? $p->city_name,
            'city_known' => $p->city_id !== null,
            'address' => $p->address,
            'phones' => $p->phones ?? [],
            'website' => $p->website,
            'rating' => $p->rating,
            'reviews_count' => $p->reviews_count,
            'status' => $p->status,
            'clinic_id' => $p->clinic_id,
            'has_full_card' => $p->has_full_card,
        ];
    }

    /**
     * Подробности сбора для интерфейса: шкала этапов, счётчики, ETA, капча, ссылка на страницу статуса.
     *
     * @return array{target: int|null, collected: int, eta_sec: int|null, attention: string|null, stage_label: string|null, stages: list<array{id: string, label: string, state: string}>, last_organization: string|null, status_page: string|null}
     */
    private function collectInfo(ParserTask $task): array
    {
        $stages = collect((array) data_get($task->remote, 'stages', []))
            ->filter(fn ($s) => is_array($s) && isset($s['label']))
            ->map(fn (array $s) => ['id' => (string) ($s['id'] ?? $s['label']), 'label' => (string) $s['label'], 'state' => (string) ($s['state'] ?? 'pending')])
            ->values()->all();

        return [
            'target' => $task->targetCount(),
            'collected' => $task->collected_count,
            'eta_sec' => $task->etaSeconds(),
            'attention' => $task->attention(),
            'stage_label' => data_get($task->remote, 'stageLabel'),
            'stages' => $stages,
            'last_organization' => $task->isFinal() ? null : data_get($task->remote, 'lastOrganization'),
            'status_page' => $task->status_page_url,
        ];
    }

    /** @return array<string, mixed> */
    private function tasks(): array
    {
        return ParserTask::query()->with('creator:id,name')->where('purpose', '!=', 'emails')->latest('id')->paginate(20, ['*'], 'tasks_page')->withQueryString()
            ->through(fn (ParserTask $t) => [
                'id' => $t->id,
                'title' => $t->title(),
                'stage' => $t->stage(),
                'type' => $t->type,
                'city' => $t->input['city'] ?? null,
                'category' => $t->input['category'] ?? null,
                'query' => $t->input['query'] ?? $t->input['searchQuery'] ?? null,
                'max_results' => $t->targetCount(),
                'max_cost' => $t->input['maxCostUsd'] ?? null,
                ...$this->collectInfo($t),
                'status' => $t->status,
                'progress' => $t->progress,
                'found' => $t->found_count,
                'created' => $t->new_count,
                'cost_usd' => $t->cost_usd !== null ? (float) $t->cost_usd : null,
                'error' => $t->error,
                'is_final' => $t->isFinal(),
                'by' => $t->creator?->name,
                'at' => $t->created_at?->format('d.m.Y H:i'),
                'completed_at' => $t->completed_at?->format('d.m.Y H:i'),
            ])->toArray();
    }

    /** @return array<string, mixed> */
    private function base(Request $request): array
    {
        $client = ParserOrganizationsClient::fromConfig();
        if (! $client->configured()) {
            return ['error' => 'Парсер не настроен — укажите адрес и API-ключ в разделе «Интеграции».', 'cities' => [], 'categories' => null];
        }

        $local = ParsedOrganization::query()->selectRaw('city_name, count(*) as c')->groupBy('city_name')->pluck('c', 'city_name');
        $knownCities = City::query()->pluck('name')->map(fn (string $name) => Text::normalize($name))->flip();
        $baseCity = trim((string) $request->query('base_city'));

        try {
            $cities = Cache::remember('parser.base.dental-cities', 120, fn () => $client->cities(['category' => ParserTask::BASE_CATEGORY]));
            $categories = $baseCity !== ''
                ? Cache::remember('parser.base.categories.'.md5($baseCity), 300, fn () => $client->categories(['city' => $baseCity, 'category' => ParserTask::BASE_CATEGORY]))
                : null;
        } catch (Throwable $e) {
            return ['error' => 'База парсера недоступна: '.mb_substr($e->getMessage(), 0, 200), 'cities' => [], 'categories' => null];
        }

        return [
            'error' => null,
            'total' => (int) ($cities['total'] ?? 0),
            'cities' => collect($cities['cities'] ?? [])->map(fn (array $c) => [
                'city' => (string) $c['city'],
                'region' => $c['region'] ?? null,
                'count' => (int) ($c['count'] ?? 0),
                'with_phone' => (int) ($c['withPhone'] ?? 0),
                'with_website' => (int) ($c['withWebsite'] ?? 0),
                'avg_rating' => $c['avgRating'] ?? null,
                'categories' => $c['searchCategories'] ?? [],
                'updated_at' => isset($c['lastUpdatedAt']) ? now()->parse($c['lastUpdatedAt'])->format('d.m.Y') : null,
                'loaded' => (int) ($local[$c['city']] ?? 0),
                'known' => $knownCities->has(Text::normalize((string) $c['city'])),
            ])->values(),
            'categories' => $categories,
            'city' => $baseCity,
        ];
    }

    /** @return array<string, float|null> */
    private function limits(): array
    {
        return [
            'task_cost_limit_usd' => is_numeric(config('services.parser_ai.task_cost_limit_usd')) ? (float) config('services.parser_ai.task_cost_limit_usd') : null,
            'daily_budget_usd' => is_numeric(config('services.parser_ai.daily_budget_usd')) ? (float) config('services.parser_ai.daily_budget_usd') : null,
            'spent_today_usd' => round((float) ParserTask::query()->where('created_at', '>=', now()->startOfDay())->sum('cost_usd'), 4),
        ];
    }
}
