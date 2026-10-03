<?php

namespace App\Http\Controllers\Cabinet;

use App\Models\Review;
use App\Models\ReviewComplaint;
use App\Models\UserNotification;
use App\Services\Audit;
use App\Services\ReviewService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class ReviewController extends CabinetController
{
    public function index(Request $request): Response
    {
        $branch = $this->branch($request);
        $filter = $request->query('filter');

        $page = Review::where('clinic_id', $branch->id)->whereIn('status', ['published', 'pending'])
            ->with(['doctor:id,name', 'service:id,name', 'complaints'])
            ->when($filter === 'unanswered', fn ($q) => $q->where('status', 'published')->whereNull('reply_text'))
            ->latest()->paginate(10)->withQueryString();

        return $this->render($request, 'Cabinet/Reviews', 'Отзывы', [
            'reviews' => $page->through(fn (Review $r) => [
                'id' => $r->id, 'rating' => $r->rating, 'title' => $r->title, 'body' => $r->body,
                'author_name' => $r->author_name, 'status' => $r->status, 'is_verified_visit' => $r->is_verified_visit,
                'visit_date' => $r->visit_date?->toDateString(), 'created_at' => $r->created_at?->toDateString(),
                'doctor' => $r->doctor?->name, 'service' => $r->service?->name,
                'reply' => $r->reply_text, 'reply_at' => $r->reply_at?->toDateString(),
                'complaint' => $r->complaints->where('reporter_role', 'clinic')->sortByDesc('id')->first()?->only(['status', 'reason', 'resolution']),
            ])->toArray(),
            'reasons' => ReviewComplaint::REASONS,
            'filters' => array_filter(['filter' => $filter]),
        ]);
    }

    public function reply(Request $request, Review $review): RedirectResponse
    {
        abort_unless((int) $review->clinic_id === (int) $this->branch($request)->id, 404);
        abort_unless($review->status === 'published', 422, 'Ответить можно только на опубликованный отзыв.');

        $data = $request->validate(['reply_text' => 'required|string|min:10|max:1000'], [
            'reply_text.required' => 'Напишите ответ.', 'reply_text.min' => 'Ответ слишком короткий.',
        ]);

        $review->update(['reply_text' => $data['reply_text'], 'reply_at' => now(), 'reply_by' => $request->user()->id]);
        Audit::log('review.reply', $review);

        if ($review->user_id) {
            UserNotification::create([
                'user_id' => $review->user_id, 'type' => 'review_reply', 'title' => 'Клиника ответила на ваш отзыв',
                'body' => 'Клиника «'.$review->clinic->name.'» опубликовала ответ.', 'url' => route('clinics.show', $review->clinic->slug),
            ]);
        }

        return back()->with('success', 'Ответ опубликован.');
    }

    public function complain(Request $request, Review $review, ReviewService $reviews): RedirectResponse
    {
        abort_unless((int) $review->clinic_id === (int) $this->branch($request)->id, 404);

        $data = $request->validate([
            'reason' => 'required|in:'.implode(',', array_keys(ReviewComplaint::REASONS)),
            'comment' => 'required|string|min:10|max:500',
        ], ['comment.required' => 'Опишите, какое правило нарушено.', 'comment.min' => 'Опишите причину подробнее.']);

        if ($review->complaints()->where('reporter_role', 'clinic')->where('status', 'open')->exists()) {
            return back()->with('error', 'Жалоба уже отправлена и ожидает решения модератора.');
        }

        $reviews->complain($review, $request->user(), 'clinic', $data);

        return back()->with('success', 'Жалоба отправлена модератору. Отзыв остаётся опубликованным до решения.');
    }
}
