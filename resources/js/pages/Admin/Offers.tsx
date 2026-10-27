import { Link, router, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import { FilterBar, PageHead, PagerSafe, Panel, Table } from '@/components/Dash';
import { Button, LinkButton } from '@/components/ui/Button';
import { Check, SearchInput, SelectField, TextArea, TextField } from '@/components/ui/Fields';
import { Alert, Badge, Tabs } from '@/components/ui/Misc';
import type { Paginated } from '@/lib/types';

type Tab = 'offers' | 'applications' | 'templates' | 'stop-list' | 'settings';
type Tone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | undefined;

export interface OfferRow {
    id: number;
    clinic: { id: number; name: string; status: string; city: string | null };
    status: string;
    is_customized: boolean;
    available: boolean;
    views: number;
    expires_at: string | null;
    created_at: string | null;
    demo: { opens: number; max_opens: number | null; state: string | null } | null;
}

export interface ApplicationRow {
    id: number;
    offer_id: number;
    clinic: string | null;
    name: string;
    phone: string;
    email: string | null;
    position: string | null;
    comment: string | null;
    status: string;
    admin_note: string | null;
    processor: string | null;
    created_at: string | null;
}

interface TemplateRow {
    id: number;
    name: string;
    is_active: boolean;
    version: number | null;
    versions: number;
    offers: number;
    updated_at: string | null;
}

interface StopRow {
    id: number;
    channel: string;
    value: string;
    reason: string;
    note: string | null;
    created_at: string | null;
}

export interface Settings {
    offer_expires_days: number;
    demo: { expires_days: number; max_opens: number | null; max_devices: number | null; sections: string[]; show_tariffs: boolean; notify_manager: boolean; revoke_on_connect: boolean };
    rules: { min_days_between: number; daily_email: number; daily_sms: number; send_from_hour: number; send_to_hour: number };
    manager: { name: string; phone: string; email: string };
}

interface Props {
    tab: Tab;
    counts: Record<string, number>;
    offers: Paginated<OfferRow> | null;
    applications: Paginated<ApplicationRow> | null;
    templates: TemplateRow[] | null;
    stop_list: Paginated<StopRow> | null;
    settings: Settings | null;
    cities: { id: number; name: string }[];
    offer_statuses: Record<string, string>;
    application_statuses: Record<string, string>;
    stop_reasons: Record<string, string>;
    sections: Record<string, string>;
    channels: Record<string, string>;
    filters: { q?: string; status?: string; city?: string };
}

export const OFFER_TONE: Record<string, Tone> = { ready: 'info', sent: 'primary', viewed: 'primary', applied: 'warning', connected: 'success', revoked: undefined };
export const APPLICATION_TONE: Record<string, Tone> = { new: 'warning', in_progress: 'info', connected: 'success', rejected: undefined };

const go = (tab: Tab) => router.get('/admin/offers', { tab }, { preserveState: false });

export default function AdminOffers(props: Props) {
    const { tab, counts } = props;

    return (
        <div className="stack-lg">
            <PageHead
                title="КП и демо-кабинеты"
                text="Персональные предложения для черновиков клиник: страница КП, демо-кабинет только для просмотра, заявки на подключение."
                action={
                    <div className="row row--wrap offers-head-actions">
                        <LinkButton href="/admin/campaigns" variant="outline" icon="mail">
                            Кампании
                        </LinkButton>
                        <LinkButton href="/admin/offers/templates/create" icon="plus">
                            Новый шаблон
                        </LinkButton>
                    </div>
                }
            />

            <Tabs<Tab>
                label="Разделы КП"
                value={tab}
                onChange={go}
                items={[
                    { key: 'offers', label: 'Предложения', count: counts.offers || undefined },
                    { key: 'applications', label: 'Заявки', count: counts.applications || undefined },
                    { key: 'templates', label: 'Шаблоны', count: counts.templates || undefined },
                    { key: 'stop-list', label: 'Стоп-лист', count: counts['stop-list'] || undefined },
                    { key: 'settings', label: 'Настройки' },
                ]}
            />

            {tab === 'offers' && props.offers ? <OffersTab {...props} offers={props.offers} /> : null}
            {tab === 'applications' && props.applications ? <ApplicationsTab applications={props.applications} statuses={props.application_statuses} /> : null}
            {tab === 'templates' && props.templates ? <TemplatesTab templates={props.templates} /> : null}
            {tab === 'stop-list' && props.stop_list ? <StopListTab {...props} stopList={props.stop_list} /> : null}
            {tab === 'settings' && props.settings ? <SettingsTab settings={props.settings} sections={props.sections} /> : null}
        </div>
    );
}

function OffersTab({ offers, cities, offer_statuses, filters }: Props & { offers: Paginated<OfferRow> }) {
    return (
        <div className="stack">
            <Alert tone="muted" icon="info">
                КП формируется из карточки организации в разделе «Парсер» (кнопка «Сформировать КП») или сразу для многих черновиков — через кампанию.
            </Alert>
            <FilterBar action="/admin/offers">
                <input type="hidden" name="tab" value="offers" />
                <SearchInput name="q" defaultValue={filters.q} placeholder="Название клиники" />
                <SelectField name="status" defaultValue={filters.status ?? ''} aria-label="Статус">
                    <option value="">Все статусы</option>
                    {Object.entries(offer_statuses).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </SelectField>
                <SelectField name="city" defaultValue={filters.city ?? ''} aria-label="Город">
                    <option value="">Все города</option>
                    {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </SelectField>
            </FilterBar>

            {offers.data.length === 0 ? (
                <Panel>
                    <p className="text-muted">Предложений пока нет.</p>
                </Panel>
            ) : (
                <Table headers={['Клиника', 'Статус', 'Просмотры КП', 'Демо', 'Действует до', '']}>
                    {offers.data.map((o) => (
                        <tr key={o.id}>
                            <td>
                                <Link href={`/admin/offers/${o.id}`} className="link">
                                    <b>{o.clinic.name}</b>
                                </Link>
                                <div className="text-xs text-muted">
                                    {o.clinic.city ?? 'город не указан'} · {o.created_at}
                                    {o.is_customized ? ' · текст изменён вручную' : ''}
                                </div>
                            </td>
                            <td>
                                <Badge tone={OFFER_TONE[o.status]}>{offer_statuses[o.status] ?? o.status}</Badge>
                            </td>
                            <td>{o.views}</td>
                            <td>
                                {o.demo ? (
                                    <span className={o.demo.state ? 'text-muted' : undefined}>
                                        {o.demo.opens}
                                        {o.demo.max_opens ? ` из ${o.demo.max_opens}` : ''}
                                        {o.demo.state ? ' · закрыт' : ''}
                                    </span>
                                ) : (
                                    '—'
                                )}
                            </td>
                            <td>{o.available ? (o.expires_at ?? 'бессрочно') : <span className="text-muted">недоступно</span>}</td>
                            <td>
                                <LinkButton href={`/admin/offers/${o.id}`} size="sm" variant="outline">
                                    Открыть
                                </LinkButton>
                            </td>
                        </tr>
                    ))}
                </Table>
            )}
            <PagerSafe page={offers} />
        </div>
    );
}

export function ApplicationsTab({ applications, statuses }: { applications: Paginated<ApplicationRow> | { data: ApplicationRow[] }; statuses: Record<string, string> }) {
    if (applications.data.length === 0) {
        return (
            <Panel>
                <p className="text-muted">Заявок на подключение пока нет. Они появляются, когда клиника нажимает «Подключиться» на странице КП.</p>
            </Panel>
        );
    }

    return (
        <div className="stack">
            <ul className="offers-list">
                {applications.data.map((a) => (
                    <ApplicationItem key={a.id} application={a} statuses={statuses} />
                ))}
            </ul>
            {'last_page' in applications ? <PagerSafe page={applications} /> : null}
        </div>
    );
}

function ApplicationItem({ application: a, statuses }: { application: ApplicationRow; statuses: Record<string, string> }) {
    const form = useForm({ status: a.status, admin_note: a.admin_note ?? '' });
    const save = (e: FormEvent) => {
        e.preventDefault();
        form.put(`/admin/offers/applications/${a.id}`, { preserveScroll: true });
    };

    return (
        <li className="offers-item card">
            <div className="offers-item__main stack">
                <div className="offers-item__title">
                    <b>{a.name}</b>
                    <Badge tone={APPLICATION_TONE[a.status]}>{statuses[a.status] ?? a.status}</Badge>
                </div>
                <p className="text-sm">
                    <a className="link" href={`tel:${a.phone.replace(/[^\d+]/g, '')}`}>
                        {a.phone}
                    </a>
                    {a.email ? (
                        <>
                            {' · '}
                            <a className="link" href={`mailto:${a.email}`}>
                                {a.email}
                            </a>
                        </>
                    ) : null}
                    {a.position ? ` · ${a.position}` : ''}
                </p>
                {a.comment ? <p className="text-sm offers-quote">{a.comment}</p> : null}
                <p className="text-xs text-muted">
                    <Link href={`/admin/offers/${a.offer_id}`} className="link">
                        {a.clinic ?? `КП #${a.offer_id}`}
                    </Link>{' '}
                    · {a.created_at}
                    {a.processor ? ` · обработал ${a.processor}` : ''}
                </p>
            </div>
            <form className="offers-item__side stack" onSubmit={save}>
                <SelectField label="Статус" value={form.data.status} onChange={(e) => form.setData('status', e.target.value)}>
                    {Object.entries(statuses).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </SelectField>
                <TextArea label="Заметка" rows={2} value={form.data.admin_note} onChange={(e) => form.setData('admin_note', e.target.value)} error={form.errors.admin_note} />
                <Button type="submit" size="sm" variant="outline" loading={form.processing} disabled={!form.isDirty}>
                    Сохранить
                </Button>
                {form.data.status === 'connected' && a.status !== 'connected' ? (
                    <p className="text-xs text-muted">Демо-доступ закроется, демо-данные удалятся.</p>
                ) : null}
            </form>
        </li>
    );
}

function TemplatesTab({ templates }: { templates: TemplateRow[] }) {
    if (templates.length === 0) {
        return (
            <Panel>
                <div className="stack">
                    <p className="text-muted">Шаблонов ещё нет. Создайте первый — в нём уже будет пример текста со всеми переменными.</p>
                    <div>
                        <LinkButton href="/admin/offers/templates/create" icon="plus">
                            Создать шаблон
                        </LinkButton>
                    </div>
                </div>
            </Panel>
        );
    }

    return (
        <Table headers={['Шаблон', 'Версия', 'КП по шаблону', 'Изменён', '']}>
            {templates.map((t) => (
                <tr key={t.id}>
                    <td>
                        <Link href={`/admin/offers/templates/${t.id}`} className="link">
                            <b>{t.name}</b>
                        </Link>{' '}
                        {!t.is_active ? <Badge>выключен</Badge> : null}
                    </td>
                    <td>
                        v{t.version ?? '—'} <span className="text-xs text-muted">(всего {t.versions})</span>
                    </td>
                    <td>{t.offers}</td>
                    <td>{t.updated_at ?? '—'}</td>
                    <td>
                        <LinkButton href={`/admin/offers/templates/${t.id}`} size="sm" variant="outline" icon="edit">
                            Изменить
                        </LinkButton>
                    </td>
                </tr>
            ))}
        </Table>
    );
}

function StopListTab({ stopList, channels, stop_reasons, filters }: Props & { stopList: Paginated<StopRow> }) {
    const form = useForm({ channel: 'email', value: '', note: '' });
    const add = (e: FormEvent) => {
        e.preventDefault();
        form.post('/admin/offers/stop-list', { preserveScroll: true, onSuccess: () => form.reset('value', 'note') });
    };
    const remove = (row: StopRow) => {
        if (window.confirm(`Убрать ${row.value} из стоп-листа? На этот контакт снова смогут уходить КП.`)) {
            router.delete(`/admin/offers/stop-list/${row.id}`, { preserveScroll: true });
        }
    };

    return (
        <div className="stack">
            <Panel title="Добавить контакт">
                <form className="offers-form-grid" onSubmit={add}>
                    <SelectField label="Канал" value={form.data.channel} onChange={(e) => form.setData('channel', e.target.value)}>
                        {Object.entries(channels).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </SelectField>
                    <TextField label="Email, телефон или ссылка" value={form.data.value} onChange={(e) => form.setData('value', e.target.value)} error={form.errors.value} required />
                    <TextField label="Причина" value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} placeholder="Например: просили не писать" />
                    <div className="offers-form-grid__action">
                        <Button type="submit" loading={form.processing}>
                            Добавить
                        </Button>
                    </div>
                </form>
                <p className="text-xs text-muted">Номер телефона блокируется сразу для SMS, звонков и WhatsApp. Отписавшиеся по ссылке из письма попадают сюда автоматически.</p>
            </Panel>

            <FilterBar action="/admin/offers">
                <input type="hidden" name="tab" value="stop-list" />
                <SearchInput name="q" defaultValue={filters.q} placeholder="Поиск контакта" />
            </FilterBar>

            {stopList.data.length === 0 ? (
                <Panel>
                    <p className="text-muted">Стоп-лист пуст.</p>
                </Panel>
            ) : (
                <Table headers={['Контакт', 'Канал', 'Причина', 'Добавлен', '']}>
                    {stopList.data.map((s) => (
                        <tr key={s.id}>
                            <td>
                                <code>{s.value}</code>
                                {s.note ? <div className="text-xs text-muted">{s.note}</div> : null}
                            </td>
                            <td>{channels[s.channel] ?? s.channel}</td>
                            <td>{stop_reasons[s.reason] ?? s.reason}</td>
                            <td>{s.created_at}</td>
                            <td>
                                <Button size="sm" variant="ghost" icon="trash" onClick={() => remove(s)}>
                                    Убрать
                                </Button>
                            </td>
                        </tr>
                    ))}
                </Table>
            )}
            <PagerSafe page={stopList} />
        </div>
    );
}

function SettingsTab({ settings, sections }: { settings: Settings; sections: Record<string, string> }) {
    const form = useForm<Settings>(settings);
    const [saved, setSaved] = useState(false);
    const err = form.errors as Record<string, string | undefined>;
    const demo = form.data.demo;
    const rules = form.data.rules;
    const setDemo = <K extends keyof Settings['demo']>(key: K, value: Settings['demo'][K]) => form.setData('demo', { ...demo, [key]: value });
    const setRule = (key: keyof Settings['rules'], value: string) => form.setData('rules', { ...rules, [key]: Number(value) });
    const num = (v: string) => (v === '' ? null : Number(v));
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.put('/admin/offers/settings', { preserveScroll: true, onSuccess: () => setSaved(true) });
    };

    return (
        <form className="stack" onSubmit={submit}>
            <Panel title="Демо-кабинет по умолчанию">
                <div className="stack">
                    <p className="text-sm text-muted">Применяется к новым демо-ссылкам. Для конкретной ссылки ограничения меняются на странице КП.</p>
                    <div className="offers-form-grid">
                        <TextField label="Срок действия КП, дней" type="number" min={1} value={form.data.offer_expires_days} onChange={(e) => form.setData('offer_expires_days', Number(e.target.value))} error={err.offer_expires_days} />
                        <TextField label="Срок демо-ссылки, дней" type="number" min={1} value={demo.expires_days} onChange={(e) => setDemo('expires_days', Number(e.target.value))} error={err['demo.expires_days']} />
                        <TextField label="Максимум открытий" type="number" min={1} value={demo.max_opens ?? ''} onChange={(e) => setDemo('max_opens', num(e.target.value))} hint="Пусто — без ограничения" error={err['demo.max_opens']} />
                        <TextField label="Максимум устройств" type="number" min={1} value={demo.max_devices ?? ''} onChange={(e) => setDemo('max_devices', num(e.target.value))} hint="Пусто — без ограничения" error={err['demo.max_devices']} />
                    </div>
                    <SectionPicker sections={sections} value={demo.sections} onChange={(v) => setDemo('sections', v)} error={err['demo.sections']} />
                    <div className="offers-checks">
                        <Check label="Показывать тарифы на странице КП" checked={demo.show_tariffs} onChange={(e) => setDemo('show_tariffs', e.target.checked)} />
                        <Check label="Сообщать менеджеру об открытии демо" checked={demo.notify_manager} onChange={(e) => setDemo('notify_manager', e.target.checked)} />
                        <Check label="Закрывать демо после подключения клиники" checked={demo.revoke_on_connect} onChange={(e) => setDemo('revoke_on_connect', e.target.checked)} />
                    </div>
                </div>
            </Panel>

            <Panel title="Правила рассылки">
                <div className="stack">
                    <div className="offers-form-grid">
                        <TextField label="Не чаще одного КП на контакт, дней" type="number" min={0} value={rules.min_days_between} onChange={(e) => setRule('min_days_between', e.target.value)} error={err['rules.min_days_between']} />
                        <TextField label="Писем в день" type="number" min={0} value={rules.daily_email} onChange={(e) => setRule('daily_email', e.target.value)} error={err['rules.daily_email']} />
                        <TextField label="SMS в день" type="number" min={0} value={rules.daily_sms} onChange={(e) => setRule('daily_sms', e.target.value)} error={err['rules.daily_sms']} />
                        <TextField label="Отправлять с, час" type="number" min={0} max={23} value={rules.send_from_hour} onChange={(e) => setRule('send_from_hour', e.target.value)} error={err['rules.send_from_hour']} />
                        <TextField label="Отправлять до, час" type="number" min={1} max={24} value={rules.send_to_hour} onChange={(e) => setRule('send_to_hour', e.target.value)} error={err['rules.send_to_hour']} />
                    </div>
                    <p className="text-xs text-muted">Время — московское. Письма и SMS вне рабочего окна ждут его начала, при исчерпании дневного лимита отправка продолжается на следующий день.</p>
                </div>
            </Panel>

            <Panel title="Менеджер в текстах КП">
                <div className="offers-form-grid">
                    <TextField label="Имя" value={form.data.manager.name} onChange={(e) => form.setData('manager', { ...form.data.manager, name: e.target.value })} error={err['manager.name']} />
                    <TextField label="Телефон" value={form.data.manager.phone} onChange={(e) => form.setData('manager', { ...form.data.manager, phone: e.target.value })} error={err['manager.phone']} />
                    <TextField
                        label="Email для уведомлений"
                        type="email"
                        value={form.data.manager.email}
                        onChange={(e) => form.setData('manager', { ...form.data.manager, email: e.target.value })}
                        hint="Сюда придут письма об открытии демо"
                        error={err['manager.email']}
                    />
                </div>
            </Panel>

            <div className="row offers-save">
                <Button type="submit" loading={form.processing}>
                    Сохранить настройки
                </Button>
                {saved && !form.isDirty ? <span className="text-sm text-muted">Сохранено</span> : null}
            </div>
        </form>
    );
}

export function SectionPicker({ sections, value, onChange, error }: { sections: Record<string, string>; value: string[]; onChange: (v: string[]) => void; error?: string }) {
    const toggle = (key: string, on: boolean) => onChange(on ? [...value, key] : value.filter((v) => v !== key));

    return (
        <fieldset className="offers-sections">
            <legend className="field__label">Разделы кабинета в демо</legend>
            <div className="offers-sections__grid">
                {Object.entries(sections).map(([key, label]) => (
                    <Check key={key} label={label} checked={value.includes(key)} onChange={(e) => toggle(key, e.target.checked)} />
                ))}
            </div>
            {error ? (
                <p className="field__error" role="alert">
                    {error}
                </p>
            ) : null}
        </fieldset>
    );
}
