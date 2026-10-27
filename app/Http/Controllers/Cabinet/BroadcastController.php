<?php

namespace App\Http\Controllers\Cabinet;

use App\Http\Controllers\Controller;
use App\Models\Broadcast;
use App\Models\Clinic;
use App\Services\Broadcasts\BroadcastService;
use App\Services\Broadcasts\ClinicBroadcastSettings;
use App\Services\Broadcasts\ClinicFollowerService;
use App\Services\Seo;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Response;

class BroadcastController extends Controller
{
    public function index(Request $request, ClinicFollowerService $followers, ClinicBroadcastSettings $settings): Response
    {
        /** @var Clinic $clinic */
        $clinic = $request->attributes->get('branch') ?? abort(403);

        $cfg = $settings->all();

        return $this->page('Cabinet/Broadcasts', [
            'broadcasts' => Broadcast::query()
                ->where('sender_type', Broadcast::SENDER_CLINIC)
                ->where('clinic_id', $clinic->id)
                ->latest('id')
                ->limit(30)
                ->get()
                ->map(fn (Broadcast $b) => [
                    'id' => $b->id,
                    'name' => $b->name,
                    'status' => $b->status,
                    'moderation_status' => $b->moderation_status,
                    'recipients_total' => $b->recipients_total,
                    'sent_count' => $b->sent_count,
                    'click_count' => $b->click_count,
                    'created_at' => $b->created_at?->format('d.m.Y H:i'),
                ]),
            'followers_count' => $followers->followerCount($clinic),
            'may_broadcast' => $settings->clinicMayBroadcast($clinic) && $cfg['enabled'],
            'limits' => [
                'max_per_week' => $cfg['max_per_week'],
                'used_this_week' => $settings->broadcastsThisWeek($clinic),
                'max_body_length' => $cfg['max_body_length'],
            ],
            'channels' => Broadcast::CHANNELS,
            'moderation_labels' => [
                Broadcast::MODERATION_PENDING => 'На модерации',
                Broadcast::MODERATION_APPROVED => 'Одобрено',
                Broadcast::MODERATION_REJECTED => 'Отклонено',
            ],
        ], app(Seo::class)->private('Рассылки подписчикам'));
    }

    public function store(Request $request, BroadcastService $broadcasts, ClinicBroadcastSettings $settings): RedirectResponse
    {
        /** @var Clinic $clinic */
        $clinic = $request->attributes->get('branch') ?? abort(403);
        abort_unless($settings->clinicMayBroadcast($clinic), 422);

        $data = $this->validated($request);

        Broadcast::query()->create([
            ...$data,
            'sender_type' => Broadcast::SENDER_CLINIC,
            'clinic_id' => $clinic->id,
            'status' => 'draft',
            'created_by' => $request->user()->id,
        ]);

        return redirect()->route('cabinet.broadcasts.index')->with('success', 'Черновик рассылки создан.');
    }

    public function submit(Request $request, Broadcast $broadcast, BroadcastService $broadcasts): RedirectResponse
    {
        /** @var Clinic $clinic */
        $clinic = $request->attributes->get('branch') ?? abort(403);
        abort_unless($broadcast->clinic_id === $clinic->id, 404);

        try {
            $broadcasts->submitClinicForModeration($broadcast, $clinic);
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Рассылка отправлена на модерацию.');
    }

    public function start(Request $request, Broadcast $broadcast, BroadcastService $broadcasts): RedirectResponse
    {
        /** @var Clinic $clinic */
        $clinic = $request->attributes->get('branch') ?? abort(403);
        abort_unless($broadcast->clinic_id === $clinic->id, 404);

        try {
            $broadcasts->start($broadcast);
        } catch (\Throwable $e) {
            return back()->with('error', $e->getMessage());
        }

        return back()->with('success', 'Отправка запущена.');
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
        ]);

        return [
            'name' => $data['name'],
            'body' => $data['body'],
            'button_label' => $data['button_label'] ?? null,
            'button_url' => $data['button_url'] ?? null,
            'channels' => array_values(array_unique($data['channels'])),
            'filters' => null,
        ];
    }
}
