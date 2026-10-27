import { router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check, TextArea, TextField } from '@/components/ui/Fields';
import { Badge } from '@/components/ui/Misc';

type TariffRow = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    price_rub: number;
    duration_days: number;
    max_branches: number | null;
    max_doctors: number | null;
    max_photos: number | null;
    features: string[];
    is_active: boolean;
    is_default: boolean;
    sort: number;
    clinics_count: number;
};

export default function Tariffs({ tariffs, feature_labels }: { tariffs: TariffRow[]; feature_labels: Record<string, string> }) {
    const create = useForm({
        name: '',
        price: 0,
        duration_days: 30,
        is_active: true,
        is_default: false,
        sort: 100,
        features: [] as string[],
    });

    return (
        <>
            <PageHead title="Тарифы" />
            <div className="stack">
                <h1 className="page-title">Тарифы клиник</h1>
                <div className="stack">
                    {tariffs.map((t) => (
                        <TariffEditor key={t.id} tariff={t} feature_labels={feature_labels} />
                    ))}
                </div>
                <form
                    className="card stack"
                    onSubmit={(e) => {
                        e.preventDefault();
                        create.post('/admin/tariffs');
                    }}
                >
                    <h2 className="card-title">Новый тариф</h2>
                    <TextField label="Название" value={create.data.name} onChange={(e) => create.setData('name', e.target.value)} required />
                    <TextField label="Цена (коп.)" type="number" value={String(create.data.price)} onChange={(e) => create.setData('price', Number(e.target.value))} />
                    <TextField label="Срок (дней)" type="number" value={String(create.data.duration_days)} onChange={(e) => create.setData('duration_days', Number(e.target.value))} />
                    <Check label="Активен" checked={create.data.is_active} onChange={(e) => create.setData('is_active', e.target.checked)} />
                    <div className="row row--wrap">
                        {Object.entries(feature_labels).map(([key, label]) => (
                            <Check
                                key={key}
                                label={label}
                                checked={create.data.features.includes(key)}
                                onChange={() => {
                                    const next = create.data.features.includes(key) ? create.data.features.filter((f) => f !== key) : [...create.data.features, key];
                                    create.setData('features', next);
                                }}
                            />
                        ))}
                    </div>
                    <Button type="submit" loading={create.processing}>
                        Создать
                    </Button>
                </form>
                <Button type="button" variant="outline" onClick={() => router.get('/admin/finance')}>
                    Финансы и настройки
                </Button>
            </div>
        </>
    );
}

function TariffEditor({ tariff, feature_labels }: { tariff: TariffRow; feature_labels: Record<string, string> }) {
    const form = useForm({
        name: tariff.name,
        description: tariff.description ?? '',
        price: tariff.price,
        duration_days: tariff.duration_days,
        max_branches: tariff.max_branches ?? '',
        max_doctors: tariff.max_doctors ?? '',
        max_photos: tariff.max_photos ?? '',
        sort: tariff.sort,
        is_active: tariff.is_active,
        is_default: tariff.is_default,
        features: tariff.features,
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({
            ...d,
            max_branches: d.max_branches === '' ? null : Number(d.max_branches),
            max_doctors: d.max_doctors === '' ? null : Number(d.max_doctors),
            max_photos: d.max_photos === '' ? null : Number(d.max_photos),
        }));
        form.put(`/admin/tariffs/${tariff.id}`);
    };

    return (
        <form className="card stack" onSubmit={submit}>
            <div className="row row--between row--wrap">
                <strong>{tariff.name}</strong>
                <div className="row row--wrap">
                    {tariff.is_default ? <Badge tone="info">По умолчанию</Badge> : null}
                    {tariff.is_active ? <Badge tone="success">Активен</Badge> : <Badge tone="warning">Выключен</Badge>}
                </div>
            </div>
            <p className="text-sm text-muted">Клиник на тарифе: {tariff.clinics_count}</p>
            <TextField label="Название" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
            <TextArea label="Описание" value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
            <div className="form-grid">
                <TextField label="Цена (коп.)" type="number" value={String(form.data.price)} onChange={(e) => form.setData('price', Number(e.target.value))} />
                <TextField label="Срок (дней)" type="number" value={String(form.data.duration_days)} onChange={(e) => form.setData('duration_days', Number(e.target.value))} />
                <TextField label="Филиалы (лимит)" type="number" value={String(form.data.max_branches)} onChange={(e) => form.setData('max_branches', e.target.value)} />
                <TextField label="Врачи (лимит)" type="number" value={String(form.data.max_doctors)} onChange={(e) => form.setData('max_doctors', e.target.value)} />
                <TextField label="Фото (лимит)" type="number" value={String(form.data.max_photos)} onChange={(e) => form.setData('max_photos', e.target.value)} />
                <TextField label="Сортировка" type="number" value={String(form.data.sort)} onChange={(e) => form.setData('sort', Number(e.target.value))} />
            </div>
            <Check label="Активен" checked={form.data.is_active} onChange={(e) => form.setData('is_active', e.target.checked)} />
            <Check label="Тариф по умолчанию" checked={form.data.is_default} onChange={(e) => form.setData('is_default', e.target.checked)} />
            <div className="row row--wrap">
                {Object.entries(feature_labels).map(([key, label]) => (
                    <Check
                        key={key}
                        label={label}
                        checked={form.data.features.includes(key)}
                        onChange={() => {
                            const next = form.data.features.includes(key) ? form.data.features.filter((f) => f !== key) : [...form.data.features, key];
                            form.setData('features', next);
                        }}
                    />
                ))}
            </div>
            <Button type="submit" loading={form.processing}>
                Сохранить
            </Button>
        </form>
    );
}
