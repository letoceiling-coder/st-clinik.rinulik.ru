<?php

namespace App\Http\Controllers;

use App\Models\ClinicPromotion;
use App\Services\PromotionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\RateLimiter;

class PromotionTrackingController extends Controller
{
    /** Повторные события одного посетителя по одному размещению в этом окне не учитываются. */
    private const DEDUPE_SECONDS = 1800;

    public function click(Request $request, ClinicPromotion $promotion, PromotionService $promotions): RedirectResponse
    {
        abort_unless($promotion->status === 'active', 404);

        if ($this->isFirstEvent('click', $promotion, $request)) {
            $promotions->recordClick($promotion->id);
        }

        $promotion->loadMissing('clinic');

        return redirect()->away($promotion->banner_url ?: route('clinics.show', $promotion->clinic->slug));
    }

    public function impression(Request $request, ClinicPromotion $promotion, PromotionService $promotions): Response
    {
        abort_unless($promotion->status === 'active', 404);

        if ($this->isFirstEvent('impression', $promotion, $request)) {
            $promotions->recordImpression($promotion->id);
        }

        return response('', 204);
    }

    private function isFirstEvent(string $type, ClinicPromotion $promotion, Request $request): bool
    {
        $key = "promo-{$type}:{$promotion->id}:".sha1((string) $request->ip().'|'.(string) $request->userAgent());

        return RateLimiter::attempt($key, 1, fn () => true, self::DEDUPE_SECONDS) !== false;
    }
}
