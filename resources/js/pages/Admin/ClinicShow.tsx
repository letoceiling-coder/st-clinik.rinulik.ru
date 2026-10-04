import { Link, router, useForm } from '@inertiajs/react';
import { STATUS, StatusBadge } from '@/components/Dash';
import { Button, LinkButton } from '@/components/ui/Button';
import { Check, SelectField, TextArea, TextField } from '@/components/ui/Fields';

interface Clinic {
    id: number;
    name: string;
    slug: string;
    city: string | null;
    organization: string | null;
    address: string;
    status: string;
    is_verified: boolean;
    rating: number;
    reviews_count: number;
    completeness: number;
    moderation_note: string | null;
    seo_title: string | null;
    seo_description: string | null;
}

export default function ClinicShow({ clinic, statuses }: { clinic: Clinic; statuses: string[] }) {
    const form = useForm({
        status: clinic.status,
        is_verified: clinic.is_verified,
        moderation_note: clinic.moderation_note ?? '',
        seo_title: clinic.seo_title ?? '',
        seo_description: clinic.seo_description ?? '',
    });

    return (
        <div className="stack-lg">
            <div className="page-head page-head--dash">
                <div>
                    <p className="text-sm text-muted" style={{ marginBottom: 8 }}>
                        <Link href="/admin/clinics" className="link">
                            ← К списку клиник
                        </Link>
                    </p>
                    <h1>{clinic.name}</h1>
                    <p className="text-muted">
                        {clinic.city} · {clinic.address}
                        {clinic.organization ? ` · ${clinic.organization}` : ''}
                    </p>
                </div>
                <div className="row row--wrap" style={{ gap: 8 }}>
                    <StatusBadge status={clinic.status} />
                    <LinkButton href={`/clinics/${clinic.slug}`} variant="outline" size="sm" target="_blank">
                        Страница на сайте
                    </LinkButton>
                </div>
            </div>

            <dl className="kpi-grid">
                <div className="kpi card">
                    <dt>Рейтинг</dt>
                    <dd>{clinic.rating > 0 ? clinic.rating.toFixed(1) : '—'}</dd>
                </div>
                <div className="kpi card">
                    <dt>Отзывы</dt>
                    <dd>{clinic.reviews_count}</dd>
                </div>
                <div className="kpi card">
                    <dt>Заполненность</dt>
                    <dd>{clinic.completeness}%</dd>
                </div>
            </dl>

            <form
                className="card stack"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.put(`/admin/clinics/${clinic.id}`);
                }}
            >
                <h2 className="card-title" style={{ margin: 0 }}>
                    Настройки и модерация
                </h2>
                <div className="form-grid">
                    <SelectField label="Статус" value={form.data.status} onChange={(e) => form.setData('status', e.target.value)}>
                        {statuses.map((s) => (
                            <option key={s} value={s}>
                                {STATUS[s]?.label ?? s}
                            </option>
                        ))}
                    </SelectField>
                    <Check label="Проверена" checked={form.data.is_verified} onChange={(e) => form.setData('is_verified', e.target.checked)} />
                    <TextField className="span-2" label="SEO title" value={form.data.seo_title} onChange={(e) => form.setData('seo_title', e.target.value)} />
                    <TextArea className="span-2" label="SEO description" value={form.data.seo_description} onChange={(e) => form.setData('seo_description', e.target.value)} />
                    <TextArea className="span-2" label="Заметка модерации" value={form.data.moderation_note} onChange={(e) => form.setData('moderation_note', e.target.value)} />
                </div>
                <div className="row row--wrap" style={{ gap: 8 }}>
                    <Button type="submit" loading={form.processing}>
                        Сохранить
                    </Button>
                    <Button
                        type="button"
                        variant="danger"
                        onClick={() => confirm('Удалить клинику без возможности восстановления?') && router.delete(`/admin/clinics/${clinic.id}`)}
                    >
                        Удалить
                    </Button>
                </div>
            </form>
        </div>
    );
}
