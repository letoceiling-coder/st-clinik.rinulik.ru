import { Link, router } from '@inertiajs/react';
import CopyButton from '@/components/CopyButton';
import { FilterBar, Kpis, PageHead, PagerSafe, Panel, Table } from '@/components/Dash';
import { AnchorButton, Button, LinkButton } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Fields';
import { Alert, Badge } from '@/components/ui/Misc';
import type { Paginated } from '@/lib/types';
import { CAMPAIGN_TONE, type Funnel } from './Campaigns';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | undefined;

interface Recipient {
    id: number;
    clinic: { id: number; name: string | null; city: string | null };
    offer_id: number | null;
    channel: string;
    manual: boolean;
    contact: string;
    status: string;
    error: string | null;
    attempts: number;
    sent_at: string | null;
    sent_by: string | null;
    text: string | null;
    link: string | null;
}

interface Props {
    campaign: {
        id: number;
        name: string;
        template: { id: number; name: string } | null;
        channels: string[];
        filters: string[];
        status: string;
        started_at: string | null;
        completed_at: string | null;
        by: string | null;
        funnel: Funnel;
        by_channel: Record<string, Funnel>;
    };
    recipients: Paginated<Recipient>;
    channels: Record<string, string>;
    auto_channels: string[];
    statuses: Record<string, string>;
    recipient_statuses: Record<string, string>;
    funnel_labels: Record<string, string>;
    filters: { channel?: string; status?: string };
}

const RECIPIENT_TONE: Record<string, Tone> = {
    queued: 'info',
    sent: 'primary',
    delivered: 'primary',
    opened: 'primary',
    clicked: 'warning',
    demo_opened: 'warning',
    replied: 'success',
    connected: 'success',
    failed: 'danger',
    skipped: undefined,
    unsubscribed: undefined,
};

const STAGES: (keyof Funnel)[] = ['sent', 'opened', 'clicked', 'demo_opened', 'replied', 'connected'];

const percent = (part: number, total: number) => (total > 0 ? `${Math.round((part / total) * 100)}%` : '—');

