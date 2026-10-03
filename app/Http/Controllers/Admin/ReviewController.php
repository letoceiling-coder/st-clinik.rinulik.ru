<?php

namespace App\Http\Controllers\Admin;

use App\Models\Review;
use App\Models\ReviewComplaint;
use App\Models\UserNotification;
use App\Services\Audit;
use App\Services\ModerationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class ReviewController extends AdminController
{
    public function index(Request $request): Response
    {
        $status = $request->query('status');
        $q = trim((string) $request->query('q'));

        $page = Review::with('clinic:id,name')
            ->when($status, fn ($b) => $b->where('status', $status))
            ->when($q !== '', fn ($b) => $b->where(fn ($w) => $w->where('body', 'like', "%$q%")->orWhere('author_name', 'like', "%$q%")))
            ->latest()->paginate(15)->withQueryString();

        return $this->render('Admin/Reviews', 'Отзывы', [
            'reviews' => $page->through(fn (Review $r) => [
                'id' => $r->id, 'author' => $r->author_name, 'clinic' => $r->clinic?->name, 'rating' => $r->rating, 'title' => $r->title,
                'body' => $r->body, 'status' => $r->status, 'flags' => $r->flags, 'moderation_note' => $r->moderation_note,
                'is_verified_visit' => $r->is_verified_visit, 'created_at' => $r->created_at?->format('d.m.Y'),
            ])->toArray(),
            'statuses' => Review::STATUSES,
            'filters' => array_filter(['status' => $status, 'q' => $q]),
        ]);
    }

    public function update(Request $request, Review $review, ModerationService $moderation): RedirectResponse
    {
        $data = $request->validate([
            'action' => 'required|in:approve,reject,hide,restore',
            'note' => 'nullable|string|max:500',
        ]);

        match ($data['action']) {
            'approve' => $moderation->decide('review', $review->id, 'approve'),
            'reject' => $moderation->decide('review', $review->id, 'reject', $data['note'] ?? 'Отзыв нарушает правила публикации.'),
            'hide' => $moderation->hideReview($review, true, $data['note'] ?? null),
            'restore' => $moderation->hideReview($review, false),
        };
        Audit::log('review.'.$data['action'], $review);

        return back()->with('success', 'Готово.');
    }

    public function complaints(Request $request): Response
    {
        $status = $request->query('status', 'open');

        $page = ReviewComplaint::with(['review.clinic:id,name', 'reporter:id,name'])
            ->when($status !== 'all', fn ($b) => $b->where('status', $status))
            ->latest()->paginate(15)->withQueryString();

        return $this->render('Admin/Complaints', 'Жалобы на отзывы', [
            'complaints' => $page->through(fn (ReviewComplaint $c) => [
                'id' => $c->id, 'reason' => ReviewComplaint::REASONS[$c->reason] ?? $c->reason, 'comment' => $c->comment,
                'reporter' => $c->reporter?->name ?? 'аноним', 'reporter_role' => $c->reporter_role, 'status' => $c->status,
                'resolution' => $c->resolution, 'created_at' => $c->created_at?->format('d.m.Y H:i'),
                'review' => $c->review ? [
                    'id' => $c->review->id, 'author' => $c->review->author_name, 'rating' => $c->review->rating, 'body' => $c->review->body,
                    'status' => $c->review->status, 'clinic' => $c->review->clinic?->name,
                ] : null,
            ])->toArray(),
            'filters' => ['status' => $status],
        ]);
    }

    public function resolve(Request $request, ReviewComplaint $complaint, ModerationService $moderation): RedirectResponse
    {
        $data = $request->validate([
            'decision' => 'required|in:uphold,reject',
            'resolution' => 'nullable|string|max:500',
        ]);
        abort_unless($complaint->status === 'open', 422);

        $upheld = $data['decision'] === 'uphold';
        if ($upheld && $complaint->review) {
            $moderation->hideReview($complaint->review, true, $data['resolution'] ?? 'Скрыт по жалобе.');
        }

        $complaint->update([
            'status' => $upheld ? 'upheld' : 'rejected',
            'resolution' => $data['resolution'] ?? null,
            'resolved_by' => $request->user()->id,
            'resolved_at' => now(),
        ]);

        if ($complaint->reporter_id) {
            UserNotification::create([
                'user_id' => $complaint->reporter_id, 'type' => 'complaint_resolved', 'title' => 'Жалоба рассмотрена',
                'body' => $upheld ? 'Отзыв скрыт.' : 'Нарушений правил не обнаружено, отзыв остаётся опубликованным.',
                'url' => $complaint->reporter_role === 'clinic' ? '/clinic-cabinet/reviews' : null,
            ]);
        }
        Audit::log('complaint.'.$data['decision'], $complaint);

        return back()->with('success', 'Жалоба рассмотрена.');
    }
}
