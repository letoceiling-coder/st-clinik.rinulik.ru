<?php

namespace App\Http\Controllers\Cabinet;

use App\Models\Payment;
use App\Models\Tariff;
use App\Services\Monetization\ClinicSubscriptionService;
use App\Services\Monetization\MonetizationSettings;
use App\Services\Monetization\PaymentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class PaymentController extends CabinetController
{
    public function index(Request $request, ClinicSubscriptionService $subscriptions): Response
    {
        $branch = $this->branch($request);
        $subscription = $subscriptions->activeSubscription($branch);

        $payments = Payment::query()
            ->where('clinic_id', $branch->id)
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(fn (Payment $p) => [
                'id' => $p->id,
                'kind' => $p->kind,
                'status' => $p->status,
                'amount_rub' => round($p->amount / 100, 2),
                'description' => $p->description,
                'paid_at' => $p->paid_at?->format('d.m.Y H:i'),
                'created_at' => $p->created_at?->format('d.m.Y H:i'),
            ]);

        $tariffs = Tariff::query()
            ->where('is_active', true)
            ->where('price', '>', 0)
            ->orderBy('sort')
            ->get()
            ->map(fn (Tariff $t) => [
                'id' => $t->id,
                'name' => $t->name,
                'description' => $t->description,
                'price_rub' => $t->priceRubles(),
                'duration_days' => $t->duration_days,
                'features' => $t->features ?? [],
            ]);

        return $this->render($request, 'Cabinet/Payments', 'Тариф и платежи', [
            'subscription' => $subscription ? [
                'tariff' => $subscription->tariff?->name,
                'ends_at' => $subscription->ends_at->format('d.m.Y'),
                'days_left' => (int) max(0, ceil(now()->diffInDays($subscription->ends_at, false))),
                'is_trial' => (bool) $subscription->is_trial,
                'auto_renew' => $subscription->auto_renew,
                'can_autorenew' => filled($subscription->rebill_id),
            ] : null,
            'autorenew_available' => app(MonetizationSettings::class)->autorenewEnabled(),
            'tariffs' => $tariffs,
            'payments' => $payments,
        ]);
    }

    public function checkout(Request $request, Tariff $tariff, PaymentService $payments): RedirectResponse
    {
        $branch = $this->branch($request);
        $autoRenew = $request->boolean('auto_renew');
        $payment = $payments->createTariffCheckout($branch, $request->user(), $tariff);
        if ($autoRenew) {
            $payment->update(['payment_meta' => ['save_recurrent' => true]]);
        }
        $payment = $payments->initiate($payment, saveRecurrent: $autoRenew);

        if (! $payment->payment_url) {
            return back()->with('error', 'Не удалось создать платёж в Т‑Банке.');
        }

        return redirect()->away($payment->payment_url);
    }

    public function return(Request $request, Payment $payment, PaymentService $payments): RedirectResponse
    {
        $branch = $this->branch($request);
        abort_unless($payment->clinic_id === $branch->id, 404);

        $payments->syncRemotePayment($payment);

        return redirect()->route('cabinet.payments.index')->with(
            'success',
            $payment->fresh()->isPaid() ? 'Оплата прошла успешно, тариф активирован.' : 'Платёж обрабатывается. Обновите страницу через минуту.',
        );
    }

    public function updateAutoRenew(Request $request, ClinicSubscriptionService $subscriptions): RedirectResponse
    {
        $branch = $this->branch($request);
        $data = $request->validate(['auto_renew' => ['required', 'boolean']]);
        $subscriptions->setAutoRenew($branch, (bool) $data['auto_renew']);

        return back()->with('success', 'Настройка автопродления сохранена.');
    }
}
