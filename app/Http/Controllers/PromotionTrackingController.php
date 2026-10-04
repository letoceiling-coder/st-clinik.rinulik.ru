<?php

namespace App\Http\Controllers;

use App\Models\ClinicPromotion;
use App\Services\PromotionService;
use Illuminate\Http\Response;

class PromotionTrackingController extends Controller
{
    public function click(ClinicPromotion $promotion, PromotionService $promotions): Response
    {
        abort_unless($promotion->status === 'active', 404);
        $promotions->recordClick($promotion->id);

        $promotion->loadMissing('clinic');

        return redirect()->away($promotion->banner_url ?: route('clinics.show', $promotion->clinic->slug));
    }

    public function impression(ClinicPromotion $promotion, PromotionService $promotions): Response
    {
        abort_unless($promotion->status === 'active', 404);
        $promotions->recordImpression($promotion->id);

        return response('', 204);
    }
}
