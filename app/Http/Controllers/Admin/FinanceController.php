<?php

namespace App\Http\Controllers\Admin;

use App\Models\Payment;
use App\Services\Monetization\MonetizationSettings;
use App\Services\Monetization\PaymentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Response;

class FinanceController extends AdminController
{
    public function index(Request $request): Response
    {
        $period = (string) $request->query('period', 'month');
        [$from, $to] = $this->periodBounds($period, $request->query('from'), $request->query('to'));

        $base = Payment::query()->where('status', Payment::STATUS_PAID)->whereBetween('paid_at', [$from, $to]);

        $byKind = (clone $base)->selectRaw('kind, count(*) as c, sum(amount) as total')
            ->groupBy('kind')
            ->pluck('total', 'kind');

        $payments = Payment::query()
            ->with(['clinic:id,name', 'user:id,name,email', 'tariff:id,name'])
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('kind'), fn ($q, $kind) => $q->where('kind', $kind))
            ->latest('id')
            ->limit(100)
            ->get()
            ->map(fn (Payment $p) => [
                'id' => $p->id,
                'kind' => $p->kind,
                'status' => $p->status,
                'amount' => $p->amount,
                'amount_rub' => round($p->amount / 100, 2),
                'clinic' => $p->clinic?->name,
                'user' => $p->user?->name,
                'tariff' => $p->tariff?->name,
                'description' => $p->description,
                'paid_at' => $p->paid_at?->format('d.m.Y H:i'),
                'created_at' => $p->created_at?->format('d.m.Y H:i'),
                'refunded_amount' => (int) $p->refunded_amount,
                'refundable_amount' => $p->refundableAmount(),
            ]);
        $failed = Payment::query()->where('status', Payment::STATUS_FAILED)->whereBetween('created_at', [$from, $to])->count();
        $refunded = Payment::query()->where('status', Payment::STATUS_REFUNDED)->whereBetween('refunded_at', [$from, $to])->sum('amount');
        $paidToday = Payment::query()->where('status', Payment::STATUS_PAID)->whereBetween('paid_at', [now()->startOfDay(), now()->endOfDay()])->sum('amount');

        $chart = Payment::query()
            ->where('status', Payment::STATUS_PAID)
            ->where('paid_at', '>=', now()->subDays(29)->startOfDay())
            ->get(['paid_at', 'amount'])
            ->groupBy(fn (Payment $p) => $p->paid_at?->toDateString())
            ->map(fn ($rows, $date) => ['date' => Carbon::parse($date)->format('d.m'), 'total' => (int) $rows->sum('amount')]);

        return $this->render('Admin/Finance', 'Финансы', [
            'monetization_settings' => app(MonetizationSettings::class)->all(),
            'filters' => [
                'period' => $period,
                'status' => $request->query('status'),
                'kind' => $request->query('kind'),
            ],
            'kpi' => [
                'revenue_period' => (int) (clone $base)->sum('amount'),
                'revenue_today' => (int) $paidToday,
                'count_period' => (clone $base)->count(),
                'avg_check' => (int) round(((clone $base)->avg('amount')) ?: 0),
                'tariff_revenue' => (int) ($byKind[Payment::KIND_TARIFF] ?? 0),
                'promotion_revenue' => (int) ($byKind[Payment::KIND_PROMOTION] ?? 0),
                'failed_count' => $failed,
                'refunded_amount' => (int) $refunded,
            ],
            'chart' => $chart->values(),
            'payments' => $payments,
        ]);
    }

    public function updateSettings(Request $request, MonetizationSettings $settings): RedirectResponse
    {
        $data = $request->validate([
            'require_active_tariff_for_catalog' => ['boolean'],
            'auto_assign_default_tariff' => ['boolean'],
            'expire_action' => ['required', 'in:downgrade,hide,none'],
        ]);

        $settings->save([
            'require_active_tariff_for_catalog' => (bool) ($data['require_active_tariff_for_catalog'] ?? false),
            'auto_assign_default_tariff' => (bool) ($data['auto_assign_default_tariff'] ?? true),
            'expire_action' => $data['expire_action'],
        ]);

        return back()->with('success', 'Настройки монетизации сохранены.');
    }

    /**
     * Полный или частичный возврат оплаченного платежа через Т‑Банк. Сумма — в копейках.
     */
    public function refund(Request $request, Payment $payment, PaymentService $payments): RedirectResponse
    {
        $data = $request->validate([
            'amount' => ['nullable', 'integer', 'min:1', 'max:'.max(1, $payment->refundableAmount())],
        ]);

        $refund = $payments->refund($payment, $request->user(), isset($data['amount']) ? (int) $data['amount'] : null);

        if ($refund->status !== 'completed') {
            return back()->with('error', 'Т‑Банк отклонил возврат. Подробности — в журнале платежа.');
        }

        $rub = number_format($refund->amount / 100, 2, ',', ' ');

        return back()->with('success', "Возврат {$rub} ₽ оформлен.");
    }

    /** @return array{0: Carbon, 1: Carbon} */
    private function periodBounds(string $period, ?string $from, ?string $to): array
    {
        return match ($period) {
            'today' => [now()->startOfDay(), now()->endOfDay()],
            'week' => [now()->startOfWeek(), now()->endOfWeek()],
            'year' => [now()->startOfYear(), now()->endOfYear()],
            'custom' => [
                Carbon::parse($from ?: now()->subMonth())->startOfDay(),
                Carbon::parse($to ?: now())->endOfDay(),
            ],
            default => [now()->startOfMonth(), now()->endOfMonth()],
        };
    }
}
