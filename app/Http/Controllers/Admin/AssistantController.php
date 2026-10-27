<?php

namespace App\Http\Controllers\Admin;

use App\Jobs\IndexAssistantKbEntryJob;
use App\Models\AssistantConversation;
use App\Models\AssistantKbEntry;
use App\Models\City;
use App\Repositories\Contracts\CatalogRepository;
use App\Services\Assistant\AssistantMetrics;
use App\Services\Assistant\AssistantSettings;
use App\Services\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class AssistantController extends AdminController
{
    public function edit(AssistantSettings $settings, CatalogRepository $catalog, AssistantMetrics $metrics): Response
    {
        $recent = AssistantConversation::query()
            ->with(['city:id,name'])
            ->withCount('messages')
            ->orderByDesc('last_message_at')
            ->limit(30)
            ->get()
            ->map(fn (AssistantConversation $c) => [
                'public_id' => $c->public_id,
                'channel' => $c->channel,
                'city' => $c->city?->name,
                'messages_count' => $c->messages_count,
                'last_message_at' => $c->last_message_at?->toIso8601String(),
            ]);

        $kbEntries = AssistantKbEntry::query()
            ->with('city:id,name')
            ->orderBy('sort')
            ->orderBy('id')
            ->get()
            ->map(fn (AssistantKbEntry $e) => [
                'id' => $e->id,
                'question' => $e->question,
                'answer' => $e->answer,
                'city_id' => $e->city_id,
                'city' => $e->city?->name,
                'is_active' => $e->is_active,
                'sort' => $e->sort,
            ]);

        return $this->render('Admin/Assistant', 'AI-ассистент', [
            'settings' => $settings->get(),
            'metrics' => $metrics->summary(),
            'recentConversations' => $recent,
            'kbEntries' => $kbEntries,
            'cities' => $catalog->cities()->map(fn (City $c) => ['id' => $c->id, 'name' => $c->name]),
        ]);
    }

    public function show(AssistantConversation $conversation): Response
    {
        $conversation->load([
            'city:id,name',
            'user:id,name,email',
            'messages' => fn ($q) => $q->orderBy('id'),
        ]);

        return $this->render('Admin/AssistantConversation', 'Диалог ассистента', [
            'conversation' => [
                'public_id' => $conversation->public_id,
                'channel' => $conversation->channel,
                'city' => $conversation->city?->name,
                'user' => $conversation->user ? [
                    'name' => $conversation->user->name,
                    'email' => $conversation->user->email,
                ] : null,
                'last_message_at' => $conversation->last_message_at?->toIso8601String(),
                'messages' => $conversation->messages->map(fn ($m) => [
                    'role' => $m->role,
                    'content' => $m->content,
                    'meta' => $m->meta,
                    'created_at' => $m->created_at?->toIso8601String(),
                ]),
            ],
        ]);
    }

    public function update(Request $request, AssistantSettings $settings): RedirectResponse
    {
        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'mock_mode' => ['required', 'boolean'],
            'stream_responses' => ['required', 'boolean'],
            'greeting' => ['required', 'string', 'max:2000'],
            'disclaimer' => ['required', 'string', 'max:2000'],
            'system_prompt' => ['nullable', 'string', 'max:8000'],
            'max_messages_per_conversation' => ['required', 'integer', 'min:5', 'max:200'],
            'max_messages_per_ip_per_day' => ['required', 'integer', 'min:10', 'max:500'],
            'assistant_lead_broadcast_count' => ['required', 'integer', 'min:1', 'max:5'],
            'assistant_lead_exclusive_first' => ['required', 'boolean'],
        ]);

        $settings->save($data);
        Audit::log('assistant.settings_updated', $request->user());

        return back()->with('success', 'Настройки ассистента сохранены.');
    }

    public function storeKb(Request $request): RedirectResponse
    {
        $data = $this->validateKb($request);
        $entry = AssistantKbEntry::query()->create($data);
        IndexAssistantKbEntryJob::dispatch($entry->id);
        Audit::log('assistant.kb_created', $request->user());

        return back()->with('success', 'Запись базы знаний добавлена.');
    }

    public function updateKb(Request $request, AssistantKbEntry $entry): RedirectResponse
    {
        $entry->update($this->validateKb($request));
        IndexAssistantKbEntryJob::dispatch($entry->id);
        Audit::log('assistant.kb_updated', $request->user(), ['entry_id' => $entry->id]);

        return back()->with('success', 'Запись обновлена.');
    }

    public function destroyKb(Request $request, AssistantKbEntry $entry): RedirectResponse
    {
        $entry->delete();
        Audit::log('assistant.kb_deleted', $request->user(), ['entry_id' => $entry->id]);

        return back()->with('success', 'Запись удалена.');
    }

    /** @return array<string, mixed> */
    private function validateKb(Request $request): array
    {
        $data = $request->validate([
            'question' => ['required', 'string', 'max:500'],
            'answer' => ['required', 'string', 'max:5000'],
            'city_id' => ['nullable', 'integer', 'exists:cities,id'],
            'is_active' => ['required', 'boolean'],
            'sort' => ['nullable', 'integer', 'min:0', 'max:9999'],
        ]);

        $data['sort'] = (int) ($data['sort'] ?? 0);

        return $data;
    }
}
