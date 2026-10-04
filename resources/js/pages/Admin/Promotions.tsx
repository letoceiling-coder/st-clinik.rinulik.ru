import { router, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check, SelectField, TextArea, TextField } from '@/components/ui/Fields';
import { Badge } from '@/components/ui/Misc';

interface Product {
    id: number;
    code: string;
    name: string;
    description: string | null;
    duration_days: number;
    requires_moderation: boolean;
    is_active: boolean;
    sort: number;
}

interface PackageItem {
    id: number;
    code: string;
    name: string;
    description: string | null;
    duration_days: number;
    is_active: boolean;
    sort: number;
    products: { id: number; name: string; code: string }[];
}

interface PriceRow {
    id: number;
    priceable_type: string;
    priceable_id: number;
    city_id: number | null;
    city_name: string;
    price: number;
    is_active: boolean;
}

interface SettingRow {
    id: number;
    city_id: number | null;
    city_name: string;
    max_boost: number;
    max_banner_home: number;
    max_banner_catalog: number;
}

interface PendingOrder {
    id: number;
    clinic: { id: number; name: string; slug: string } | null;
    city: string | null;
    banner_title: string | null;
    banner_url: string | null;
    banner_image_url: string | null;
    paid_at: string | null;
}

interface Props {
    products: Product[];
    packages: PackageItem[];
    prices: PriceRow[];
    settings: SettingRow[];
    pending_orders: PendingOrder[];
    cities: { id: number; name: string }[];
}

function rub(kopecks: number): string {
    return `${Math.round(kopecks / 100).toLocaleString('ru-RU')} ₽`;
}

