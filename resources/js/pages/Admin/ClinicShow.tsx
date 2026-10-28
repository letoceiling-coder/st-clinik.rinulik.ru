import { Link, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import ClinicProfileFields, { useClinicProfileForm, type ClinicProfile, type ClinicProfileOptions } from '@/components/ClinicProfileFields';
import { STATUS, StatusBadge } from '@/components/Dash';
import { Button, LinkButton } from '@/components/ui/Button';
import { Check, SelectField, TextArea, TextField } from '@/components/ui/Fields';
import { Alert } from '@/components/ui/Misc';
import { money } from '@/lib/format';

interface Clinic {
    id: number;
    name: string;
    slug: string;
    city: string | null;
    district: string | null;
    organization: string | null;
    organization_id: number | null;
    organization_status: string | null;
    owner: { name: string; email: string } | null;
    address: string;
    phone: string | null;
    email: string | null;
    website: string | null;
    status: string;
    is_verified: boolean;
    rating: number;
    reviews_count: number;
    completeness: number;
    moderation_note: string | null;
    seo_title: string | null;
    seo_description: string | null;
    created_at: string | null;
    updated_at: string | null;
    stats: { doctors: number; services: number; photos: number; leads: number; min_price: number | null };
    schedule: Record<string, { open: string; close: string }> | null;
    is_24_7: boolean;
    parsed: { id: number; source_url: string; imported_at: string | null } | null;
}

const DAYS: Record<string, string> = { mon: 'Пн', tue: 'Вт', wed: 'Ср', thu: 'Чт', fri: 'Пт', sat: 'Сб', sun: 'Вс' };

function date(value: string | null): string {
    return value ? new Date(value).toLocaleString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}

function scheduleText(clinic: Clinic): string {
    if (clinic.is_24_7) return 'Круглосуточно';
    if (!clinic.schedule || Object.keys(clinic.schedule).length === 0) return 'Не заполнен';

    return Object.entries(DAYS)
        .map(([key, label]) => (clinic.schedule?.[key] ? `${label} ${clinic.schedule[key].open}–${clinic.schedule[key].close}` : `${label} выходной`))
        .join(' · ');
}

export default function ClinicShow({
    clinic,
    statuses,
    seoAuto,
    branchForm,
    ...options
}: { clinic: Clinic; statuses: string[]; seoAuto: { title: string; description: string }; branchForm: ClinicProfile } & ClinicProfileOptions) {
    const settings = useForm({
        status: clinic.status,
        is_verified: clinic.is_verified,
        moderation_note: clinic.moderation_note ?? '',
        seo_title: clinic.seo_title ?? '',
        seo_description: clinic.seo_description ?? '',
    });
    const { form: profile, prepare } = useClinicProfileForm(branchForm, options.propertyTypes);

    const saveProfile = (e: FormEvent) => {
        e.preventDefault();
        prepare();
        profile.put(`/admin/clinics/${clinic.id}/profile`, { preserveScroll: true });
    };

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
                        {[clinic.city, clinic.district, clinic.address].filter(Boolean).join(' · ')}
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
                <div className="kpi card">
                    <dt>Врачи</dt>
                    <dd>{clinic.stats.doctors}</dd>
                </div>
                <div className="kpi card">
                    <dt>Услуги с ценами</dt>
                    <dd>{clinic.stats.services}</dd>
                </div>
                <div className="kpi card">
                    <dt>Фото</dt>
                    <dd>{clinic.stats.photos}</dd>
                </div>
                <div className="kpi card">
                    <dt>Заявки</dt>
                    <dd>{clinic.stats.leads}</dd>
                </div>
                <div className="kpi card">
                    <dt>Цены от</dt>
                    <dd>{clinic.stats.min_price ? money(clinic.stats.min_price) : '—'}</dd>
                </div>
            </dl>

            <section className="card">
                <h2 className="card-title">Сводка</h2>
                <dl className="detail-list">
                    <div>
                        <dt>Организация</dt>
                        <dd>
                            {clinic.organization ?? '—'}
                            {clinic.organization_status && clinic.organization_status !== 'active' ? ` (${clinic.organization_status})` : ''}
                        </dd>
                    </div>
                    <div>
                        <dt>Владелец</dt>
                        <dd>{clinic.owner ? `${clinic.owner.name} · ${clinic.owner.email}` : 'Не подключён — клиника добавлена без владельца'}</dd>
                    </div>
                    <div>
                        <dt>Контакты</dt>
                        <dd>{[clinic.phone, clinic.email, clinic.website].filter(Boolean).join(' · ') || '—'}</dd>
                    </div>
                    <div>
                        <dt>График</dt>
                        <dd>{scheduleText(clinic)}</dd>
                    </div>
                    <div>
                        <dt>Источник</dt>
                        <dd>
                            {clinic.parsed ? (
                                <>
                                    Импорт из парсера {date(clinic.parsed.imported_at)} ·{' '}
                                    <a className="link" href={clinic.parsed.source_url} target="_blank" rel="noreferrer">
                                        карточка на Яндекс Картах
                                    </a>
                                </>
                            ) : (
                                'Добавлена вручную или владельцем'
                            )}
                        </dd>
                    </div>
                    <div>
                        <dt>Создана / изменена</dt>
                        <dd>
                            {date(clinic.created_at)} / {date(clinic.updated_at)}
                        </dd>
                    </div>
                </dl>
                {clinic.stats.photos === 0 || clinic.stats.services === 0 ? (
                    <Alert tone="muted">
                        Фото, цены, врачи и график заполняются в кабинете клиники. Пока у клиники нет владельца, их можно взять из спарсенной карточки при импорте.
                    </Alert>
                ) : null}
            </section>

            <form
                className="card stack"
                onSubmit={(e) => {
                    e.preventDefault();
                    settings.put(`/admin/clinics/${clinic.id}`, { preserveScroll: true });
                }}
            >
                <h2 className="card-title" style={{ margin: 0 }}>
                    Модерация и SEO
                </h2>
                <div className="form-grid">
                    <SelectField label="Статус" value={settings.data.status} onChange={(e) => settings.setData('status', e.target.value)}>
                        {statuses.map((s) => (
                            <option key={s} value={s}>
                                {STATUS[s]?.label ?? s}
                            </option>
                        ))}
                    </SelectField>
                    <Check label="Проверена" checked={settings.data.is_verified} onChange={(e) => settings.setData('is_verified', e.target.checked)} />
                    <TextField
                        className="span-2"
                        label="SEO title"
                        maxLength={160}
                        placeholder={seoAuto.title}
                        hint={settings.data.seo_title ? 'Задан вручную — заменяет автоматический.' : 'Пусто — на сайте используется автоматический заголовок по SEO-шаблону (виден в поле серым).'}
                        value={settings.data.seo_title}
                        onChange={(e) => settings.setData('seo_title', e.target.value)}
                        error={settings.errors.seo_title}
                    />
                    <TextArea
                        className="span-2"
                        label="SEO description"
                        maxLength={400}
                        placeholder={seoAuto.description}
                        hint={settings.data.seo_description ? 'Задано вручную — заменяет автоматическое описание.' : 'Пусто — используется автоматическое описание по SEO-шаблону.'}
                        value={settings.data.seo_description}
                        onChange={(e) => settings.setData('seo_description', e.target.value)}
                        error={settings.errors.seo_description}
                    />
                    <div className="row row--wrap span-2" style={{ gap: 8 }}>
                        <Button type="button" size="sm" variant="outline" icon="sparkle" onClick={() => settings.setData((d) => ({ ...d, seo_title: seoAuto.title, seo_description: seoAuto.description }))}>
                            Подставить автоматические
                        </Button>
                        {settings.data.seo_title || settings.data.seo_description ? (
                            <Button type="button" size="sm" variant="ghost" onClick={() => settings.setData((d) => ({ ...d, seo_title: '', seo_description: '' }))}>
                                Вернуть автоматические
                            </Button>
                        ) : null}
                    </div>
                    <TextArea className="span-2" label="Заметка модерации" value={settings.data.moderation_note} maxLength={500} onChange={(e) => settings.setData('moderation_note', e.target.value)} />
                </div>
                <div className="row row--wrap" style={{ gap: 8 }}>
                    <Button type="submit" loading={settings.processing}>
                        Сохранить модерацию и SEO
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

            <form className="stack-lg" onSubmit={saveProfile}>
                <div className="row row--between row--wrap" style={{ gap: 8 }}>
                    <h2 style={{ margin: 0 }}>Профиль клиники</h2>
                    <Button type="submit" loading={profile.processing}>
                        Сохранить профиль
                    </Button>
                </div>
                {Object.keys(profile.errors).length > 0 ? (
                    <Alert tone="danger">
                        Не сохранено: {[...new Set(Object.values(profile.errors))].slice(0, 3).join(' ')}
                    </Alert>
                ) : null}
                <ClinicProfileFields form={profile} options={options} phoneRequired={false} showCoordinates />
                <Button type="submit" size="lg" loading={profile.processing}>
                    Сохранить профиль
                </Button>
            </form>
        </div>
    );
}
