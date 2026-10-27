import { Link, router, useForm } from '@inertiajs/react';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check, SelectField } from '@/components/ui/Fields';

type PaymentRow = {
    id: number;
    kind: string;
    status: string;
    amount_rub: number;
    clinic: string | null;
    user: string | null;
    tariff: string | null;
    description: string | null;
    paid_at: string | null;
    created_at: string | null;
    refunded_amount: number;
    refundable_amount: number;
};

export default function Finance({
    kpi,
    payments,
    chart,
    monetization_settings,
}: {
    kpi: Record<string, number>;
    payments: PaymentRow[];
    chart: { date: string; total: number }[];
    monetization_settings: {
        require_active_tariff_for_catalog: boolean;
        auto_assign_default_tariff: boolean;
        expire_action: string;
        autorenew_enabled: boolean;
        autorenew_charge_days_before: number;
    };
}) {
    const settings = useForm({ ...monetization_settings });

    return (
        <>
            <PageHead title="Финансы" />
            <div className="stack">
                <div className="row row--between row--wrap">
                    <h1 className="page-title">Финансы</h1>
                    <Link href="/admin/tariffs" className="text-sm">
                        Тарифы
                    </Link>
                </div>
                <div className="grid grid--3">
                    <div className="card">
                        <div className="text-sm text-muted">Выручка за период</div>
                        <strong>{(kpi.revenue_period / 100).toLocaleString('ru-RU')} ₽</strong>
                    </div>
                    <div className="card">
                        <div className="text-sm text-muted">Сегодня</div>
                        <strong>{(kpi.revenue_today / 100).toLocaleString('ru-RU')} ₽</strong>
                    </div>
                    <div className="card">
                        <div className="text-sm text-muted">Средний чек</div>
                        <strong>{(kpi.avg_check / 100).toLocaleString('ru-RU')} ₽</strong>
                    </div>
                </div>
                <p className="text-sm text-muted">
                    Тарифы: {(kpi.tariff_revenue / 100).toLocaleString('ru-RU')} ₽ · Продвижение: {(kpi.promotion_revenue / 100).toLocaleString('ru-RU')} ₽ · Неуспешных: {kpi.failed_count}
                </p>
                {chart.length > 0 ? (
                    <div className="card text-sm">
                        <strong>Доход за 30 дней (коп.)</strong>
                        <ul>
                            {chart.map((row) => (
                                <li key={row.date}>
                                    {row.date}: {(row.total / 100).toLocaleString('ru-RU')} ₽
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}
                <form
                    className="card stack"
                    onSubmit={(e) => {
                        e.preventDefault();
                        settings.put('/admin/finance/settings');
                    }}
                >
                    <h2 className="card-title">Монетизация</h2>
                    <Check
                        label="Требовать активный тариф для публикации в каталоге"
                        checked={settings.data.require_active_tariff_for_catalog}
                        onChange={(e) => settings.setData('require_active_tariff_for_catalog', e.target.checked)}
                    />
                    <Check
                        label="Назначать базовый тариф новому филиалу"
                        checked={settings.data.auto_assign_default_tariff}
                        onChange={(e) => settings.setData('auto_assign_default_tariff', e.target.checked)}
                    />
                    <SelectField
                        label="После окончания платного тарифа"
                        value={settings.data.expire_action}
                        onChange={(e) => settings.setData('expire_action', e.target.value)}
                    >
                        <option value="downgrade">Перевести на базовый</option>
                        <option value="hide">Скрыть клинику</option>
                        <option value="none">Только пометить подписку</option>
                    </SelectField>
                    <Check label="Автопродление тарифов (RebillId Т‑Банка)" checked={settings.data.autorenew_enabled} onChange={(e) => settings.setData('autorenew_enabled', e.target.checked)} />
                    <SelectField
                        label="Списывать за N дней до окончания"
                        value={String(settings.data.autorenew_charge_days_before)}
                        onChange={(e) => settings.setData('autorenew_charge_days_before', Number(e.target.value))}
                    >
                        {[0, 1, 3, 7].map((d) => (
                            <option key={d} value={d}>
                                {d} дн.
                            </option>
                        ))}
                    </SelectField>
                    <Button type="submit" loading={settings.processing}>
                        Сохранить
                    </Button>
                </form>
                <div className="card stack">
                    <h2 className="card-title">Платежи</h2>
                    <ul className="stack text-sm">
                        {payments.map((p) => (
                            <li key={p.id} className="row row--between row--wrap">
                                <span>
                                    #{p.id} {p.description ?? p.kind} · {p.clinic ?? '—'}
                                </span>
                                <span className="row row--wrap">
                                    {p.amount_rub.toLocaleString('ru-RU')} ₽ · {p.status} {p.paid_at ? `· ${p.paid_at}` : ''}
                                    {p.refundable_amount > 0 ? (
                                        <>
                                            <button
                                                type="button"
                                                className="link text-sm"
                                                onClick={() => router.post(`/admin/finance/payments/${p.id}/refund`)}
                                            >
                                                Полный возврат
                                            </button>
                                            <button
                                                type="button"
                                                className="link text-sm"
                                                onClick={() => {
                                                    const rub = window.prompt(
                                                        `Частичный возврат (₽), доступно ${(p.refundable_amount / 100).toLocaleString('ru-RU')}`,
                                                    );
                                                    if (rub === null || rub.trim() === '') {
                                                        return;
                                                    }
                                                    const kopecks = Math.round(Number(rub.replace(',', '.')) * 100);
                                                    if (!Number.isFinite(kopecks) || kopecks <= 0) {
                                                        return;
                                                    }
                                                    router.post(`/admin/finance/payments/${p.id}/refund`, { amount: kopecks });
                                                }}
                                            >
                                                Частичный
                                            </button>
                                        </>
                                    ) : null}
                                    {p.refunded_amount > 0 ? (
                                        <span className="text-muted"> · возвращено {(p.refunded_amount / 100).toLocaleString('ru-RU')} ₽</span>
                                    ) : null}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </>
    );
}
