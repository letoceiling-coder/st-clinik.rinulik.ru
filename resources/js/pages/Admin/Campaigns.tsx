import { Link, useForm, useHttp } from '@inertiajs/react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { PageHead, PagerSafe, Panel, Table } from '@/components/Dash';
import { Button, LinkButton } from '@/components/ui/Button';
import { Check, SearchInput, SelectField, TextField } from '@/components/ui/Fields';
import { Alert, Badge } from '@/components/ui/Misc';
import type { Paginated } from '@/lib/types';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | undefined;

export interface Funnel {
    total: number;
    queued: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    demo_opened: number;
    replied: number;
    connected: number;
    failed: number;
    skipped: number;
    unsubscribed: number;
}

interface CampaignRow {
    id: number;
    name: string;
    template: string | null;
    channels: string[];
    status: string;
    recipients: number;
    funnel: Funnel;
    created_at: string | null;
    by: string | null;
}

interface Draft {
    id: number;
    name: string;
    city: string | null;
    rating: number | null;
    contacts: string[];
}

interface Props {
    campaigns: Paginated<CampaignRow>;
    templates: { id: number; name: string }[];
    cities: { id: number; name: string }[];
    channels: Record<string, string>;
    auto_channels: string[];
    statuses: Record<string, string>;
    has_options: Record<string, string>;
    drafts: Draft[];
}

interface EstimateForm {
    filters: { city_id?: number | '' | null; rating_min?: string | null; has?: string[]; not_offered?: boolean; ids?: number[] };
}

export const CAMPAIGN_TONE: Record<string, Tone> = { draft: undefined, running: 'primary', paused: 'warning', completed: 'success' };

export default function AdminCampaigns(props: Props) {
    const { campaigns, statuses, channels } = props;
    const [creating, setCreating] = useState(campaigns.data.length === 0);

    return (
        <div className="stack-lg">
            <PageHead
                title="Кампании КП"
                text="Массовая рассылка КП черновикам: email и SMS уходят автоматически, звонки и мессенджеры система готовит, а отправляет менеджер."
                action={
                    <div className="row row--wrap offers-head-actions">
                        <LinkButton href="/admin/offers" variant="ghost">
                            КП и демо
                        </LinkButton>
                        <Button icon="plus" onClick={() => setCreating((v) => !v)}>
                            {creating ? 'Скрыть форму' : 'Новая кампания'}
                        </Button>
                    </div>
                }
            />

            {creating ? <CreateForm {...props} /> : null}

            {campaigns.data.length > 0 ? (
                <Table headers={['Кампания', 'Статус', 'Получатели', 'Отправлено', 'Открыли КП', 'Демо', 'Заявки', '']}>
                    {campaigns.data.map((c) => (
                        <tr key={c.id}>
                            <td>
                                <Link href={`/admin/campaigns/${c.id}`} className="link">
                                    <b>{c.name}</b>
                                </Link>
                                <div className="text-xs text-muted">
                                    {c.channels.map((ch) => channels[ch] ?? ch).join(', ')} · {c.template ?? 'шаблон удалён'} · {c.created_at}
                                </div>
                            </td>
                            <td>
                                <Badge tone={CAMPAIGN_TONE[c.status]}>{statuses[c.status] ?? c.status}</Badge>
                            </td>
                            <td>{c.funnel.total - c.funnel.skipped}</td>
                            <td>{c.funnel.sent}</td>
                            <td>{c.funnel.clicked}</td>
                            <td>{c.funnel.demo_opened}</td>
                            <td>{c.funnel.replied}</td>
                            <td>
                                <LinkButton href={`/admin/campaigns/${c.id}`} size="sm" variant="outline">
                                    Открыть
                                </LinkButton>
                            </td>
                        </tr>
                    ))}
                </Table>
            ) : null}
            <PagerSafe page={campaigns} />
        </div>
    );
}

