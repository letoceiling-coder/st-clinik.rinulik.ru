import { Link, router, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import { PageHead, Panel, Table } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check, SelectField, TextArea, TextField } from '@/components/ui/Fields';
import { Badge } from '@/components/ui/Misc';
import type { Paginated } from '@/lib/types';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | undefined;

interface BroadcastRow {
    id: number;
    name: string;
    status: string;
    channels: string[];
    recipients_total: number;
    sent_count: number;
    failed_count: number;
    click_count: number;
    scheduled_at: string | null;
    created_at: string | null;
    by: string | null;
}

interface PendingClinic {
    id: number;
    name: string;
    clinic: string | null;
    body: string;
    recipients_total: number;
    created_at: string | null;
}

interface Props {
    broadcasts: Paginated<BroadcastRow>;
    cities: { id: number; name: string }[];
    channels: Record<string, string>;
    statuses: Record<string, string>;
    roles: Record<string, string>;
    pending_clinic: PendingClinic[];
    clinic_settings: { enabled: boolean; max_per_week: number; max_body_length: number; requires_active_promotion: boolean };
}

const TONE: Record<string, Tone> = {
    draft: undefined,
    scheduled: 'info',
    running: 'primary',
    paused: 'warning',
    completed: 'success',
    cancelled: 'danger',
};

