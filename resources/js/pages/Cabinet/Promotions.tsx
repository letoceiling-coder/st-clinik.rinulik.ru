import { useForm, usePage } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import FileDropzone from '@/components/ui/FileDropzone';
import { TextField } from '@/components/ui/Fields';
import { Badge, EmptyState } from '@/components/ui/Misc';
import type { SharedProps } from '@/lib/types';

interface Product {
    id: number;
    code: string;
    name: string;
    description: string | null;
    duration_days: number;
    requires_moderation: boolean;
    price: number | null | undefined;
    available: number;
}

interface PackageItem {
    id: number;
    code: string;
    name: string;
    description: string | null;
    duration_days: number;
    products: string[];
    requires_moderation: boolean;
    price: number | null | undefined;
}

interface ActivePromotion {
    id: number;
    product_code: string;
    status: string;
    starts_at: string | null;
    ends_at: string | null;
    banner_image_url: string | null;
}

interface OrderRow {
    id: number;
    amount: number;
    status: string;
    moderation_status: string | null;
    payment_url: string | null;
    created_at: string | null;
}

interface Props {
    products: Product[];
    packages: PackageItem[];
    active: ActivePromotion[];
    orders: OrderRow[];
    yookassa_configured: boolean;
    labels: Record<string, string>;
}

function formatPrice(kopecks: number | null | undefined): string {
    if (!kopecks) return '—';
    return `${Math.round(kopecks / 100).toLocaleString('ru-RU')} ₽`;
}

function CheckoutForm({ type, id, requiresBanner, name, price }: { type: 'product' | 'package'; id: number; requiresBanner: boolean; name: string; price: number | null | undefined }) {
    const form = useForm({
        type,
        id,
        banner_title: '',
        banner_url: '',
        banner_image: null as File | null,
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/clinic-cabinet/promotions/checkout', {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <form className="card stack promo-offer" onSubmit={submit}>
            <div className="row row--wrap row--between">
                <h3 className="promo-offer__title">{name}</h3>
                <strong className="promo-offer__price">{formatPrice(price)}</strong>
            </div>
            {requiresBanner ? (
                <>
                    <TextField label="Заголовок баннера" required value={form.data.banner_title} onChange={(e) => form.setData('banner_title', e.target.value)} error={form.errors.banner_title} />
                    <TextField label="Ссылка при клике" required type="url" value={form.data.banner_url} onChange={(e) => form.setData('banner_url', e.target.value)} error={form.errors.banner_url} hint="Обычно страница клиники или акции" />
                    <FileDropzone label="Изображение баннера" accept="image/*" onChange={(file) => form.setData('banner_image', file)} error={form.errors.banner_image} hint="JPG или PNG, до 4 МБ. После оплаты — модерация администратора." />
                </>
            ) : null}
            <Button type="submit" disabled={form.processing || !price}>
                Оплатить через ЮKassa
            </Button>
            {form.errors.payment ? <p className="field-error">{form.errors.payment}</p> : null}
        </form>
    );
}

export default function CabinetPromotions({ products, packages, active, orders, yookassa_configured, labels }: Props) {
    const { flash } = usePage<SharedProps>().props;
    const [tab, setTab] = useState<'products' | 'packages'>('packages');

    return (
        <>
            <PageHead title="Продвижение" text="Поднимите клинику в каталоге или разместите баннер. Оплата через ЮKassa." />
            {flash?.success ? <p className="alert alert--success">{flash.success}</p> : null}
            {!yookassa_configured ? <p className="alert alert--warning">Оплата временно недоступна: не настроена ЮKassa на сервере.</p> : null}

            {active.length > 0 ? (
                <section className="stack">
                    <h2>Активные услуги</h2>
                    <div className="stack">
                        {active.map((item) => (
                            <article key={item.id} className="card row row--wrap row--between">
                                <div>
                                    <strong>{labels[item.product_code] ?? item.product_code}</strong>
                                    <p className="text-sm text-muted">
                                        {item.starts_at ? `${item.starts_at} — ${item.ends_at ?? '…'}` : 'Ожидает модерации'}
                                    </p>
                                </div>
                                <Badge tone={item.status === 'active' ? 'success' : 'warning'}>{item.status === 'active' ? 'Активно' : 'На модерации'}</Badge>
                            </article>
                        ))}
                    </div>
                </section>
            ) : null}

            <section className="stack-lg">
                <div className="row row--wrap" style={{ gap: 8 }}>
                    <Button variant={tab === 'packages' ? 'primary' : 'outline'} type="button" onClick={() => setTab('packages')}>
                        Пакеты
                    </Button>
                    <Button variant={tab === 'products' ? 'primary' : 'outline'} type="button" onClick={() => setTab('products')}>
                        Отдельные услуги
                    </Button>
                </div>

                {tab === 'packages' ? (
                    packages.length === 0 ? (
                        <EmptyState title="Пакеты пока не настроены" text="Обратитесь к администратору каталога." />
                    ) : (
                        <div className="promo-grid">
                            {packages.map((p) => (
                                <CheckoutForm key={p.id} type="package" id={p.id} name={p.name} price={p.price} requiresBanner={p.requires_moderation} />
                            ))}
                        </div>
                    )
                ) : products.length === 0 ? (
                    <EmptyState title="Тарифы пока не настроены" />
                ) : (
                    <div className="promo-grid">
                        {products.map((p) => (
                            <div key={p.id} className="stack">
                                {p.available === 0 && p.code !== 'boost' ? (
                                    <p className="text-sm text-muted">Свободных мест: 0</p>
                                ) : null}
                                <CheckoutForm type="product" id={p.id} name={p.name} price={p.price} requiresBanner={p.requires_moderation} />
                                {p.description ? <p className="text-sm text-muted">{p.description}</p> : null}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {orders.length > 0 ? (
                <section className="stack">
                    <h2>Последние заказы</h2>
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Дата</th>
                                    <th>Сумма</th>
                                    <th>Статус</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((o) => (
                                    <tr key={o.id}>
                                        <td>{o.created_at}</td>
                                        <td>{formatPrice(o.amount)}</td>
                                        <td>
                                            {o.status}
                                            {o.moderation_status ? ` / ${o.moderation_status}` : ''}
                                        </td>
                                        <td>
                                            {o.status === 'pending_payment' && o.payment_url ? (
                                                <a href={o.payment_url} className="link">
                                                    Оплатить
                                                </a>
                                            ) : null}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ) : null}
        </>
    );
}
