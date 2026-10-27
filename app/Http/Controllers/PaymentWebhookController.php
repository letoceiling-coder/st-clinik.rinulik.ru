<?php

namespace App\Http\Controllers;

use App\Services\Monetization\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class PaymentWebhookController extends Controller
{
    public function tbank(Request $request, PaymentService $payments): Response
    {
        $payments->handleTBankWebhook($request->all());

        return response('OK', 200);
    }
}
