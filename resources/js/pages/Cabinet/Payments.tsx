import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check } from '@/components/ui/Fields';
import { Alert } from '@/components/ui/Misc';

type Tariff = { id: number; name: string; description: string | null; price_rub: number; duration_days: number; features: string[] };
type PaymentRow = { id: number; kind: string; status: string; amount_rub: number; description: string | null; paid_at: string | null; created_at: string | null };

export default function Payments({
    subscription,
    tariffs,
    payments,
    autorenew_available,
}: {
    subscription: { tariff: string; ends_at: string; days_left: number; auto_renew: boolean; can_autorenew: boolean } | null;
    tariffs: Tariff[];
    payments: PaymentRow[];
    autorenew_available: boolean;
}) {
    const [autoRenewCheckout, setAutoRenewCheckout] = useState(false);
    const renewForm = useForm({ auto_renew: subscription?.auto_renew ?? false });

    return (
        <>
            <PageHead title="Тариф и платежи" />
            <div className="stack">
                <h1 className="page-title">Тариф и платежи</h1>
                {subscription ? (
                    <Alert tone="info">
                        Тариф «{subscription.tariff}» до {subscription.ends_at} (осталось {subscription.days_left} дн.)
                    </Alert>
                ) : (
                    <Alert tone="warning">Нет активной подписки. Выберите тариф для публикации и расширенных функций.</Alert>
                )}
                {autorenew_available && subscription?.can_autorenew ? (
                    <form
                        className="card stack"
                        onSubmit={(e) => {
                            e.preventDefault();
                            renewForm.put('/clinic-cabinet/payments/auto-renew');
                        }}
                    >
                        <Check
                            label="Автопродление тарифа (списание с сохранённой карты)"
                            checked={renewForm.data.auto_renew}
                            onChange={(e) => renewForm.setData('auto_renew', e.target.checked)}
                        />
                        <Button type="submit" variant="outline" size="sm" loading={renewForm.processing}>
                            Сохранить
                        </Button>
                    </form>
                ) : null}
                <div className="stack">
                    {tariffs.map((t) => (
                        <div key={t.id} className="card stack">
                            <strong>{t.name}</strong>
                            <p className="text-sm text-muted">{t.description}</p>
                            <p className="text-sm">
                                {t.price_rub.toLocaleString('ru-RU')} ₽ · {t.duration_days} дн.
                            </p>
                            {autorenew_available ? (
                                <Check label="Сохранить карту для автопродления" checked={autoRenewCheckout} onChange={(e) => setAutoRenewCheckout(e.target.checked)} />
                            ) : null}
                            <Button
                                type="button"
                                onClick={() =>
                                    router.post(`/clinic-cabinet/payments/tariffs/${t.id}/checkout`, autorenew_available && autoRenewCheckout ? { auto_renew: true } : {})
                                }
                            >
                                Оплатить картой
                            </Button>
                        </div>
                    ))}
                </div>
                {payments.length > 0 ? (
                    <div className="card stack">
                        <h2 className="card-title">История платежей</h2>
                        <ul className="stack text-sm">
                            {payments.map((p) => (
                                <li key={p.id} className="row row--between row--wrap">
                                    <span>{p.description ?? p.kind}</span>
                                    <span>
                                        {p.amount_rub.toLocaleString('ru-RU')} ₽ · {p.status} {p.paid_at ? `· ${p.paid_at}` : ''}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}
            </div>
        </>
    );
}
