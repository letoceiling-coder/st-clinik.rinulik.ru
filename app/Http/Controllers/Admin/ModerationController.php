<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Cabinet\MediaController;
use App\Models\Clinic;
use App\Models\ClinicDocument;
use App\Models\ClinicPhoto;
use App\Models\Doctor;
use App\Models\Review;
use App\Services\ContentModerationSettings;
use App\Services\ModerationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ModerationController extends AdminController
{
    public function index(): Response
    {
        $queue = [];

        foreach (Clinic::where('status', 'pending')->with('city:id,name')->latest()->limit(30)->get() as $c) {
            $queue[] = ['type' => 'clinic', 'id' => $c->id, 'title' => $c->name, 'meta' => $c->city?->name.', '.$c->address, 'body' => $c->description, 'at' => $c->updated_at?->format('d.m H:i')];
        }
        foreach (Doctor::where('status', 'pending')->with('clinic:id,name')->latest()->limit(30)->get() as $d) {
            $queue[] = ['type' => 'doctor', 'id' => $d->id, 'title' => $d->name, 'meta' => $d->position.' · '.$d->clinic?->name, 'body' => $d->bio, 'at' => $d->updated_at?->format('d.m H:i')];
        }
        foreach (ClinicDocument::where('status', 'pending')->with('clinic:id,name')->latest()->limit(30)->get() as $d) {
            $queue[] = ['type' => 'document', 'id' => $d->id, 'title' => $d->title, 'meta' => ($d->clinic?->name).' · № '.($d->number ?: 'не указан'), 'has_file' => (bool) $d->path, 'at' => $d->created_at?->format('d.m H:i')];
        }
        foreach (ClinicPhoto::where('status', 'pending')->with('clinic:id,name')->latest()->limit(30)->get() as $p) {
            $queue[] = ['type' => 'photo', 'id' => $p->id, 'title' => 'Фото: '.($p->caption ?: (MediaController::PHOTO_KINDS[$p->kind] ?? 'без подписи')), 'meta' => $p->clinic?->name, 'image' => $p->path ? Storage::disk('public')->url($p->path) : null, 'at' => $p->created_at?->format('d.m H:i')];
        }
        foreach (Review::where('status', 'pending')->with('clinic:id,name')->latest()->limit(30)->get() as $r) {
            $queue[] = ['type' => 'review', 'id' => $r->id, 'title' => $r->author_name.' · '.str_repeat('★', $r->rating), 'meta' => $r->clinic?->name.($r->is_verified_visit ? ' · подтверждённый визит' : ''), 'body' => $r->body, 'flags' => $r->flags, 'at' => $r->created_at?->format('d.m H:i')];
        }
        foreach (Review::where('reply_status', 'pending')->with('clinic:id,name')->latest()->limit(30)->get() as $r) {
            $queue[] = [
                'type' => 'review_reply',
                'id' => $r->id,
                'title' => 'Ответ · '.$r->clinic?->name,
                'meta' => 'к отзыву '.$r->author_name.' · '.str_repeat('★', $r->rating),
                'body' => $r->reply_text,
                'at' => $r->updated_at?->format('d.m H:i'),
            ];
        }

        return $this->render('Admin/Moderation', 'Очередь модерации', [
            'queue' => collect($queue)->sortByDesc('at')->values(),
            'typeLabels' => [
                'clinic' => 'Клиника',
                'doctor' => 'Врач',
                'document' => 'Документ',
                'photo' => 'Фото',
                'review' => 'Отзыв',
                'review_reply' => 'Ответ на отзыв',
            ],
            'content_moderation_settings' => app(ContentModerationSettings::class)->all(),
        ]);
    }

    public function decide(Request $request, string $type, int $id, ModerationService $moderation): RedirectResponse
    {
        abort_unless(in_array($type, ModerationService::TYPES, true), 404);
        $data = $request->validate([
            'decision' => 'required|in:approve,reject',
            'note' => 'nullable|string|max:500',
        ]);
        if ($data['decision'] === 'reject' && blank($data['note'] ?? null) && in_array($type, ['clinic', 'doctor', 'document', 'review', 'review_reply'], true)) {
            return back()->withErrors(['note' => 'Укажите причину отклонения — её увидит автор.']);
        }

        $moderation->decide($type, $id, $data['decision'], $data['note'] ?? null);

        return back()->with('success', $data['decision'] === 'approve' ? 'Одобрено.' : 'Отклонено.');
    }

    public function updateSettings(Request $request, ContentModerationSettings $settings): RedirectResponse
    {
        $data = $request->validate([
            'moderate_review_replies' => ['boolean'],
            'moderate_promotions' => ['boolean'],
        ]);

        $settings->save([
            'moderate_review_replies' => (bool) ($data['moderate_review_replies'] ?? false),
            'moderate_promotions' => (bool) ($data['moderate_promotions'] ?? false),
        ]);

        return back()->with('success', 'Настройки модерации сохранены.');
    }

    public function document(ClinicDocument $document): StreamedResponse
    {
        abort_unless($document->path && Storage::disk('local')->exists($document->path), 404);

        return Storage::disk('local')->download($document->path);
    }
}