export default function AdminPromotions({ products, packages, prices, settings, pending_orders, cities }: Props) {
    const [tab, setTab] = useState<'moderation' | 'products' | 'packages' | 'prices' | 'limits'>('moderation');

    const priceForm = useForm({
        priceable_type: 'product' as 'product' | 'package',
        priceable_id: products[0]?.id ?? 1,
        city_id: '' as string | number,
        price: 990000,
        is_active: true,
    });

    const limitForm = useForm({
        city_id: '' as string | number,
        max_boost: 3,
        max_banner_home: 1,
        max_banner_catalog: 2,
    });

    const productForm = useForm({
        code: '',
        name: '',
        description: '',
        duration_days: 30,
        requires_moderation: false,
        is_active: true,
        sort: 100,
    });

    const packageForm = useForm({
        code: '',
        name: '',
        description: '',
        duration_days: 30,
        product_ids: [] as number[],
        is_active: true,
        sort: 100,
    });

    const savePrice = (e: FormEvent) => {
        e.preventDefault();
        priceForm.transform((d) => ({ ...d, city_id: d.city_id === '' ? null : Number(d.city_id), price: Number(d.price) })).post('/admin/promotions/prices', { preserveScroll: true });
    };

    const saveLimit = (e: FormEvent) => {
        e.preventDefault();
        limitForm.transform((d) => ({ ...d, city_id: d.city_id === '' ? null : Number(d.city_id) })).post('/admin/promotions/settings', { preserveScroll: true });
    };

    const saveProduct = (e: FormEvent) => {
        e.preventDefault();
        productForm.post('/admin/promotions/products', { preserveScroll: true, onSuccess: () => productForm.reset() });
    };

    const savePackage = (e: FormEvent) => {
        e.preventDefault();
        packageForm.post('/admin/promotions/packages', { preserveScroll: true, onSuccess: () => packageForm.reset() });
    };

    return (
        <>
            <PageHead title="Продвижение и тарифы" text="Тарифы, пакеты, региональные цены, лимиты и модерация баннеров." />

            <div className="row row--wrap" style={{ gap: 8, marginBottom: 24 }}>
                {(['moderation', 'products', 'packages', 'prices', 'limits'] as const).map((key) => (
                    <Button key={key} type="button" variant={tab === key ? 'primary' : 'outline'} onClick={() => setTab(key)}>
                        {key === 'moderation' ? `Модерация (${pending_orders.length})` : key === 'products' ? 'Тарифы' : key === 'packages' ? 'Пакеты' : key === 'prices' ? 'Цены' : 'Лимиты'}
                    </Button>
                ))}
            </div>

            {tab === 'moderation' ? (
                <div className="stack-lg">
                    {pending_orders.length === 0 ? <p className="text-muted">Нет заявок на модерацию.</p> : null}
                    {pending_orders.map((o) => (
                        <article key={o.id} className="card stack">
                            <div className="row row--wrap row--between">
                                <div>
                                    <strong>{o.clinic?.name}</strong>
                                    <p className="text-sm text-muted">
                                        {o.city} · {o.paid_at}
                                    </p>
                                </div>
                                <Badge tone="warning">На модерации</Badge>
                            </div>
                            {o.banner_image_url ? <img src={o.banner_image_url} alt="" className="promo-moderation__img" /> : null}
                            <p>
                                <strong>{o.banner_title}</strong>
                                <br />
                                <a href={o.banner_url ?? '#'} className="link" target="_blank" rel="noreferrer">
                                    {o.banner_url}
                                </a>
                            </p>
                            <div className="row row--wrap" style={{ gap: 8 }}>
                                <Button
                                    type="button"
                                    onClick={() => router.post(`/admin/promotions/orders/${o.id}/approve`, {}, { preserveScroll: true })}
                                >
                                    Опубликовать
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        const note = window.prompt('Причина отклонения');
                                        if (note) router.post(`/admin/promotions/orders/${o.id}/reject`, { note }, { preserveScroll: true });
                                    }}
                                >
                                    Отклонить
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
            ) : null}

            {tab === 'products' ? (
                <div className="stack-lg">
                    <form className="card stack" onSubmit={saveProduct}>
                        <h2>Новый тариф</h2>
                        <TextField label="Код" required value={productForm.data.code} onChange={(e) => productForm.setData('code', e.target.value)} hint="boost, banner_home, banner_catalog" />
                        <TextField label="Название" required value={productForm.data.name} onChange={(e) => productForm.setData('name', e.target.value)} />
                        <TextArea label="Описание" value={productForm.data.description} onChange={(e) => productForm.setData('description', e.target.value)} />
                        <TextField label="Дней" type="number" value={String(productForm.data.duration_days)} onChange={(e) => productForm.setData('duration_days', Number(e.target.value))} />
                        <Check label="Требует модерации (баннер)" checked={productForm.data.requires_moderation} onChange={(e) => productForm.setData('requires_moderation', e.target.checked)} />
                        <Button type="submit">Добавить</Button>
                    </form>
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Код</th>
                                    <th>Название</th>
                                    <th>Дней</th>
                                    <th>Модерация</th>
                                    <th>Активен</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((p) => (
                                    <tr key={p.id}>
                                        <td>{p.code}</td>
                                        <td>{p.name}</td>
                                        <td>{p.duration_days}</td>
                                        <td>{p.requires_moderation ? 'Да' : '—'}</td>
                                        <td>{p.is_active ? 'Да' : 'Нет'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}

            {tab === 'packages' ? (
                <div className="stack-lg">
                    <form className="card stack" onSubmit={savePackage}>
                        <h2>Новый пакет</h2>
                        <TextField label="Код" required value={packageForm.data.code} onChange={(e) => packageForm.setData('code', e.target.value)} />
                        <TextField label="Название" required value={packageForm.data.name} onChange={(e) => packageForm.setData('name', e.target.value)} />
                        <TextArea label="Описание" value={packageForm.data.description} onChange={(e) => packageForm.setData('description', e.target.value)} />
                        <fieldset className="stack">
                            <legend className="text-sm">Включённые услуги</legend>
                            {products.map((p) => (
                                <Check
                                    key={p.id}
                                    label={p.name}
                                    checked={packageForm.data.product_ids.includes(p.id)}
                                    onChange={(e) => {
                                        const ids = new Set(packageForm.data.product_ids);
                                        if (e.target.checked) ids.add(p.id);
                                        else ids.delete(p.id);
                                        packageForm.setData('product_ids', [...ids]);
                                    }}
                                />
                            ))}
                        </fieldset>
                        <Button type="submit">Добавить пакет</Button>
                    </form>
                    <div className="stack">
                        {packages.map((p) => (
                            <article key={p.id} className="card">
                                <strong>{p.name}</strong> ({p.code})
                                <p className="text-sm text-muted">{p.products.map((x) => x.name).join(' · ')}</p>
                            </article>
                        ))}
                    </div>
                </div>
            ) : null}

            {tab === 'prices' ? (
                <div className="stack-lg">
                    <form className="card stack" onSubmit={savePrice}>
                        <h2>Цена по региону</h2>
                        <SelectField label="Тип" value={priceForm.data.priceable_type} onChange={(e) => priceForm.setData('priceable_type', e.target.value as 'product' | 'package')}>
                            <option value="product">Тариф</option>
                            <option value="package">Пакет</option>
                        </SelectField>
                        <SelectField label="Позиция" value={priceForm.data.priceable_id} onChange={(e) => priceForm.setData('priceable_id', Number(e.target.value))}>
                            {(priceForm.data.priceable_type === 'product' ? products : packages).map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </SelectField>
                        <SelectField label="Город" value={priceForm.data.city_id} onChange={(e) => priceForm.setData('city_id', e.target.value)}>
                            <option value="">По умолчанию (все города)</option>
                            {cities.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </SelectField>
                        <TextField label="Цена, коп." required type="number" value={String(priceForm.data.price)} onChange={(e) => priceForm.setData('price', Number(e.target.value))} hint="990000 = 9 900 ₽" />
                        <Button type="submit">Сохранить цену</Button>
                    </form>
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Тип</th>
                                    <th>ID</th>
                                    <th>Город</th>
                                    <th>Цена</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {prices.map((p) => (
                                    <tr key={p.id}>
                                        <td>{p.priceable_type}</td>
                                        <td>{p.priceable_id}</td>
                                        <td>{p.city_name}</td>
                                        <td>{rub(p.price)}</td>
                                        <td>
                                            <Button type="button" variant="ghost" size="sm" onClick={() => router.delete(`/admin/promotions/prices/${p.id}`, { preserveScroll: true })}>
                                                Удалить
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}

            {tab === 'limits' ? (
                <div className="stack-lg">
                    <form className="card stack" onSubmit={saveLimit}>
                        <h2>Лимиты размещений</h2>
                        <SelectField label="Город" value={limitForm.data.city_id} onChange={(e) => limitForm.setData('city_id', e.target.value)}>
                            <option value="">По умолчанию</option>
                            {cities.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </SelectField>
                        <TextField label="Макс. бустов «Рекомендуем»" type="number" value={String(limitForm.data.max_boost)} onChange={(e) => limitForm.setData('max_boost', Number(e.target.value))} />
                        <TextField label="Макс. баннеров на главной" type="number" value={String(limitForm.data.max_banner_home)} onChange={(e) => limitForm.setData('max_banner_home', Number(e.target.value))} />
                        <TextField label="Макс. баннеров в каталоге" type="number" value={String(limitForm.data.max_banner_catalog)} onChange={(e) => limitForm.setData('max_banner_catalog', Number(e.target.value))} />
                        <Button type="submit">Сохранить лимиты</Button>
                    </form>
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Город</th>
                                    <th>Буст</th>
                                    <th>Главная</th>
                                    <th>Каталог</th>
                                </tr>
                            </thead>
                            <tbody>
                                {settings.map((s) => (
                                    <tr key={s.id}>
                                        <td>{s.city_name}</td>
                                        <td>{s.max_boost}</td>
                                        <td>{s.max_banner_home}</td>
                                        <td>{s.max_banner_catalog}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}
        </>
    );
}
