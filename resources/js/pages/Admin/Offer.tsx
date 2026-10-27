import { Link, router, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import CopyButton, { CopyLink } from '@/components/CopyButton';
import { PageHead, Panel, Table } from '@/components/Dash';
import { AnchorButton, Button, LinkButton } from '@/components/ui/Button';
import { Check, TextArea, TextField } from '@/components/ui/Fields';
import { Alert, Badge, Tabs } from '@/components/ui/Misc';
import { ApplicationsTab, OFFER_TONE, SectionPicker, type ApplicationRow, type OfferRow } from './Offers';

type Channel = 'web' | 'email' | 'sms' | 'messenger' | 'call';

interface Snapshot {
    web_title: string;
    web_html: string;
    email_subject: string;
    email_html: string;
    email_text: string;
    sms: string;
    messenger: string;
    call_script: string | null;
}

interface Content {
    web_title: string;
    web_body: string;
    email_subject: string;
    email_body: string;
    sms_text: string;
    messenger_text: string;
    call_script: string | null;
}

interface DemoLinkRow {
    id: number;
    url: string;
    state: string | null;
    expires_at: string | null;
    max_opens: number | null;
    max_devices: number | null;
    opens_count: number;
    devices_count: number;
    sections: string[];
    show_tariffs: boolean;
    notify_manager: boolean;
    revoke_on_connect: boolean;
    revoke_reason: string | null;
    last_opened_at: string | null;
    visits: { id: number; started_at: string | null; duration: number; ip: string | null; device: string | null; sections: string[]; pages: number }[];
}

interface Props {
    offer: OfferRow & {
        url: string;
        short_url: string;
        snapshot: Snapshot;
        sms_segments: number;
        template: { id: number; name: string | null; version: number; content: Content } | null;
        first_viewed_at: string | null;
        last_viewed_at: string | null;
    };
    demo_links: DemoLinkRow[];
    applications: ApplicationRow[];
    recipients: { id: number; campaign: { id: number; name: string } | null; channel: string; contact: string; status: string; error: string | null; sent_at: string | null }[];
    sections: Record<string, string>;
    offer_statuses: Record<string, string>;
    application_statuses: Record<string, string>;
    recipient_statuses: Record<string, string>;
    channels: Record<string, string>;
}

const duration = (sec: number) => (sec < 60 ? `${sec} с` : `${Math.round(sec / 60)} мин`);

export default function AdminOffer(props: Props) {
    const { offer, demo_links, applications, recipients, offer_statuses, application_statuses, recipient_statuses, channels } = props;
    const revoke = () => {
        if (window.confirm('Отозвать КП? Страница предложения и демо-кабинет перестанут открываться.')) {
            router.post(`/admin/offers/${offer.id}/revoke`, {}, { preserveScroll: true });
        }
    };
    const connect = () => {
        if (window.confirm('Отметить клинику подключённой? Демо-ссылки закроются, демо-заявки и записи удалятся.')) {
            router.post(`/admin/offers/${offer.id}/connect`, {}, { preserveScroll: true });
        }
    };

    return (
        <div className="stack-lg">
            <PageHead
                title={`КП: ${offer.clinic.name}`}
                text={
                    <span className="row row--wrap offers-meta">
                        <Badge tone={OFFER_TONE[offer.status]}>{offer_statuses[offer.status] ?? offer.status}</Badge>
                        <span className="text-sm text-muted">
                            {offer.clinic.city ?? 'город не указан'} · создано {offer.created_at} · действует {offer.available ? `до ${offer.expires_at ?? '—'}` : 'нет'}
                        </span>
                    </span>
                }
                action={
                    <div className="row row--wrap offers-head-actions">
                        <LinkButton href="/admin/offers" variant="ghost">
                            Все КП
                        </LinkButton>
                        {offer.status !== 'connected' && offer.status !== 'revoked' ? (
                            <Button variant="outline" icon="check" onClick={connect}>
                                Клиника подключилась
                            </Button>
                        ) : null}
                        {offer.available ? (
                            <Button variant="danger" onClick={revoke}>
                                Отозвать
                            </Button>
                        ) : null}
                    </div>
                }
            />

            <Panel title="Ссылки">
                <div className="stack">
                    <CopyLink label="Страница КП" value={offer.url} />
                    <CopyLink label="Короткая ссылка (SMS, мессенджеры)" value={offer.short_url} />
                    <p className="text-xs text-muted">
                        Просмотров: {offer.views}
                        {offer.first_viewed_at ? ` · первый ${offer.first_viewed_at}` : ''}
                        {offer.last_viewed_at ? ` · последний ${offer.last_viewed_at}` : ''}
                        {' · '}
                        <Link href={`/admin/clinics/${offer.clinic.id}`} className="link">
                            Черновик клиники
                        </Link>
                    </p>
                    {offer.available ? (
                        <div>
                            <AnchorButton href={offer.url} target="_blank" rel="noopener" variant="outline" size="sm" icon="external">
                                Открыть как клиника
                            </AnchorButton>
                        </div>
                    ) : null}
                </div>
            </Panel>

            <ContentPanel offer={offer} />

            <Panel
                title="Демо-кабинет"
                action={
                    offer.available ? (
                        <Button size="sm" variant="outline" icon="refresh" onClick={() => router.post(`/admin/offers/${offer.id}/demo`, {}, { preserveScroll: true })}>
                            Новая ссылка
                        </Button>
                    ) : null
                }
            >
                {demo_links.length === 0 ? <p className="text-muted">Демо-ссылки нет.</p> : <div className="stack-lg">{demo_links.map((l) => <DemoLinkItem key={l.id} link={l} sections={props.sections} />)}</div>}
            </Panel>

            <Panel title="Заявки на подключение">
                <ApplicationsTab applications={{ data: applications }} statuses={application_statuses} />
            </Panel>

            {recipients.length > 0 ? (
                <Panel title="Отправки в кампаниях">
                    <Table headers={['Кампания', 'Канал', 'Контакт', 'Статус', 'Отправлено']}>
                        {recipients.map((r) => (
                            <tr key={r.id}>
                                <td>
                                    {r.campaign ? (
                                        <Link href={`/admin/campaigns/${r.campaign.id}`} className="link">
                                            {r.campaign.name}
                                        </Link>
                                    ) : (
                                        '—'
                                    )}
                                </td>
                                <td>{channels[r.channel] ?? r.channel}</td>
                                <td>
                                    <code>{r.contact || '—'}</code>
                                </td>
                                <td>
                                    {recipient_statuses[r.status] ?? r.status}
                                    {r.error ? <div className="text-xs text-muted">{r.error}</div> : null}
                                </td>
                                <td>{r.sent_at ?? '—'}</td>
                            </tr>
                        ))}
                    </Table>
                </Panel>
            ) : null}
        </div>
    );
}

function ContentPanel({ offer }: { offer: Props['offer'] }) {
    const [channel, setChannel] = useState<Channel>('web');
    const [editing, setEditing] = useState(false);
    const s = offer.snapshot;
    const plain: Record<Exclude<Channel, 'web' | 'email'>, string> = { sms: s.sms, messenger: s.messenger, call: s.call_script ?? '' };

    return (
        <Panel
            title={offer.is_customized ? 'Текст КП (изменён для этой клиники)' : `Текст КП${offer.template ? ` · ${offer.template.name}, v${offer.template.version}` : ''}`}
            action={
                offer.available && offer.template ? (
                    <Button size="sm" variant="outline" icon="edit" onClick={() => setEditing((v) => !v)}>
                        {editing ? 'Закрыть правку' : 'Изменить для этой клиники'}
                    </Button>
                ) : null
            }
        >
            {editing && offer.template ? (
                <CustomizeForm offer={offer} content={offer.template.content} onDone={() => setEditing(false)} />
            ) : (
                <div className="stack">
                    <Tabs<Channel>
                        label="Каналы"
                        value={channel}
                        onChange={setChannel}
                        items={[
                            { key: 'web', label: 'Страница' },
                            { key: 'email', label: 'Email' },
                            { key: 'sms', label: 'SMS' },
                            { key: 'messenger', label: 'Мессенджеры' },
                            { key: 'call', label: 'Звонок' },
                        ]}
                    />
                    {channel === 'web' ? (
                        <div className="offers-preview">
                            <h3>{s.web_title}</h3>
                            <div className="offers-preview__body" dangerouslySetInnerHTML={{ __html: s.web_html }} />
                        </div>
                    ) : channel === 'email' ? (
                        <div className="offers-preview">
                            <p className="text-sm">
                                <span className="text-muted">Тема:</span> <b>{s.email_subject}</b>
                            </p>
                            <div className="offers-preview__body" dangerouslySetInnerHTML={{ __html: s.email_html.replaceAll('{unsubscribe_link}', '<i>персональная ссылка отписки</i>') }} />
                        </div>
                    ) : (
                        <div className="stack">
                            <pre className="offers-plain">{plain[channel] || 'Текст не задан.'}</pre>
                            {channel === 'sms' ? (
                                <p className={`text-xs ${offer.sms_segments > 2 ? 'offers-warn' : 'text-muted'}`}>
                                    {s.sms.length} знаков · {offer.sms_segments} SMS
                                </p>
                            ) : null}
                            {plain[channel] ? (
                                <div>
                                    <CopyButton value={plain[channel]} label="Копировать текст" />
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            )}
        </Panel>
    );
}

function CustomizeForm({ offer, content, onDone }: { offer: Props['offer']; content: Content; onDone: () => void }) {
    const form = useForm<Content>({ ...content, call_script: content.call_script ?? '' });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.put(`/admin/offers/${offer.id}/content`, { preserveScroll: true, onSuccess: onDone });
    };

    return (
        <form className="stack" onSubmit={submit}>
            <Alert tone="muted" icon="info">
                Правка касается только этой клиники и пересобирает текст с переменными. Шаблон не меняется.
            </Alert>
            <TextField label="Заголовок страницы" value={form.data.web_title} onChange={(e) => form.setData('web_title', e.target.value)} error={form.errors.web_title} />
            <TextArea label="Текст страницы" rows={8} maxLength={20000} value={form.data.web_body} onChange={(e) => form.setData('web_body', e.target.value)} error={form.errors.web_body} />
            <TextField label="Тема письма" value={form.data.email_subject} onChange={(e) => form.setData('email_subject', e.target.value)} error={form.errors.email_subject} />
            <TextArea label="Текст письма" rows={6} value={form.data.email_body} onChange={(e) => form.setData('email_body', e.target.value)} error={form.errors.email_body} />
            <TextArea label="SMS" rows={2} value={form.data.sms_text} onChange={(e) => form.setData('sms_text', e.target.value)} error={form.errors.sms_text} />
            <TextArea label="Мессенджеры" rows={4} value={form.data.messenger_text} onChange={(e) => form.setData('messenger_text', e.target.value)} error={form.errors.messenger_text} />
            <TextArea label="Скрипт звонка" rows={4} maxLength={4000} value={form.data.call_script ?? ''} onChange={(e) => form.setData('call_script', e.target.value)} error={form.errors.call_script} />
            <div className="row offers-save">
                <Button type="submit" loading={form.processing}>
                    Сохранить для этой клиники
                </Button>
                <Button variant="ghost" onClick={onDone}>
                    Отмена
                </Button>
            </div>
        </form>
    );
}

function DemoLinkItem({ link, sections }: { link: DemoLinkRow; sections: Record<string, string> }) {
    const form = useForm({
        expires_at: link.expires_at ?? '',
        max_opens: link.max_opens ?? ('' as number | ''),
        max_devices: link.max_devices ?? ('' as number | ''),
        sections: link.sections,
        show_tariffs: link.show_tariffs,
        notify_manager: link.notify_manager,
        revoke_on_connect: link.revoke_on_connect,
    });
    const err = form.errors as Record<string, string | undefined>;
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, expires_at: d.expires_at || null, max_opens: d.max_opens === '' ? null : d.max_opens, max_devices: d.max_devices === '' ? null : d.max_devices }));
        form.put(`/admin/offers/demo-links/${link.id}`, { preserveScroll: true });
    };
    const revoke = () => {
        if (window.confirm('Отозвать демо-ссылку? Открытые сессии закроются при следующем переходе.')) {
            router.post(`/admin/offers/demo-links/${link.id}/revoke`, {}, { preserveScroll: true });
        }
    };

    return (
        <div className={`offers-demo${link.state ? ' is-closed' : ''}`}>
            <div className="offers-demo__head">
                <div className="row row--wrap offers-meta">
                    <b>Ссылка #{link.id}</b>
                    {link.state ? <Badge>{link.revoke_reason ?? link.state}</Badge> : <Badge tone="success">действует</Badge>}
                    <span className="text-sm text-muted">
                        открытий {link.opens_count}
                        {link.max_opens ? ` из ${link.max_opens}` : ''} · устройств {link.devices_count}
                        {link.max_devices ? ` из ${link.max_devices}` : ''}
                        {link.last_opened_at ? ` · последнее ${link.last_opened_at}` : ''}
                    </span>
                </div>
                {!link.state ? (
                    <Button size="sm" variant="ghost" onClick={revoke}>
                        Отозвать
                    </Button>
                ) : null}
            </div>
            {!link.state ? <CopyLink label="Прямая ссылка на демо" value={link.url} /> : null}

            {!link.state ? (
                <details className="offers-details">
                    <summary>Ограничения ссылки</summary>
                    <form className="stack" onSubmit={submit}>
                        <div className="offers-form-grid">
                            <TextField label="Действует до" type="date" value={form.data.expires_at} onChange={(e) => form.setData('expires_at', e.target.value)} error={err.expires_at} hint="Пусто — бессрочно" />
                            <TextField label="Максимум открытий" type="number" min={1} value={form.data.max_opens} onChange={(e) => form.setData('max_opens', e.target.value === '' ? '' : Number(e.target.value))} error={err.max_opens} />
                            <TextField label="Максимум устройств" type="number" min={1} value={form.data.max_devices} onChange={(e) => form.setData('max_devices', e.target.value === '' ? '' : Number(e.target.value))} error={err.max_devices} />
                        </div>
                        <SectionPicker sections={sections} value={form.data.sections} onChange={(v) => form.setData('sections', v)} error={err.sections} />
                        <div className="offers-checks">
                            <Check label="Показывать тарифы" checked={form.data.show_tariffs} onChange={(e) => form.setData('show_tariffs', e.target.checked)} />
                            <Check label="Сообщать менеджеру об открытии" checked={form.data.notify_manager} onChange={(e) => form.setData('notify_manager', e.target.checked)} />
                            <Check label="Закрыть после подключения" checked={form.data.revoke_on_connect} onChange={(e) => form.setData('revoke_on_connect', e.target.checked)} />
                        </div>
                        <div>
                            <Button type="submit" size="sm" loading={form.processing} disabled={!form.isDirty}>
                                Сохранить ограничения
                            </Button>
                        </div>
                    </form>
                </details>
            ) : null}

            {link.visits.length > 0 ? (
                <Table headers={['Начало', 'Длительность', 'Устройство', 'IP', 'Разделы']}>
                    {link.visits.map((v) => (
                        <tr key={v.id}>
                            <td>{v.started_at}</td>
                            <td>
                                {duration(v.duration)} <span className="text-xs text-muted">· {v.pages} стр.</span>
                            </td>
                            <td>{v.device}</td>
                            <td>
                                <code>{v.ip}</code>
                            </td>
                            <td className="text-sm">{v.sections.join(', ') || '—'}</td>
                        </tr>
                    ))}
                </Table>
            ) : (
                <p className="text-sm text-muted">Демо-кабинет по этой ссылке ещё не открывали.</p>
            )}
        </div>
    );
}
