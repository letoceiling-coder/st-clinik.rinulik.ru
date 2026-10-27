import { Link, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { PageHead, Panel } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check, SelectField, TextArea, TextField } from '@/components/ui/Fields';

interface Metrics {
    conversations_7d: number;
    messages_7d: number;
    leads_7d: number;
    openrouter_usd_today: number;
    openrouter_usd_7d: number;
    kb_faq_active: number;
    kb_catalog_chunks: number;
    conversion_7d: number | null;
}

interface Settings {
    enabled: boolean;
    mock_mode: boolean;
    stream_responses: boolean;
    max_messages_per_conversation: number;
    max_messages_per_ip_per_day: number;
    assistant_lead_broadcast_count: number;
    assistant_lead_exclusive_first: boolean;
    greeting: string;
    disclaimer: string;
    system_prompt: string;
}

interface RecentConversation {
    public_id: string;
    channel: string;
    city: string | null;
    messages_count: number;
    last_message_at: string | null;
}

interface KbEntry {
    id: number;
    question: string;
    answer: string;
    city_id: number | null;
    city: string | null;
    is_active: boolean;
    sort: number;
}

interface CityOption {
    id: number;
    name: string;
}

const emptyKb = {
    question: '',
    answer: '',
    city_id: '' as string | number,
    is_active: true,
    sort: 100,
};