export default function AdminCampaign({ campaign, recipients, channels, auto_channels, statuses, recipient_statuses, funnel_labels, filters }: Props) {
    const f = campaign.funnel;
    const active = f.total - f.skipped;
    const post = (action: string) => router.post(`/admin/campaigns/${campaign.id}/${action}`, {}, { preserveScroll: true });
    const hasAuto = campaign.channels.some((c) => auto_channels.includes(c));

    return (
        <div className="stack-lg">
            <PageHead
                title={campaign.name}
                text={
                    <span className="row row--wrap offers-meta">
                        <Badge tone={CAMPAIGN_TONE[campaign.status]}>{statuses[campaign.status] ?? campaign.status}</Badge>
                        <span className="text-sm text-muted">
                            {campaign.template?.name ?? 'шаблон удалён'} · {campaign.channels.map((c) => channels[c] ?? c).join(', ')}
                            {campaign.started_at ? ` · запущена ${campaign.started_at}` : ''}
                            {campaign.completed_at ? ` · завершена ${campaign.completed_at}` : ''}
                        </span>
                    </span>
                }
                action={
                    <div className="row row--wrap offers-head-actions">
                        <LinkButton href="/admin/campaigns" variant="ghost">
                            Все кампании
                        </LinkButton>
                        <AnchorButton href={`/admin/campaigns/${campaign.id}/export`} variant="outline" icon="file">
                            Экспорт CSV
                        </AnchorButton>
                        {campaign.status !== 'completed' ? (
                            <Button variant="outline" icon="refresh" onClick={() => post('rebuild')}>
                                Добрать получателей
                            </Button>
                        ) : null}
                        {campaign.status === 'running' ? (
                            <Button variant="outline" onClick={() => post('pause')}>
                                Пауза
                            </Button>
                        ) : campaign.status !== 'completed' ? (
                            <Button icon="send" onClick={() => post('start')} disabled={f.queued === 0}>
                                Запустить
                            </Button>
                        ) : null}
                    </div>
                }
            />

            {campaign.status === 'draft' && hasAuto ? (
                <Alert tone="muted" icon="info">
                    Проверьте получателей и нажмите «Запустить» — email и SMS уйдут в рабочее время с учётом дневных лимитов. Ручные каналы можно отрабатывать сразу.
                </Alert>
            ) : null}
            {campaign.filters.length ? <p className="text-sm text-muted">Отбор: {campaign.filters.join(' · ')}</p> : null}

            <Kpis
                items={[
                    { label: 'Получателей', value: active, hint: `${f.skipped} пропущено` },
                    { label: 'В очереди', value: f.queued },
                    { label: 'Отправлено', value: f.sent, hint: f.failed ? `${f.failed} с ошибкой` : undefined },
                    { label: 'Перешли на КП', value: f.clicked, hint: percent(f.clicked, f.sent) },
                    { label: 'Оставили заявку', value: f.replied, hint: percent(f.replied, f.sent) },
                    { label: 'Отписались', value: f.unsubscribed },
                ]}
            />

            <Panel title="Воронка по каналам">
                <Table headers={['Канал', ...STAGES.map((s) => funnel_labels[s] ?? s)]}>
                    {Object.entries(campaign.by_channel).map(([channel, row]) => (
                        <tr key={channel}>
                            <td>
                                <b>{channels[channel] ?? channel}</b>
                                <div className="text-xs text-muted">{auto_channels.includes(channel) ? 'автоматически' : 'вручную'}</div>
                            </td>
                            {STAGES.map((s) => (
                                <td key={s}>
                                    {row[s]} {s !== 'sent' ? <span className="text-xs text-muted">{percent(row[s], row.sent)}</span> : null}
                                </td>
                            ))}
                        </tr>
                    ))}
                </Table>
                <p className="text-xs text-muted">«Открыто» считается только для писем (по картинке-пикселю — часть почтовых программ её блокирует).</p>
            </Panel>

            <FilterBar action={`/admin/campaigns/${campaign.id}`}>
                <SelectField name="channel" defaultValue={filters.channel ?? ''} aria-label="Канал">
                    <option value="">Все каналы</option>
                    {campaign.channels.map((c) => (
                        <option key={c} value={c}>
                            {channels[c] ?? c}
                        </option>
                    ))}
                </SelectField>
                <SelectField name="status" defaultValue={filters.status ?? ''} aria-label="Статус">
                    <option value="">Все статусы</option>
                    {Object.entries(recipient_statuses).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </SelectField>
            </FilterBar>

            {recipients.data.length === 0 ? (
                <Panel>
                    <p className="text-muted">Получателей с такими условиями нет.</p>
                </Panel>
            ) : (
                <ul className="offers-list">
                    {recipients.data.map((r) => (
                        <RecipientItem key={r.id} recipient={r} channels={channels} statuses={recipient_statuses} />
                    ))}
                </ul>
            )}
            <PagerSafe page={recipients} />
        </div>
    );
}

function RecipientItem({ recipient: r, channels, statuses }: { recipient: Recipient; channels: Record<string, string>; statuses: Record<string, string> }) {
    const mark = (status: string) => router.post(`/admin/campaigns/recipients/${r.id}/mark`, { status }, { preserveScroll: true });
    const contactHref = r.channel === 'phone' ? `tel:${r.contact}` : r.channel === 'whatsapp' ? `https://wa.me/${r.contact.replace(/\D/g, '')}` : /^https?:\/\//.test(r.contact) ? r.contact : null;
    const open = !['skipped', 'unsubscribed', 'failed', 'connected'].includes(r.status);

    return (
        <li className={`offers-item card${r.status === 'queued' && r.manual ? ' is-active' : ''}`}>
            <div className="offers-item__main stack">
                <div className="offers-item__title">
                    <b>{r.clinic.name}</b>
                    <Badge tone={RECIPIENT_TONE[r.status]}>{statuses[r.status] ?? r.status}</Badge>
                    <span className="text-sm text-muted">{channels[r.channel] ?? r.channel}</span>
                </div>
                <p className="text-sm">
                    {r.contact ? (
                        contactHref ? (
                            <a href={contactHref} className="link" target="_blank" rel="noopener">
                                {r.contact}
                            </a>
                        ) : (
                            <code>{r.contact}</code>
                        )
                    ) : (
                        <span className="text-muted">контакта нет</span>
                    )}
                    {r.clinic.city ? <span className="text-muted"> · {r.clinic.city}</span> : null}
                    {r.offer_id ? (
                        <>
                            {' · '}
                            <Link href={`/admin/offers/${r.offer_id}`} className="link">
                                КП
                            </Link>
                        </>
                    ) : null}
                </p>
                {r.error ? <p className={`text-xs ${r.status === 'failed' ? 'offers-warn' : 'text-muted'}`}>{r.error}</p> : null}
                {r.sent_at ? (
                    <p className="text-xs text-muted">
                        Отправлено {r.sent_at}
                        {r.sent_by ? ` · ${r.sent_by}` : ''}
                    </p>
                ) : null}
                {r.manual && r.text && open ? (
                    <details className="offers-details" open={r.status === 'queued'}>
                        <summary>{r.channel === 'phone' ? 'Скрипт звонка' : 'Текст сообщения'}</summary>
                        <pre className="offers-plain">{r.text}</pre>
                        <div className="row row--wrap offers-head-actions">
                            <CopyButton value={r.text} label="Копировать текст" />
                            {r.link ? <CopyButton value={r.link} label="Копировать ссылку" /> : null}
                        </div>
                    </details>
                ) : null}
            </div>
            <div className="offers-item__side offers-item__buttons">
                {r.manual && r.status === 'queued' ? (
                    <>
                        <Button size="sm" icon="check" onClick={() => mark('sent')}>
                            {r.channel === 'phone' ? 'Позвонил' : 'Отправил'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => mark('skipped')}>
                            Пропустить
                        </Button>
                    </>
                ) : null}
                {r.status === 'failed' ? (
                    <Button size="sm" variant="outline" icon="refresh" onClick={() => router.post(`/admin/campaigns/recipients/${r.id}/retry`, {}, { preserveScroll: true })}>
                        Повторить
                    </Button>
                ) : null}
                {open && r.status !== 'queued' ? (
                    <>
                        {r.status !== 'replied' ? (
                            <Button size="sm" variant="outline" onClick={() => mark('replied')}>
                                Ответили
                            </Button>
                        ) : null}
                        <Button size="sm" variant="outline" onClick={() => mark('connected')}>
                            Подключились
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => mark('unsubscribed')}>
                            Отказ, не писать
                        </Button>
                    </>
                ) : null}
            </div>
        </li>
    );
}
