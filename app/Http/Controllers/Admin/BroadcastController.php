<?php

namespace App\Http\Controllers\Admin;

use App\Models\Broadcast;
use App\Models\BroadcastRecipient;
use App\Models\City;
use App\Services\Audit;
use App\Services\Broadcasts\BroadcastService;
use App\Services\Broadcasts\ClinicBroadcastSettings;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Response;

/** Рассылки платформы подписчикам (фаза 5.4). */
class BroadcastController extends AdminController
{
    public function index(): Response
    {
        return $this->render('Admin/Broadcasts', 'Рассылки', [
            'broadcasts' => Broadcast::query()
                ->where('sender_type', Broadcast::SENDER_PLATFORM)
                ->with(['creator:id,name'])
                ->latest('id')
                ->paginate(30)
                ->through(fn (Broadcast $b) => [
                    'id' => $b->id,
                    'name' => $b->name,
                    'status' => $b->status,
                    'channels' => $b->channels,
                    'recipients_total' => $b->recipients_total,
                    'sent_count' => $b->sent_count,
                    'failed_count' => $b->failed_count,
                    'click_count' => $b->click_count,
                    'scheduled_at' => $b->scheduled_at?->format('d.m.Y H:i'),
                    'created_at' => $b->created_at?->format('d.m.Y H:i'),
                    'by' => $b->creator?->name,
                ])->toArray(),
            'cities' => City::query()->orderBy('name')->get(['id', 'name']),
            'channels' => Broadcast::CHANNELS,
            'statuses' => Broadcast::STATUSES,
            'roles' => [
                'user' => 'Пациенты',
                'clinic_owner' => 'Представители клиник',
            ],
            'pending_clinic' => Broadcast::query()
                ->where('sender_type', Broadcast::SENDER_CLINIC)
                ->where('moderation_status', Broadcast::MODERATION_PENDING)
                ->with('clinic:id,name')
                ->latest('id')
                ->limit(20)
                ->get()
                ->map(fn (Broadcast $b) => [
                    'id' => $b->id,
                    'name' => $b->name,
                    'clinic' => $b->clinic?->name,
                    'body' => mb_substr($b->body, 0, 200),
                    'recipients_total' => $b->recipients_total,
                    'created_at' => $b->created_at?->format('d.m.Y H:i'),
                ]),
            'clinic_settings' => app(ClinicBroadcastSettings::class)->all(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $broadcast = Broadcast::query()->create([
            ...$data,
            'sender_type' => Broadcast::SENDER_PLATFORM,
            'status' => 'draft',
            'created_by' => $request->user()->id,
        ]);
        Audit::log('broadcasts.created', $broadcast, ['by' => $request->user()->id]);

        return redirect()->route('admin.broadcasts.show', $broadcast)->with('success', 'Черновик рассылки создан.');
    }

    public function show(Broadcast $broadcast, BroadcastService $service): Response
    {
        abort_unless(in_array($broadcast->sender_type, [Broadcast::SENDER_PLATFORM, Broadcast::SENDER_CLINIC], true), 404);

        $broadcast->loadMissing('clinic:id,name');

        $byChannel = $broadcast->recipients()
            ->where('is_test', false)
            ->get(['channel', 'status', 'clicked_at'])
            ->groupBy('channel')
            ->map(fn ($rows, string $channel) => [
                'total' => $rows->count(),
                'sent' => $rows->where('status', BroadcastRecipient::STATUS_SENT)->count(),
                'failed' => $rows->where('status', BroadcastRecipient::STATUS_FAILED)->count(),
                'clicks' => $rows->whereNotNull('clicked_at')->count(),
            ]);

        return $this->render('Admin/BroadcastShow', $broadcast->name, [
            'broadcast' => [
                'id' => $broadcast->id,
                'sender_type' => $broadcast->sender_type,
                'clinic_name' => $broadcast->clinic?->name,
                'moderation_status' => $broadcast->moderation_status,
                'moderation_note' => $broadcast->moderation_note,
                'name' => $broadcast->name,
                'body' => $broadcast->body,
                'button_label' => $broadcast->button_label,
                'button_url' => $broadcast->button_url,
                'channels' => $broadcast->channels,
                'filters' => $broadcast->filters ?? [],
                'status' => $broadcast->status,
                'scheduled_at' => $broadcast->scheduled_at?->format('Y-m-d\\TH:i'),
                'recipients_total' => $broadcast->recipients_total,
                'sent_count' => $broadcast->sent_count,
                'failed_count' => $broadcast->failed_count,
                'click_count' => $broadcast->click_count,
                'is_editable' => $broadcast->isEditable(),
                'created_at' => $broadcast->created_at?->format('d.m.Y H:i'),
            ],
            'by_channel' => $byChannel,
            'estimate' => $service->estimateAudience($broadcast),
            'channels' => Broadcast::CHANNELS,
            'statuses' => Broadcast::STATUSES,
            'cities' => City::query()->orderBy('name')->get(['id', 'name']),
            'roles' => [
                'user' => 'Пациенты',
                'clinic_owner' => 'Представители клиник',
            ],
            'recipients' => $broadcast->recipients()
                ->with('user:id,name,email')
                ->where('is_test', false)
                ->latest('id')
                ->paginate(40)
                ->through(fn (BroadcastRecipient $r) => [
                    'id' => $r->id,
                    'user' => $r->user?->name,
                    'channel' => $r->channel,
                    'status' => $r->status,
                    'error' => $r->error,
                    'sent_at' => $r->sent_at?->format('d.m.Y H:i'),
                    'clicked_at' => $r->clicked_at?->format('d.m.Y H:i'),
                ])->toArray(),
        ]);
    }

    public function update(Request $request, Broadcast $broadcast): RedirectResponse
    {
        abort_unless($broadcast->sender_type === Broadcast::SENDER_PLATFORM && $broadcast->isEditable(), 422);

        $broadcast->update($this->validated($request));
        Audit::log('broadcasts.updated', $broadcast, ['by' => $request->user()->id]);

        return back()->with('success', 'Рассылка сохранена.');
    }

    public function estimate(Broadcast $broadcast, BroadcastService $service): JsonResponse
    {
        abort_unless($broadcast->sender_type === Broadcast::SENDER_PLATFORM, 404);

        return response()->json($service->estimateAudience($broadcast));
    }

    public function preview(Request $request, Broadcast $broadcast, BroadcastService $service): JsonResponse
    {
        abort_unless($broadcast->sender_type === Broadcast::SENDER_PLATFORM, 404);

        $recipient = new BroadcastRecipient([
            'track_code' => 'preview000',
            'is_test' => true,
        ]);
        $recipient->setRelation('broadcast', $broadcast);

        return response()->json($service->renderForRecipient($broadcast, $recipient, testPrefix: true));
    }

    public function test(Request $request, Broadcast $broadcast, BroadcastService $service): RedirectResponse
    {
        abort_unless($broadcast->sender_type === Broadcast::SENDER_PLATFORM, 404);

        $sent = $service->sendTest($broadcast, $request->user());
        if ($sent === []) {
            return back()->with('error', 'Не удалось отправить тест: подключите канал в профиле и разрешите «Новости платформы».');
        }

        return back()->with('success', 'Тест отправлен: '.implode(', ', $sent).'.');
    }

    public function build(Broadcast $broadcast, BroadcastService $service): RedirectResponse
    {
        abort_unless($broadcast->sender_type === Broadcast::SENDER_PLATFORM, 404);

        $result = $service->buildRecipients($broadcast);

        return back()->with('success', "Список получателей обновлён: {$result['created']} строк, пропущено {$result['skipped']}.");
    }

    public function start(Broadcast $broadcast, BroadcastService $service): RedirectResponse
    {
        abort_unless($broadcast->sender_type === Broadcast::SENDER_PLATFORM, 404);

        try {
            $service->start($broadcast);
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }

        Audit::log('broadcasts.started', $broadcast, ['by' => request()->user()?->id]);

        return back()->with('success', 'Отправка запущена.');
    }

    public function pause(Broadcast $broadcast, BroadcastService $service): RedirectResponse
    {
        $service->pause($broadcast);

        return back()->with('success', 'Рассылка на паузе.');
    }

    public function cancel(Broadcast $broadcast, BroadcastService $service): RedirectResponse
    {
        $service->cancel($broadcast);

        return back()->with('success', 'Рассылка отменена.');
    }

    public function moderate(Request $request, Broadcast $broadcast, BroadcastService $service): RedirectResponse
    {
        $data = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        if ($data['decision'] === 'reject' && blank($data['note'] ?? null)) {
            return back()->withErrors(['note' => 'Укажите причину отклонения для клиники.']);
        }

        $service->moderateClinic($broadcast, $data['decision'], $data['note'] ?? null);
        Audit::log('broadcasts.moderated', $broadcast, $data);

        return back()->with('success', $data['decision'] === 'approve' ? 'Рассылка одобрена.' : 'Рассылка отклонена.');
    }

    public function updateClinicSettings(Request $request, ClinicBroadcastSettings $settings): RedirectResponse
    {
        $data = $request->validate([
            'enabled' => ['sometimes', 'boolean'],
            'max_per_week' => ['sometimes', 'integer', 'min:1', 'max:20'],
            'max_body_length' => ['sometimes', 'integer', 'min:200', 'max:8000'],
            'requires_active_promotion' => ['sometimes', 'boolean'],
        ]);

        $settings->save([
            'enabled' => $request->boolean('enabled'),
            'max_per_week' => (int) $request->input('max_per_week', $settings->all()['max_per_week']),
            'max_body_length' => (int) $request->input('max_body_length', $settings->all()['max_body_length']),
            'requires_active_promotion' => $request->boolean('requires_active_promotion'),
        ]);

        return back()->with('success', 'Настройки рассылок клиник сохранены.');
    }

    public function schedule(Request $request, Broadcast $broadcast, BroadcastService $service): RedirectResponse
    {
        abort_unless($broadcast->sender_type === Broadcast::SENDER_PLATFORM && $broadcast->status === 'draft', 422);

        $data = $request->validate([
            'scheduled_at' => ['required', 'date', 'after:now'],
        ]);

        $service->schedule($broadcast, $data['scheduled_at']);
        Audit::log('broadcasts.scheduled', $broadcast, ['at' => $data['scheduled_at']]);

        return back()->with('success', 'Рассылка запланирована.');
    }

    /** @return array<string, mixed> */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
            'body' => ['required', 'string', 'max:8000'],
            'button_label' => ['nullable', 'string', 'max:80'],
            'button_url' => ['nullable', 'url', 'max:500'],
            'channels' => ['required', 'array', 'min:1'],
            'channels.*' => [Rule::in(array_keys(Broadcast::CHANNELS))],
            'filters' => ['nullable', 'array'],
            'filters.city_id' => ['nullable', 'integer', Rule::exists('cities', 'id')],
            'filters.roles' => ['nullable', 'array'],
            'filters.roles.*' => [Rule::in(['user', 'clinic_owner'])],
            'filters.active_within_days' => ['nullable', 'integer', 'min:0', 'max:365'],
        ]);

        $filters = is_array($data['filters'] ?? null) ? $data['filters'] : [];
        if (($filters['city_id'] ?? '') === '') {
            unset($filters['city_id']);
        }
        if ((int) ($filters['active_within_days'] ?? 0) === 0) {
            unset($filters['active_within_days']);
        }
        $filters['roles'] = array_values(array_filter((array) ($filters['roles'] ?? ['user'])));

        return [
            'name' => $data['name'],
            'body' => $data['body'],
            'button_label' => $data['button_label'] ?? null,
            'button_url' => $data['button_url'] ?? null,
            'channels' => array_values(array_unique($data['channels'])),
            'filters' => $filters,
        ];
    }
}