export default function AdminAssistant({
    settings,
    metrics,
    recentConversations,
    kbEntries,
    cities,
}: {
    settings: Settings;
    metrics: Metrics;
    recentConversations: RecentConversation[];
    kbEntries: KbEntry[];
    cities: CityOption[];
}) {
    const form = useForm({
        ...settings,
        system_prompt: settings.system_prompt ?? '',
        stream_responses: settings.stream_responses ?? true,
        max_messages_per_conversation: settings.max_messages_per_conversation ?? 40,
        max_messages_per_ip_per_day: settings.max_messages_per_ip_per_day ?? 80,
        assistant_lead_broadcast_count: settings.assistant_lead_broadcast_count ?? 3,
        assistant_lead_exclusive_first: settings.assistant_lead_exclusive_first ?? true,
    });
    const [editId, setEditId] = useState<number | null>(null);
    const kbForm = useForm({ ...emptyKb });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.put('/admin/assistant');
    };

    const startEdit = (entry: KbEntry) => {
        setEditId(entry.id);
        kbForm.setData({
            question: entry.question,
            answer: entry.answer,
            city_id: entry.city_id ?? '',
            is_active: entry.is_active,
            sort: entry.sort,
        });
    };

    const submitKb = (e: FormEvent) => {
        e.preventDefault();
        const payload = {
            ...kbForm.data,
            city_id: kbForm.data.city_id === '' ? null : Number(kbForm.data.city_id),
        };
        if (editId) {
            kbForm.transform(() => payload).put(`/admin/assistant/kb/${editId}`, {
                onSuccess: () => {
                    setEditId(null);
                    kbForm.reset();
                    kbForm.setData({ ...emptyKb });
                },
            });
        } else {
            kbForm.transform(() => payload).post('/admin/assistant/kb', {
                onSuccess: () => {
                    kbForm.reset();
                    kbForm.setData({ ...emptyKb });
                },
            });
        }
    };

    return (
        <>
            <PageHead
                title="AI-ассистент"
                text="OpenRouter, инструменты каталога, FAQ, pgvector/HNSW для FAQ, SSE-поток OpenRouter, рассылка лида по клиникам города, суточный бюджет — в интеграциях."
            />

            <Panel title="Статистика (7 дней)">
                <div className="kpi-grid">
                    <div className="kpi">
                        <span className="kpi__label">Диалоги</span>
                        <span className="kpi__value">{metrics.conversations_7d}</span>
                    </div>
                    <div className="kpi">
                        <span className="kpi__label">Сообщения</span>
                        <span className="kpi__value">{metrics.messages_7d}</span>
                    </div>
                    <div className="kpi">
                        <span className="kpi__label">Лиды</span>
                        <span className="kpi__value">{metrics.leads_7d}</span>
                    </div>
                    <div className="kpi">
                        <span className="kpi__label">Конверсия</span>
                        <span className="kpi__value">{metrics.conversion_7d != null ? `${metrics.conversion_7d}%` : '—'}</span>
                    </div>
                    <div className="kpi">
                        <span className="kpi__label">OpenRouter сегодня</span>
                        <span className="kpi__value">${metrics.openrouter_usd_today}</span>
                    </div>
                    <div className="kpi">
                        <span className="kpi__label">Чанки каталога</span>
                        <span className="kpi__value">{metrics.kb_catalog_chunks}</span>
                    </div>
                </div>
            </Panel>

            <form onSubmit={submit}>
                <Panel title="Публичный виджет и MAX-бот">
                    <div className="form-grid">
                        <Check
                            label="Ассистент включён"
                            checked={form.data.enabled}
                            onChange={(e) => form.setData('enabled', e.target.checked)}
                        />
                        <Check
                            label="Mock-режим (без OpenRouter)"
                            checked={form.data.mock_mode}
                            onChange={(e) => form.setData('mock_mode', e.target.checked)}
                        />
                        <Check
                            label="Потоковый ответ в виджете (SSE)"
                            checked={form.data.stream_responses}
                            onChange={(e) => form.setData('stream_responses', e.target.checked)}
                        />
                        <TextField
                            label="Лимит сообщений в диалоге"
                            type="number"
                            value={form.data.max_messages_per_conversation}
                            onChange={(e) => form.setData('max_messages_per_conversation', Number(e.target.value))}
                        />
                        <TextField
                            label="Лимит сообщений с IP за сутки"
                            type="number"
                            value={form.data.max_messages_per_ip_per_day}
                            onChange={(e) => form.setData('max_messages_per_ip_per_day', Number(e.target.value))}
                        />
                        <TextField
                            label="Сколько клиник получают лид при «любая клиника»"
                            type="number"
                            min={1}
                            max={5}
                            value={form.data.assistant_lead_broadcast_count}
                            onChange={(e) => form.setData('assistant_lead_broadcast_count', Number(e.target.value))}
                        />
                        <Check
                            label="Эксклюзив: первая клиника «Беру в работу» закрепляет пациента"
                            checked={form.data.assistant_lead_exclusive_first}
                            onChange={(e) => form.setData('assistant_lead_exclusive_first', e.target.checked)}
                        />
                        <TextArea
                            label="Приветствие"
                            value={form.data.greeting}
                            onChange={(e) => form.setData('greeting', e.target.value)}
                            rows={4}
                        />
                        <TextArea
                            label="Дисклеймер (медицина, 103/112)"
                            value={form.data.disclaimer}
                            onChange={(e) => form.setData('disclaimer', e.target.value)}
                            rows={3}
                        />
                        <TextArea
                            label="System prompt (пусто — шаблон по умолчанию)"
                            value={form.data.system_prompt}
                            onChange={(e) => form.setData('system_prompt', e.target.value)}
                            rows={6}
                        />
                    </div>
                    <div className="form-actions">
                        <Button type="submit" disabled={form.processing}>
                            Сохранить
                        </Button>
                    </div>
                </Panel>
            </form>

            <Panel title="База знаний (FAQ)">
                <form onSubmit={submitKb} className="form-grid">
                    <TextField
                        label="Вопрос"
                        value={kbForm.data.question}
                        onChange={(e) => kbForm.setData('question', e.target.value)}
                        required
                    />
                    <TextArea
                        label="Ответ"
                        value={kbForm.data.answer}
                        onChange={(e) => kbForm.setData('answer', e.target.value)}
                        rows={4}
                        required
                    />
                    <SelectField
                        label="Город (пусто — все города)"
                        value={kbForm.data.city_id}
                        onChange={(e) => kbForm.setData('city_id', e.target.value)}
                    >
                        <option value="">Вся платформа</option>
                        {cities.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </SelectField>
                    <TextField
                        label="Порядок"
                        type="number"
                        value={kbForm.data.sort}
                        onChange={(e) => kbForm.setData('sort', Number(e.target.value))}
                    />
                    <Check
                        label="Активна"
                        checked={kbForm.data.is_active}
                        onChange={(e) => kbForm.setData('is_active', e.target.checked)}
                    />
                    <div className="form-actions">
                        {editId ? (
                            <Button type="button" variant="ghost" onClick={() => setEditId(null)}>
                                Отмена
                            </Button>
                        ) : null}
                        <Button type="submit" disabled={kbForm.processing}>
                            {editId ? 'Сохранить запись' : 'Добавить запись'}
                        </Button>
                    </div>
                </form>

                <ul className="dash-list" style={{ marginTop: 16 }}>
                    {kbEntries.map((entry) => (
                        <li key={entry.id}>
                            <strong>{entry.question}</strong>
                            {entry.city ? ` · ${entry.city}` : ' · вся платформа'}
                            {!entry.is_active ? ' · скрыта' : ''}
                            <div className="text-sm text-muted">{entry.answer.slice(0, 120)}{entry.answer.length > 120 ? '…' : ''}</div>
                            <div className="form-actions" style={{ marginTop: 6 }}>
                                <Button type="button" size="sm" variant="ghost" onClick={() => startEdit(entry)}>
                                    Изменить
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        if (confirm('Удалить запись?')) {
                                            router.delete(`/admin/assistant/kb/${entry.id}`);
                                        }
                                    }}
                                >
                                    Удалить
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            </Panel>

            <Panel title="Недавние диалоги">
                {recentConversations.length === 0 ? (
                    <p className="text-muted">Пока нет сохранённых диалогов.</p>
                ) : (
                    <ul className="dash-list">
                        {recentConversations.map((row) => (
                            <li key={row.public_id}>
                                <Link href={`/admin/assistant/conversations/${row.public_id}`}>
                                    {row.channel}
                                    {row.city ? ` · ${row.city}` : ''} · {row.messages_count} сообщ.
                                    {row.last_message_at ? ` · ${new Date(row.last_message_at).toLocaleString('ru-RU')}` : ''}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </Panel>
        </>
    );
}
