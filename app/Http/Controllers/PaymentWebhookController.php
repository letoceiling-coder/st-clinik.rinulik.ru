<?php

namespace App\Http\Controllers;

use App\Services\PromotionService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PaymentWebhookController extends Controller
{
    public function yookassa(Request $request, PromotionService $promotions): Response
    {
        $promotions->handleWebhook($request->all());

        return response('', 200);
    }
}
