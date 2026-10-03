<?php

namespace App\Http\Controllers;

use App\Models\Clinic;
use App\Models\Review;
use App\Models\ReviewComplaint;
use App\Services\ReviewService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ReviewController extends Controller
{
    public function store(Request $request, string $slug, ReviewService $reviews): RedirectResponse
    {
        $clinic = Clinic::published()->where('slug', $slug)->firstOrFail();
        $data = $reviews->validate($clinic, $request->user(), $request->all());
        $reviews->create($clinic, $request->user(), $data);

        return back()->with('success', 'Спасибо! Отзыв отправлен на проверку — модератор опубликует его в течение 48 часов.');
    }

    public function complain(Request $request, Review $review, ReviewService $reviews): RedirectResponse
    {
        abort_unless($review->status === 'published', 404);
        $data = $request->validate([
            'reason' => 'required|in:'.implode(',', array_keys(ReviewComplaint::REASONS)),
            'comment' => 'nullable|string|max:500',
        ]);

        $already = ReviewComplaint::where('review_id', $review->id)->where('reporter_id', $request->user()->id)->where('status', 'open')->exists();
        if ($already) {
            return back()->with('error', 'Вы уже отправили жалобу на этот отзыв — она на рассмотрении.');
        }

        $reviews->complain($review, $request->user(), 'user', $data);

        return back()->with('success', 'Жалоба отправлена модератору.');
    }
}
