import { router, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import { PageHead, Panel, Table } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check, TextArea, TextField } from '@/components/ui/Fields';
import { Alert, Badge } from '@/components/ui/Misc';

interface BroadcastRow {
    id: number;
    name: string;
    status: string;
    moderation_status: string | null;
    recipients_total: number;
    sent_count: number;
    click_count: number;
    created_at: string | null;
}

interface Props {
    broadcasts: BroadcastRow[];
    followers_count: number;
    may_broadcast: boolean;
    limits: { max_per_week: number; used_this_week: number; max_body_length: number };
    channels: Record<string, string>;
    moderation_labels: Record<string, string>;
}

export default function CabinetBroadcasts({ broadcasts, followers_count, may_broadcast, limits, channels, moderation_labels }: Props) {
    const [creating, setCreating] = useState(false);
    const form = useForm({
        name: '',
        body: '',
        button_label: 'Подробнее',
        button_url: '',
        channels: ['email'] as string[],
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/clinic-cabinet/broadcasts');
    };

    return (
        <div className="stack-lg">
            <PageHead
                title="Рассылки подписчикам"
                text={`Подписчиков: ${followers_count}. Контакты подписчиков скрыты — видны только агрегированная статистика.`}
            />

            {!may_broadcast ? (
                <Alert tone="warning">Рассылки доступны при активном тарифе продвижения. Оформите продвижение в разделе «Продвижение».</Alert>
            ) : (
                <p className="text-sm text-muted">
                    Лимит: {limits.used_this_week} / {limits.max_per_week} рассылок на модерацию в неделю. Текст до {limits.max_body_length} символов, без телефонов и email в
                    тексте.
                </p>
            )}

            {may_broadcast ? (
                <Button icon="plus" onClick={() => setCreating((v) => !v)}>
                    {creating ? 'Скрыть форму' : 'Новая рассылка'}
                </Button>
            ) : null}

            {creating ? (
                <Panel title="Черновик">
                    <form className="stack" onSubmit={submit}>
                        <TextField label="Тема" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} required />
                        <TextArea label="Текст" value={form.data.body} onChange={(e) => form.setData('body', e.target.value)} error={form.errors.body} rows={5} required />
                        <TextField label="Кнопка" value={form.data.button_label} onChange={(e) => form.setData('button_label', e.target.value)} />
                        <TextField label="Ссылка" value={form.data.button_url} onChange={(e) => form.setData('button_url', e.target.value)} placeholder="https://" />
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
                        <Button type="submit" loading={form.processing}>
                            Сохранить черновик
                        </Button>
                    </form>
                </Panel>
            ) : null}

            <Table headers={['Рассылка', 'Модерация', 'Статус', 'Получатели', 'Отправлено', 'Переходы', '']}>
                {broadcasts.map((b) => (
                    <tr key={b.id}>
                        <td>
                            <b>{b.name}</b>
                            <div className="text-xs text-muted">{b.created_at}</div>
                        </td>
                        <td>{b.moderation_status ? <Badge>{moderation_labels[b.moderation_status] ?? b.moderation_status}</Badge> : '—'}</td>
                        <td>{b.status}</td>
                        <td>{b.recipients_total}</td>
                        <td>{b.sent_count}</td>
                        <td>{b.click_count}</td>
                        <td className="row row--wrap">
                            {b.moderation_status === null || b.moderation_status === 'rejected' ? (
                                <Button size="sm" variant="ghost" onClick={() => router.post(`/clinic-cabinet/broadcasts/${b.id}/submit`)}>
                                    На модерацию
                                </Button>
                            ) : null}
                            {b.moderation_status === 'approved' && b.status !== 'running' && b.status !== 'completed' ? (
                                <Button size="sm" onClick={() => router.post(`/clinic-cabinet/broadcasts/${b.id}/start`)}>
                                    Отправить
                                </Button>
                            ) : null}
                        </td>
                    </tr>
                ))}
            </Table>
        </div>
    );
}