export default function AdminBroadcasts({ broadcasts, cities, channels, statuses, roles, pending_clinic, clinic_settings }: Props) {
    const [creating, setCreating] = useState(broadcasts.data.length === 0);
    const settingsForm = useForm({ ...clinic_settings });

    return (
        <div className="stack-lg">
            <PageHead
                title="Рассылки"
                text="Новости и акции платформы для подписчиков: email, MAX и Web Push. Учитываются настройки «Новости платформы» в профиле и стоп-лист."
                action={
                    <Button icon="plus" onClick={() => setCreating((v) => !v)}>
                        {creating ? 'Скрыть форму' : 'Новая рассылка'}
                    </Button>
                }
            />

            <Panel title="Рассылки клиник — лимиты">
                <form
                    className="stack"
                    onSubmit={(e) => {
                        e.preventDefault();
                        settingsForm.put('/admin/broadcasts/clinic-settings');
                    }}
                >
                    <Check label="Функция включена" checked={settingsForm.data.enabled} onChange={(e) => settingsForm.setData('enabled', e.target.checked)} />
                    <Check
                        label="Только при активном продвижении"
                        checked={settingsForm.data.requires_active_promotion}
                        onChange={(e) => settingsForm.setData('requires_active_promotion', e.target.checked)}
                    />
                    <TextField label="Макс. рассылок в неделю на клинику" type="number" value={String(settingsForm.data.max_per_week)} onChange={(e) => settingsForm.setData('max_per_week', Number(e.target.value))} />
                    <TextField label="Макс. длина текста" type="number" value={String(settingsForm.data.max_body_length)} onChange={(e) => settingsForm.setData('max_body_length', Number(e.target.value))} />
                    <Button type="submit" size="sm" loading={settingsForm.processing}>
                        Сохранить лимиты
                    </Button>
                </form>
            </Panel>

            {pending_clinic.length > 0 ? (
                <Panel title="На модерации (клиники)">
                    <Table headers={['Клиника', 'Тема', 'Получателей', '']}>
                        {pending_clinic.map((b) => (
                            <tr key={b.id}>
                                <td>{b.clinic}</td>
                                <td>
                                    <Link href={`/admin/broadcasts/${b.id}`} className="link">
                                        {b.name}
                                    </Link>
                                    <div className="text-xs text-muted">{b.body}</div>
                                </td>
                                <td>{b.recipients_total}</td>
                                <td>
                                    <Button size="sm" variant="ghost" onClick={() => router.post(`/admin/broadcasts/${b.id}/moderate`, { decision: 'approve' })}>
                                        Одобрить
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </Table>
                </Panel>
            ) : null}

            {creating ? <CreateForm cities={cities} channels={channels} roles={roles} /> : null}

            {broadcasts.data.length > 0 ? (
                <Table headers={['Рассылка', 'Статус', 'Получатели', 'Отправлено', 'Ошибки', 'Переходы', '']}>
                    {broadcasts.data.map((b) => (
                        <tr key={b.id}>
                            <td>
                                <Link href={`/admin/broadcasts/${b.id}`} className="link">
                                    <b>{b.name}</b>
                                </Link>
                                <div className="text-xs text-muted">
                                    {b.channels.map((ch) => channels[ch] ?? ch).join(', ')} · {b.created_at}
                                    {b.scheduled_at ? ` · запуск ${b.scheduled_at}` : null}
                                </div>
                            </td>
                            <td>
                                <Badge tone={TONE[b.status]}>{statuses[b.status] ?? b.status}</Badge>
                            </td>
                            <td>{b.recipients_total}</td>
                            <td>{b.sent_count}</td>
                            <td>{b.failed_count}</td>
                            <td>{b.click_count}</td>
                            <td>
                                <Link href={`/admin/broadcasts/${b.id}`} className="link text-sm">
                                    Открыть
                                </Link>
                            </td>
                        </tr>
                    ))}
                </Table>
            ) : null}
        </div>
    );
}

function CreateForm({
    cities,
    channels,
    roles,
}: {
    cities: Props['cities'];
    channels: Props['channels'];
    roles: Props['roles'];
}) {
    const form = useForm({
        name: '',
        body: '',
        button_label: '',
        button_url: '',
        channels: ['email'] as string[],
        filters: {
            city_id: '' as number | '',
            roles: ['user'] as string[],
            active_within_days: '',
        },
    });

    const toggleChannel = (key: string) => {
        const set = new Set(form.data.channels);
        if (set.has(key)) {
            set.delete(key);
        } else {
            set.add(key);
        }
        form.setData('channels', [...set]);
    };

    const toggleRole = (key: string) => {
        const set = new Set(form.data.filters.roles);
        if (set.has(key)) {
            set.delete(key);
        } else {
            set.add(key);
        }
        form.setData('filters', { ...form.data.filters, roles: [...set] });
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/admin/broadcasts');
    };

    return (
        <Panel title="Новая рассылка">
            <form className="stack" onSubmit={submit}>
                <TextField label="Название (тема)" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} required />
                <TextArea label="Текст" value={form.data.body} onChange={(e) => form.setData('body', e.target.value)} error={form.errors.body} rows={6} required />
                <div className="row row--wrap">
                    <TextField label="Подпись кнопки" value={form.data.button_label} onChange={(e) => form.setData('button_label', e.target.value)} error={form.errors.button_label} />
                    <TextField label="Ссылка кнопки" value={form.data.button_url} onChange={(e) => form.setData('button_url', e.target.value)} error={form.errors.button_url} placeholder="https://" />
                </div>
                <div>
                    <p className="label">Каналы</p>
                    <div className="row row--wrap">
                        {Object.entries(channels).map(([key, label]) => (
                            <Check key={key} label={label} checked={form.data.channels.includes(key)} onChange={() => toggleChannel(key)} />
                        ))}
                    </div>
                    {form.errors.channels ? <p className="field-error">{form.errors.channels}</p> : null}
                </div>
                <div>
                    <p className="label">Аудитория</p>
                    <div className="row row--wrap">
                        {Object.entries(roles).map(([key, label]) => (
                            <Check key={key} label={label} checked={form.data.filters.roles.includes(key)} onChange={() => toggleRole(key)} />
                        ))}
                    </div>
                    <div className="row row--wrap" style={{ marginTop: 12 }}>
                        <SelectField
                            label="Город"
                            value={String(form.data.filters.city_id)}
                            onChange={(e) => form.setData('filters', { ...form.data.filters, city_id: e.target.value ? Number(e.target.value) : '' })}
                        >
                            <option value="">Все города</option>
                            {cities.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </SelectField>
                        <TextField
                            label="Активность, дней"
                            value={form.data.filters.active_within_days}
                            onChange={(e) => form.setData('filters', { ...form.data.filters, active_within_days: e.target.value })}
                            placeholder="0 — без фильтра"
                        />
                    </div>
                </div>
                <Button type="submit" loading={form.processing}>
                    Создать черновик
                </Button>
            </form>
        </Panel>
    );
}
