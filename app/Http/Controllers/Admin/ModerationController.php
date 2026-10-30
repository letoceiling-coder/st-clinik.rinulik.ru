<?php

namespace App\Http\Controllers\Admin;

use App\Models\ClinicDocument;
use App\Services\ContentModerationSettings;
use App\Services\ModerationQueue;
use App\Services\ModerationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ModerationController extends AdminController
{
    public function index(ModerationQueue $queue): Response
    {
        return $this->render('Admin/Moderation', 'Очередь модерации', [
            'queue' => $queue->items(),
            'typeLabels' => ModerationQueue::TYPE_LABELS,
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

    /** Файл документа для просмотра прямо в браузере (PDF или изображение), без скачивания. */
    public function viewDocument(ClinicDocument $document): StreamedResponse
    {
        abort_unless($document->path && Storage::disk('local')->exists($document->path), 404);

        return Storage::disk('local')->response($document->path, null, [
            'Content-Disposition' => 'inline',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);
    }
}
