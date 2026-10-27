import { Link, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { PageHead, Panel, StatusBadge } from '@/components/Dash';
import { Button, LinkButton } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Fields';
import { Alert, Badge } from '@/components/ui/Misc';

interface Organization {
    id: number;
    external_id: string;
    name: string;
    city: string | null;
    city_known: boolean;
    region: string | null;
    address: string | null;
    address_details: string | null;
    lat: number | null;
    lng: number | null;
    phones: string[];
    website: string | null;
    socials: { type: string; url: string }[];
    categories: string[];
    hours: string | null;
    rating: number | null;
    reviews_count: number;
    status: string;
    note: string | null;
    source_url: string | null;
    has_full_card: boolean;
    services: string[];
    products: { name: string; price: string }[];
    amenities: string[];
    photos_count: number;
    clinic: { id: number; name: string; slug: string; status: string } | null;
    match: { id: number; name: string; slug: string; status: string; address: string | null; phone: string | null; reason: string | null } | null;
    task: { id: number; type: string; at: string | null } | null;
    imported: { at: string; by: string | null } | null;
    importable: boolean;
    synced_at: string | null;
}

interface Contact {
    id: number;
    type: string;
    type_label: string;
    value: string;
    source: string;
    is_verified: boolean;
    do_not_contact: boolean;
}

interface Props {
    organization: Organization;
    contacts: Contact[];
    network: { id: number; name: string; address: string | null; clinic_id: number | null; status: string }[];
    email_tasks: { id: number; status: string; found: number; error: string | null; at: string | null }[];
    statuses: Record<string, string>;
    contact_types: Record<string, string>;
    task_statuses: Record<string, string>;
    offers: { templates: { id: number; name: string }[]; current: { id: number; status: string } | null; allowed: boolean } | null;
}

const contactHref = (c: Contact) => {
    if (c.type === 'phone') return `tel:${c.value}`;
    if (c.type === 'email') return `mailto:${c.value}`;
    return c.value.startsWith('http') ? c.value : undefined;
};

function OfferBlock({ organizationId, offers, cityKnown }: { organizationId: number; offers: NonNullable<Props['offers']>; cityKnown: boolean }) {
    const form = useForm({ parsed_organization_id: organizationId, template_id: offers.templates[0]?.id ?? '' });

    if (offers.current) {
        return (
            <div className="parser-offer card">
                <span className="text-sm">
                    <b>Коммерческое предложение</b> уже сформировано.
                </span>
                <LinkButton href={`/admin/offers/${offers.current.id}`} size="sm" variant="outline">
                    Открыть КП
                </LinkButton>
            </div>
        );
    }
    if (!offers.allowed) return null;

    return (
        <form
            className="parser-offer card"
            onSubmit={(e) => {
                e.preventDefault();
                form.post('/admin/offers');
            }}
        >
            <span className="text-sm">
                <b>Коммерческое предложение.</b> Создаст черновик клиники (если его ещё нет), страницу КП и демо-кабинет.
            </span>
            {offers.templates.length === 0 ? (
                <LinkButton href="/admin/offers/templates/create" size="sm" variant="outline">
                    Создать шаблон КП
                </LinkButton>
            ) : (
                <div className="parser-offer__form">
                    <SelectField aria-label="Шаблон КП" value={form.data.template_id} onChange={(e) => form.setData('template_id', Number(e.target.value))}>
                        {offers.templates.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </SelectField>
                    <Button type="submit" size="sm" icon="send" loading={form.processing} disabled={!cityKnown}>
                        Сформировать КП
                    </Button>
                </div>
            )}
        </form>
    );
}

export default function ParsedOrganizationPage({ organization: o, contacts, network, email_tasks, statuses, contact_types, task_statuses, offers }: Props) {
    const base = `/admin/parser/organizations/${o.id}`;
    const contactForm = useForm({ type: 'email', value: '' });
    const noteForm = useForm({ status: o.status === 'imported' ? 'reviewed' : o.status, note: o.note ?? '' });
    const hasEmailTaskRunning = email_tasks.some((t) => ['queued', 'running'].includes(t.status));

    const post = (url: string, data: Record<string, unknown> = {}, confirmText?: string) => {
        if (confirmText && !window.confirm(confirmText)) return;
        router.post(url, data as never, { preserveScroll: true });
    };

    const addContact = (e: FormEvent) => {
        e.preventDefault();
        contactForm.post(`${base}/contacts`, { preserveScroll: true, onSuccess: () => contactForm.reset('value') });
    };

    const saveNote = (e: FormEvent) => {
        e.preventDefault();
        noteForm.post(`${base}/status`, { preserveScroll: true });
    };

    return (
        <div className="stack-lg">
            <PageHead
                title={o.name}
                text={
                    <>
                        <Badge>{statuses[o.status] ?? o.status}</Badge> {o.city ?? '—'} · id Яндекса {o.external_id}
                        {o.synced_at ? ` · обновлено ${o.synced_at}` : ''}
                    </>
                }
                action={
                    <LinkButton href="/admin/parser?tab=organizations" variant="outline" size="sm">
                        К списку
                    </LinkButton>
                }
            />

            {o.clinic ? (
                <Alert tone="success">
                    Импортирована {o.imported?.at}
                    {o.imported?.by ? ` (${o.imported.by})` : ''} в черновик{' '}
                    <Link href={`/admin/clinics/${o.clinic.id}`} className="link">
                        «{o.clinic.name}»
                    </Link>{' '}
                    — <StatusBadge status={o.clinic.status} />
                </Alert>
            ) : null}

            {o.match && !o.clinic ? (
                <Alert tone="warning">
                    Возможно, это клиника, которая уже есть на сайте:{' '}
                    <Link href={`/admin/clinics/${o.match.id}`} className="link">
                        «{o.match.name}»
                    </Link>{' '}
                    ({o.match.reason}; {o.match.address ?? 'без адреса'}, {o.match.phone ?? 'без телефона'}). Если это она — отметьте карточку как дубль.
                </Alert>
            ) : null}

            {offers ? <OfferBlock organizationId={o.id} offers={offers} cityKnown={o.city_known} /> : null}

            {!o.city_known ? <Alert tone="warning">Города «{o.city}» нет в справочнике. Добавьте его в «Справочники → Города», иначе импорт недоступен.</Alert> : null}

            {o.importable ? (
                <div className="row">
                    <Button onClick={() => post(`${base}/import`, { photos: true }, 'Создать черновик клиники из этой карточки? На сайте он не появится до публикации.')} disabled={!o.city_known}>
                        Импортировать как черновик
                    </Button>
                    <Button variant="outline" onClick={() => post(`${base}/import`, { photos: false })} disabled={!o.city_known}>
                        Импортировать без фото
                    </Button>
                    {o.match ? (
                        <Button variant="secondary" onClick={() => post(`${base}/status`, { status: 'duplicate', match_clinic_id: o.match?.id })}>
                            Это дубль «{o.match.name}»
                        </Button>
                    ) : null}
                    <Button variant="ghost" onClick={() => post(`${base}/status`, { status: 'ignored' }, 'Скрыть карточку? Её можно вернуть фильтром «Скрыта».')}>
                        Скрыть
                    </Button>
                </div>
            ) : null}

            <div className="parser-show-grid">
                <Panel title="Данные из Яндекса">
                    <dl className="parser-facts text-sm">
                        <dt>Адрес</dt>
                        <dd>
                            {o.address ?? '—'}
                            {o.address_details ? <div className="text-muted">{o.address_details}</div> : null}
                        </dd>
                        <dt>Регион</dt>
                        <dd>{o.region ?? '—'}</dd>
                        <dt>Координаты</dt>
                        <dd>{o.lat && o.lng ? `${o.lat}, ${o.lng}` : '—'}</dd>
                        <dt>Рубрики</dt>
                        <dd>{o.categories.length > 0 ? o.categories.join(', ') : '—'}</dd>
                        <dt>Часы работы</dt>
                        <dd>{o.hours ?? '—'}</dd>
                        <dt>Рейтинг Яндекса</dt>
                        <dd>
                            {o.rating ?? '—'} ({o.reviews_count} отзывов) — только для внутренней аналитики, на сайт не переносится
                        </dd>
                        <dt>Фото</dt>
                        <dd>{o.photos_count}</dd>
                        <dt>Карточка</dt>
                        <dd>
                            {o.has_full_card ? 'полная' : 'из выдачи (без графика, услуг и цен)'}
                            {o.source_url ? (
                                <>
                                    {' · '}
                                    <a href={o.source_url} target="_blank" rel="noreferrer" className="link">
                                        открыть на Яндекс Картах
                                    </a>
                                </>
                            ) : null}
                        </dd>
                        {o.task ? (
                            <>
                                <dt>Источник</dt>
                                <dd>
                                    задача #{o.task.id} ({o.task.type}), {o.task.at}
                                </dd>
                            </>
                        ) : null}
                    </dl>
                </Panel>

                <Panel
                    title="Контакты для КП"
                    action={
                        o.website ? (
                            <Button size="sm" variant="outline" loading={hasEmailTaskRunning} disabled={hasEmailTaskRunning} onClick={() => post(`${base}/emails`)}>
                                Найти email на сайте
                            </Button>
                        ) : null
                    }
                >
                    {contacts.length === 0 ? (
                        <p className="text-sm text-muted">Контактов нет.</p>
                    ) : (
                        <ul className="parser-contacts">
                            {contacts.map((c) => (
                                <li key={c.id} className={`parser-contacts__item${c.do_not_contact ? ' is-muted' : ''}`}>
                                    <div className="parser-contacts__value">
                                        <span className="text-xs text-muted">
                                            {c.type_label} · {c.source}
                                        </span>
                                        {contactHref(c) ? (
                                            <a href={contactHref(c)} target="_blank" rel="noreferrer" className="link parser-contact">
                                                {c.value}
                                            </a>
                                        ) : (
                                            <span className="parser-contact">{c.value}</span>
                                        )}
                                        {c.do_not_contact ? <Badge tone="danger">не писать</Badge> : c.is_verified ? <Badge tone="success">подтверждён</Badge> : null}
                                    </div>
                                    <div className="parser-item__actions">
                                        <Button size="sm" variant="ghost" onClick={() => router.put(`/admin/parser/contacts/${c.id}`, { is_verified: !c.is_verified }, { preserveScroll: true })}>
                                            {c.is_verified ? 'Снять отметку' : 'Подтвердить'}
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => router.put(`/admin/parser/contacts/${c.id}`, { do_not_contact: !c.do_not_contact }, { preserveScroll: true })}>
                                            {c.do_not_contact ? 'Разрешить' : 'Не писать'}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => window.confirm('Удалить контакт?') && router.delete(`/admin/parser/contacts/${c.id}`, { preserveScroll: true })}
                                        >
                                            Удалить
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {hasEmailTaskRunning ? (
                        <div className="parser-task-progress">
                            <div className="parser-progress is-indeterminate" role="progressbar" aria-label="Идёт поиск email" />
                            <p className="text-xs">Ищем email на сайте клиники — обычно до минуты. Можно уйти со страницы, по завершении придёт уведомление.</p>
                        </div>
                    ) : null}

                    {email_tasks.length > 0 ? (
                        <ul className="text-xs text-muted">
                            {email_tasks.map((t) => (
                                <li key={t.id}>
                                    Поиск email {t.at}: {task_statuses[t.status] ?? t.status}
                                    {t.status === 'completed' ? `, найдено ${t.found}` : ''}
                                    {t.error ? ` — ${t.error}` : ''}
                                </li>
                            ))}
                        </ul>
                    ) : null}

                    <form className="parser-contact-form" onSubmit={addContact}>
                        <SelectField label="Тип" value={contactForm.data.type} onChange={(e) => contactForm.setData('type', e.target.value)}>
                            {Object.entries(contact_types).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {v}
                                </option>
                            ))}
                        </SelectField>
                        <TextField
                            label="Контакт"
                            value={contactForm.data.value}
                            onChange={(e) => contactForm.setData('value', e.target.value)}
                            error={contactForm.errors.value}
                            placeholder={contactForm.data.type === 'email' ? 'info@clinic.ru' : ''}
                            required
                        />
                        <Button type="submit" size="sm" variant="outline" loading={contactForm.processing}>
                            Добавить
                        </Button>
                    </form>
                </Panel>
            </div>

            {o.services.length > 0 || o.amenities.length > 0 ? (
                <Panel title="Услуги и особенности">
                    {o.services.length > 0 ? <p className="text-sm">{o.services.join(', ')}</p> : null}
                    {o.amenities.length > 0 ? <p className="text-sm text-muted">{o.amenities.join(' · ')}</p> : null}
                </Panel>
            ) : null}

            {o.products.length > 0 ? (
                <Panel title="Цены из Яндекса">
                    <p className="text-xs text-muted">Перенос цен в прайс черновика появится вместе со справочником соответствия услуг.</p>
                    <ul className="parser-prices text-sm">
                        {o.products.map((p, i) => (
                            <li key={i}>
                                <span>{p.name}</span>
                                <b>{p.price}</b>
                            </li>
                        ))}
                    </ul>
                </Panel>
            ) : null}

            {network.length > 0 ? (
                <Panel title={`Сеть: ещё ${network.length}`}>
                    <p className="text-xs text-muted">Общий сайт или телефон. При импорте филиалы объединяются в одну организацию.</p>
                    <ul className="text-sm">
                        {network.map((n) => (
                            <li key={n.id}>
                                <Link href={`/admin/parser/organizations/${n.id}`} className="link">
                                    {n.name}
                                </Link>{' '}
                                — {n.address ?? 'без адреса'} · {statuses[n.status] ?? n.status}
                            </li>
                        ))}
                    </ul>
                </Panel>
            ) : null}

            {o.status !== 'imported' ? (
                <Panel title="Решение администратора">
                    <form className="stack" onSubmit={saveNote}>
                        <SelectField label="Статус" value={noteForm.data.status} onChange={(e) => noteForm.setData('status', e.target.value)}>
                            {['new', 'reviewed', 'duplicate', 'ignored'].map((s) => (
                                <option key={s} value={s}>
                                    {statuses[s]}
                                </option>
                            ))}
                        </SelectField>
                        <TextField label="Заметка" value={noteForm.data.note} onChange={(e) => noteForm.setData('note', e.target.value)} error={noteForm.errors.note} />
                        <div>
                            <Button type="submit" size="sm" loading={noteForm.processing}>
                                Сохранить
                            </Button>
                        </div>
                    </form>
                </Panel>
            ) : null}
        </div>
    );
}
