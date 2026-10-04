import { useForm, usePage } from '@inertiajs/react';
import { type FormEvent } from 'react';
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
    has_publication: boolean;
    yookassa_configured: boolean;
    labels: Record<string, string>;
}

function formatPrice(kopecks: number | null | undefined): string {
    if (!kopecks) return '—';
    return `${Math.round(kopecks / 100).toLocaleString('ru-RU')} ₽`;
}

function formatDuration(days: number): string {
    if (days >= 365) return `${Math.round(days / 365)} год`;
    if (days >= 30) return `${Math.round(days / 30)} мес.`;
    return `${days} дн.`;
}

function CheckoutForm({
    type,
    id,
    requiresBanner,
    name,
    price,
    description,
    durationDays,
    disabled,
    disabledReason,
}: {
    type: 'product' | 'package';
    id: number;
    requiresBanner: boolean;
    name: string;
    price: number | null | undefined;
    description?: string | null;
    durationDays?: number;
    disabled?: boolean;
    disabledReason?: string;
}) {
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
                <div className="stack" style={{ gap: 4 }}>
                    <h3 className="promo-offer__title">{name}</h3>
                    {durationDays ? <p className="text-sm text-muted">Срок: {formatDuration(durationDays)}</p> : null}
                    {description ? <p className="text-sm text-muted">{description}</p> : null}
                </div>
                <strong className="promo-offer__price">{formatPrice(price)}</strong>
            </div>
            {requiresBanner ? (
                <>
                    <TextField label="Заголовок баннера" required value={form.data.banner_title} onChange={(e) => form.setData('banner_title', e.target.value)} error={form.errors.banner_title} />
                    <TextField label="Ссылка при клике" required type="url" value={form.data.banner_url} onChange={(e) => form.setData('banner_url', e.target.value)} error={form.errors.banner_url} hint="Обычно страница клиники или акции" />
                    <FileDropzone label="Изображение баннера" accept="image/*" onChange={(file) => form.setData('banner_image', file)} error={form.errors.banner_image} hint="JPG или PNG, до 4 МБ. После оплаты — модерация администратора." />
                </>
            ) : null}
            {disabledReason ? <p className="alert alert--warning">{disabledReason}</p> : null}
            <Button type="submit" disabled={form.processing || !price || disabled}>
                Оплатить через ЮKassa
            </Button>
            {form.errors.payment ? <p className="field-error">{form.errors.payment}</p> : null}
        </form>
    );
}

export default function CabinetPromotions({ products, packages, active, orders, has_publication, yookassa_configured, labels }: Props) {
    const { flash } = usePage<SharedProps>().props;

    return (
        <>
            <PageHead
                title="Продвижение"
                text="Пакеты — право на публикацию клиники в каталоге. Буст и баннеры покупаются отдельно при активном пакете."
            />
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
                <h2>Пакеты публикации</h2>
                <p className="text-sm text-muted">Выберите срок размещения клиники на сервисе: 1, 6 или 12 месяцев.</p>
                {packages.length === 0 ? (
                    <EmptyState title="Пакеты пока не настроены" text="Обратитесь к администратору каталога." />
                ) : (
                    <div className="promo-grid">
                        {packages.map((p) => (
                            <CheckoutForm key={p.id} type="package" id={p.id} name={p.name} price={p.price} description={p.description} durationDays={p.duration_days} requiresBanner={false} />
                        ))}
                    </div>
                )}
            </section>

            <section className="stack-lg">
                <h2>Дополнительные опции</h2>
                <p className="text-sm text-muted">Подъём в каталоге и рекламные баннеры. Доступны только при активном пакете публикации.</p>
                {!has_publication ? <p className="alert alert--warning">Сначала оформите пакет публикации — без него доп. опции недоступны.</p> : null}
                {products.length === 0 ? (
                    <EmptyState title="Доп. опции пока не настроены" />
                ) : (
                    <div className="promo-grid">
                        {products.map((p) => (
                            <div key={p.id} className="stack">
                                {p.available === 0 ? <p className="text-sm text-muted">Свободных мест: 0</p> : null}
                                <CheckoutForm
                                    type="product"
                                    id={p.id}
                                    name={p.name}
                                    price={p.price}
                                    description={p.description}
                                    durationDays={p.duration_days}
                                    requiresBanner={p.requires_moderation}
                                    disabled={!has_publication || p.available === 0}
                                    disabledReason={
                                        !has_publication
                                            ? 'Требуется активный пакет публикации.'
                                            : p.available === 0
                                              ? 'Достигнут лимит размещений в вашем городе.'
                                              : undefined
                                    }
                                />
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
