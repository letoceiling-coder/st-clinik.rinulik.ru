import { Link, router, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import { PageHead, Panel, PagerSafe, Table } from '@/components/Dash';
import { Button, LinkButton } from '@/components/ui/Button';
import { Check, SelectField, TextArea, TextField } from '@/components/ui/Fields';
import { Alert, Badge } from '@/components/ui/Misc';
import type { Paginated } from '@/lib/types';

interface Broadcast {
    id: number;
    sender_type: string;
    clinic_name: string | null;
    moderation_status: string | null;
    moderation_note: string | null;
    name: string;
    body: string;
    button_label: string | null;
    button_url: string | null;
    channels: string[];
    filters: { city_id?: number; roles?: string[]; active_within_days?: number };
    status: string;
    scheduled_at: string | null;
    recipients_total: number;
    sent_count: number;
    failed_count: number;
    click_count: number;
    is_editable: boolean;
    created_at: string | null;
}

interface RecipientRow {
    id: number;
    user: string | null;
    channel: string;
    status: string;
    error: string | null;
    sent_at: string | null;
    clicked_at: string | null;
}

interface Props {
    broadcast: Broadcast;
    by_channel: Record<string, { total: number; sent: number; failed: number; clicks: number }>;
    estimate: { count: number; sample: { id: number; name: string; email: string | null }[] };
    channels: Record<string, string>;
    statuses: Record<string, string>;
    cities: { id: number; name: string }[];
    roles: Record<string, string>;
    recipients: Paginated<RecipientRow>;
}

export default function BroadcastShow(props: Props) {
    const { broadcast, by_channel, estimate, channels, statuses, cities, roles, recipients } = props;
    const [preview, setPreview] = useState<{ subject: string; plain: string } | null>(null);
    const scheduleForm = useForm({ scheduled_at: broadcast.scheduled_at ?? '' });

    const form = useForm({
        name: broadcast.name,
        body: broadcast.body,
        button_label: broadcast.button_label ?? '',
        button_url: broadcast.button_url ?? '',
        channels: broadcast.channels,
        filters: {
            city_id: broadcast.filters.city_id ?? ('' as number | ''),
            roles: broadcast.filters.roles ?? ['user'],
            active_within_days: broadcast.filters.active_within_days ? String(broadcast.filters.active_within_days) : '',
        },
    });

    const post = (url: string) => router.post(url, {}, { preserveScroll: true });

    const save = (e: FormEvent) => {
        e.preventDefault();
        form.put(`/admin/broadcasts/${broadcast.id}`);
    };

    const loadPreview = async () => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        const res = await fetch(`/admin/broadcasts/${broadcast.id}/preview`, {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': token ?? '', Accept: 'application/json' },
        });
        if (res.ok) {
            setPreview(await res.json());
        }
    };

    return (
        <div className="stack-lg">
            <PageHead
                title={broadcast.name}
                text={`Создана ${broadcast.created_at ?? '—'}. Оценка аудитории: ~${estimate.count} пользователей.`}
                action={
                    <LinkButton href="/admin/broadcasts" variant="ghost">
                        К списку
                    </LinkButton>
                }
            />

            {broadcast.sender_type === 'clinic' ? (
                <Alert tone="info">
                    Рассылка клиники {broadcast.clinic_name ?? ''}. Модерация: {broadcast.moderation_status ?? '—'}
                    {broadcast.moderation_note ? ` · ${broadcast.moderation_note}` : ''}
                </Alert>
            ) : null}

            {broadcast.sender_type === 'clinic' && broadcast.moderation_status === 'pending' ? (
                <div className="row row--wrap">
                    <Button size="sm" onClick={() => router.post(`/admin/broadcasts/${broadcast.id}/moderate`, { decision: 'approve' })}>
                        Одобрить
                    </Button>
                    <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                            const note = window.prompt('Причина отклонения для клиники');
                            if (note) {
                                router.post(`/admin/broadcasts/${broadcast.id}/moderate`, { decision: 'reject', note });
                            }
                        }}
                    >
                        Отклонить
                    </Button>
                </div>
            ) : null}

            <div className="row row--wrap">
                <Badge tone={broadcast.status === 'running' ? 'primary' : undefined}>{statuses[broadcast.status] ?? broadcast.status}</Badge>
                <span className="text-sm text-muted">
                    Отправлено {broadcast.sent_count} · ошибок {broadcast.failed_count} · переходов {broadcast.click_count}
                </span>
            </div>

            <div className="row row--wrap">
                <Button size="sm" variant="ghost" onClick={() => post(`/admin/broadcasts/${broadcast.id}/test`)}>
                    Тест себе
                </Button>
                <Button size="sm" variant="ghost" onClick={loadPreview}>
                    Предпросмотр
                </Button>
                <Button size="sm" variant="ghost" onClick={() => post(`/admin/broadcasts/${broadcast.id}/build`)}>
                    Обновить список
                </Button>
                {broadcast.status === 'draft' || broadcast.status === 'scheduled' || broadcast.status === 'paused' ? (
                    <Button size="sm" onClick={() => post(`/admin/broadcasts/${broadcast.id}/start`)}>
                        Запустить
                    </Button>
                ) : null}
                {broadcast.status === 'running' ? (
                    <Button size="sm" variant="ghost" onClick={() => post(`/admin/broadcasts/${broadcast.id}/pause`)}>
                        Пауза
                    </Button>
                ) : null}
                {broadcast.status !== 'completed' && broadcast.status !== 'cancelled' ? (
                    <Button size="sm" variant="danger" onClick={() => post(`/admin/broadcasts/${broadcast.id}/cancel`)}>
                        Отменить
                    </Button>
                ) : null}
            </div>

            {broadcast.status === 'draft' ? (
                <Panel title="Отложенный запуск">
                    <form
                        className="row row--wrap"
                        onSubmit={(e) => {
                            e.preventDefault();
                            scheduleForm.post(`/admin/broadcasts/${broadcast.id}/schedule`);
                        }}
                    >
                        <TextField
                            label="Дата и время"
                            type="datetime-local"
                            value={scheduleForm.data.scheduled_at}
                            onChange={(e) => scheduleForm.setData('scheduled_at', e.target.value)}
                            error={scheduleForm.errors.scheduled_at}
                        />
                        <Button type="submit" size="sm" loading={scheduleForm.processing}>
                            Запланировать
                        </Button>
                    </form>
                </Panel>
            ) : null}

            {preview ? (
                <Alert tone="info">
                    <b>{preview.subject}</b>
                    <pre style={{ whiteSpace: 'pre-wrap', margin: '8px 0 0' }}>{preview.plain}</pre>
                </Alert>
            ) : null}

            {broadcast.is_editable ? (
                <Panel title="Содержание и аудитория">
                    <form className="stack" onSubmit={save}>
                        <TextField label="Название" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} />
                        <TextArea label="Текст" value={form.data.body} maxLength={8000} onChange={(e) => form.setData('body', e.target.value)} error={form.errors.body} rows={6} />
                        <div className="row row--wrap">
                            <TextField label="Подпись кнопки" value={form.data.button_label} onChange={(e) => form.setData('button_label', e.target.value)} />
                            <TextField label="Ссылка" value={form.data.button_url} onChange={(e) => form.setData('button_url', e.target.value)} />
                        </div>
                        <div className="row row--wrap">
                            {Object.entries(channels).map(([key, label]) => (
                                <Check
                                    key={key}
                                    label={label}
                                    checked={form.data.channels.includes(key)}
                                    onChange={() => {
                                        const set = new Set(form.data.channels);
                                        if (set.has(key)) {
                                            set.delete(key);
                                        } else {
                                            set.add(key);
                                        }
                                        form.setData('channels', [...set]);
                                    }}
                                />
                            ))}
                        </div>
                        <SelectField
                            label="Город"
                            value={String(form.data.filters.city_id)}
                            onChange={(e) => form.setData('filters', { ...form.data.filters, city_id: e.target.value ? Number(e.target.value) : '' })}
                        >
                            <option value="">Все</option>
                            {cities.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </SelectField>
                        <div className="row row--wrap">
                            {Object.entries(roles).map(([key, label]) => (
                                <Check
                                    key={key}
                                    label={label}
                                    checked={form.data.filters.roles.includes(key)}
                                    onChange={() => {
                                        const set = new Set(form.data.filters.roles);
                                        if (set.has(key)) {
                                            set.delete(key);
                                        } else {
                                            set.add(key);
                                        }
                                        form.setData('filters', { ...form.data.filters, roles: [...set] });
                                    }}
                                />
                            ))}
                        </div>
                        <Button type="submit" loading={form.processing}>
                            Сохранить
                        </Button>
                    </form>
                </Panel>
            ) : (
                <Panel title="Текст">
                    <p style={{ whiteSpace: 'pre-wrap' }}>{broadcast.body}</p>
                </Panel>
            )}

            <Panel title="По каналам">
                <Table headers={['Канал', 'В очереди / всего', 'Отправлено', 'Ошибки', 'Переходы']}>
                    {Object.entries(by_channel).map(([ch, row]) => (
                        <tr key={ch}>
                            <td>{channels[ch] ?? ch}</td>
                            <td>{row.total}</td>
                            <td>{row.sent}</td>
                            <td>{row.failed}</td>
                            <td>{row.clicks}</td>
                        </tr>
                    ))}
                </Table>
            </Panel>

            {recipients.data.length > 0 ? (
                <Panel title="Получатели">
                    <Table headers={['Пользователь', 'Канал', 'Статус', 'Отправлено', 'Клик', 'Ошибка']}>
                        {recipients.data.map((r) => (
                            <tr key={r.id}>
                                <td>{r.user ?? '—'}</td>
                                <td>{channels[r.channel] ?? r.channel}</td>
                                <td>{r.status}</td>
                                <td>{r.sent_at ?? '—'}</td>
                                <td>{r.clicked_at ?? '—'}</td>
                                <td className="text-xs text-muted">{r.error ?? ''}</td>
                            </tr>
                        ))}
                    </Table>
                    <PagerSafe links={recipients.links} />
                </Panel>
            ) : null}

            {estimate.sample.length > 0 ? (
                <Panel title="Пример аудитории">
                    <ul className="text-sm">
                        {estimate.sample.map((u) => (
                            <li key={u.id}>
                                {u.name} {u.email ? `· ${u.email}` : ''}
                            </li>
                        ))}
                    </ul>
                </Panel>
            ) : null}
        </div>
    );
}