function CreateForm({ templates, cities, channels, auto_channels, has_options, drafts }: Props) {
    const form = useForm({
        name: '',
        template_id: templates[0]?.id ?? '',
        channels: ['email', 'sms'] as string[],
        filters: { city_id: '' as number | '', rating_min: '', has: [] as string[], not_offered: true, ids: [] as number[] },
    });
    const estimate = useHttp<EstimateForm, { count: number; sample: { id: number; name: string; city: string | null }[] }>({ filters: {} });
    const [manual, setManual] = useState(false);
    const [query, setQuery] = useState('');
    const err = form.errors as Record<string, string | undefined>;
    const f = form.data.filters;
    const setFilter = <K extends keyof typeof f>(key: K, value: (typeof f)[K]) => form.setData('filters', { ...f, [key]: value });
    const payloadFilters = useMemo(
        () => (manual ? { ids: f.ids } : { city_id: f.city_id || null, rating_min: f.rating_min || null, has: f.has, not_offered: f.not_offered }),
        [manual, f],
    );
    const filtersKey = JSON.stringify(payloadFilters);

    useEffect(() => {
        const timer = setTimeout(() => {
            estimate.transform(() => ({ filters: payloadFilters }));
            void estimate.post('/admin/campaigns/estimate').catch(() => undefined);
        }, 300);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtersKey]);

    const toggle = (list: string[], value: string, on: boolean) => (on ? [...list, value] : list.filter((v) => v !== value));
    const visibleDrafts = drafts.filter((d) => d.name.toLowerCase().includes(query.trim().toLowerCase()));
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, filters: payloadFilters }));
        form.post('/admin/campaigns');
    };
    const count = estimate.response?.count;

    return (
        <Panel title="Новая кампания">
            <form className="stack" onSubmit={submit}>
                {templates.length === 0 ? (
                    <Alert tone="warning">
                        Нет активных шаблонов.{' '}
                        <Link href="/admin/offers/templates/create" className="link">
                            Создайте шаблон
                        </Link>
                        , чтобы запустить кампанию.
                    </Alert>
                ) : null}
                <div className="offers-form-grid">
                    <TextField label="Название" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={err.name} placeholder="Например: Краснодар, октябрь" required />
                    <SelectField label="Шаблон" value={form.data.template_id} onChange={(e) => form.setData('template_id', Number(e.target.value))} error={err.template_id}>
                        {templates.map((t) => (
                            <option key={t.id} value={t.id}>
                                {t.name}
                            </option>
                        ))}
                    </SelectField>
                </div>

                <fieldset className="offers-sections">
                    <legend className="field__label">Каналы</legend>
                    <div className="offers-sections__grid">
                        {Object.entries(channels).map(([key, label]) => (
                            <Check
                                key={key}
                                label={
                                    <>
                                        {label} <span className="text-xs text-muted">{auto_channels.includes(key) ? 'автоматически' : 'вручную'}</span>
                                    </>
                                }
                                checked={form.data.channels.includes(key)}
                                onChange={(e) => form.setData('channels', toggle(form.data.channels, key, e.target.checked))}
                            />
                        ))}
                    </div>
                    {err.channels ? <p className="field__error">{err.channels}</p> : null}
                </fieldset>

                <div className="row row--wrap offers-mode">
                    <Check type="radio" name="mode" label="По фильтрам" checked={!manual} onChange={() => setManual(false)} />
                    <Check type="radio" name="mode" label="Выбрать вручную" checked={manual} onChange={() => setManual(true)} />
                </div>

                {!manual ? (
                    <div className="stack">
                        <div className="offers-form-grid">
                            <SelectField label="Город" value={f.city_id} onChange={(e) => setFilter('city_id', e.target.value === '' ? '' : Number(e.target.value))}>
                                <option value="">Все города</option>
                                {cities.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </SelectField>
                            <SelectField label="Рейтинг на Яндексе от" value={f.rating_min} onChange={(e) => setFilter('rating_min', e.target.value)}>
                                <option value="">Любой</option>
                                {['3.5', '4', '4.5', '4.8'].map((r) => (
                                    <option key={r} value={r}>
                                        {r.replace('.', ',')}
                                    </option>
                                ))}
                            </SelectField>
                        </div>
                        <fieldset className="offers-sections">
                            <legend className="field__label">Есть контакт</legend>
                            <div className="offers-sections__grid">
                                {Object.entries(has_options).map(([key, label]) => (
                                    <Check key={key} label={label} checked={f.has.includes(key)} onChange={(e) => setFilter('has', toggle(f.has, key, e.target.checked))} />
                                ))}
                            </div>
                        </fieldset>
                        <Check label="Только те, кому КП ещё не отправляли" checked={f.not_offered} onChange={(e) => setFilter('not_offered', e.target.checked)} />
                    </div>
                ) : (
                    <div className="stack">
                        <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти черновик" />
                        <ul className="offers-pick">
                            {visibleDrafts.map((d) => (
                                <li key={d.id}>
                                    <Check
                                        checked={f.ids.includes(d.id)}
                                        onChange={(e) => setFilter('ids', e.target.checked ? [...f.ids, d.id] : f.ids.filter((id) => id !== d.id))}
                                        label={
                                            <span className="offers-pick__label">
                                                <b>{d.name}</b>
                                                <span className="text-xs text-muted">
                                                    {d.city ?? '—'}
                                                    {d.rating ? ` · ★ ${d.rating}` : ''}
                                                    {d.contacts.length ? ` · ${d.contacts.map((c) => has_options[c] ?? c).join(', ')}` : ' · нет контактов'}
                                                </span>
                                            </span>
                                        }
                                    />
                                </li>
                            ))}
                            {visibleDrafts.length === 0 ? <li className="text-sm text-muted">Черновиков не найдено.</li> : null}
                        </ul>
                        <p className="text-xs text-muted">Показаны последние 100 черновиков. Выбрано: {f.ids.length}.</p>
                    </div>
                )}

                <div className="offers-estimate">
                    {count === undefined ? (
                        <span className="text-sm text-muted">Считаем организации…</span>
                    ) : (
                        <span className="text-sm">
                            Под условия попадает <b>{count}</b> {count === 1 ? 'черновик' : 'черновиков'}
                            {estimate.response?.sample.length ? `: ${estimate.response.sample.map((s) => s.name).join(', ')}${count > estimate.response.sample.length ? '…' : ''}` : ''}
                        </span>
                    )}
                </div>
                <p className="text-xs text-muted">
                    Для каждой организации сформируется КП с демо-ссылкой. Контакты из стоп-листа, получавшие КП недавно и повторяющиеся в сети филиалов пропускаются — причина будет видна
                    в списке получателей. Отправка начнётся после нажатия «Запустить» на странице кампании.
                </p>
                <div>
                    <Button type="submit" loading={form.processing} disabled={templates.length === 0 || form.data.channels.length === 0 || count === 0}>
                        Сформировать получателей
                    </Button>
                </div>
            </form>
        </Panel>
    );
}
