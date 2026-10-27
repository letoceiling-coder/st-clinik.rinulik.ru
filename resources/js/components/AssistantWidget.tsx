import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import AssistantLeadPanel, { clinicChoicesFromMessages } from '@/components/AssistantLeadPanel';
import { Button } from '@/components/ui/Button';
import { postAssistantMessageStream } from '@/lib/assistant-stream';
import { AnalyticsEvents, trackAnalyticsEvent } from '@/lib/analytics';
import { cx } from '@/lib/format';
import type { SharedProps } from '@/lib/types';

type Msg = { role: 'user' | 'assistant'; text: string; links?: { label: string; url: string }[] };

function xsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export default function AssistantWidget() {
    const { assistant } = usePage<SharedProps>().props as SharedProps & {
        assistant?: { enabled?: boolean; greeting?: string; disclaimer?: string; stream_responses?: boolean };
    };
    const streamResponses = assistant?.stream_responses !== false;
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<Msg[]>([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [isMock, setIsMock] = useState(true);
    const [showLead, setShowLead] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const [quickReplies, setQuickReplies] = useState<string[]>([]);

    const clinicChoices = useMemo(() => clinicChoicesFromMessages(messages), [messages]);

    useEffect(() => {
        if (open && messages.length === 0 && assistant?.greeting) {
            setMessages([{ role: 'assistant', text: assistant.greeting }]);
        }
    }, [open, assistant?.greeting, messages.length]);

    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, open, showLead]);

    const send = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed || busy) {
                return;
            }
            setInput('');
            setShowLead(false);
            setMessages((m) => [...m, { role: 'user', text: trimmed }]);
            setBusy(true);
            try {
                const headers = { 'X-XSRF-TOKEN': xsrfToken() };
                if (streamResponses) {
                    setMessages((m) => [...m, { role: 'assistant', text: '' }]);
                    const data = await postAssistantMessageStream(
                        '/api/v1/assistant/message/stream',
                        { message: trimmed, conversation_id: conversationId },
                        headers,
                        (piece) => {
                            setMessages((m) => {
                                const copy = [...m];
                                const last = copy[copy.length - 1];
                                if (last?.role === 'assistant') {
                                    copy[copy.length - 1] = { ...last, text: last.text + piece };
                                }

                                return copy;
                            });
                        },
                    );
                    if (data.conversation_id) {
                        setConversationId(data.conversation_id);
                    }
                    if (typeof data.mock === 'boolean') {
                        setIsMock(data.mock);
                    }
                    setMessages((m) => {
                        const copy = [...m];
                        const last = copy[copy.length - 1];
                        if (last?.role === 'assistant') {
                            copy[copy.length - 1] = {
                                ...last,
                                text: data.reply ?? last.text,
                                links: data.links,
                            };
                        }

                        return copy;
                    });
                    if (data.suggestions?.length) {
                        setQuickReplies(data.suggestions);
                    }
                } else {
                    const res = await fetch('/api/v1/assistant/message', {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                            ...headers,
                        },
                        body: JSON.stringify({ message: trimmed, conversation_id: conversationId }),
                    });
                    const data = (await res.json()) as {
                        reply?: string;
                        links?: { label: string; url: string }[];
                        suggestions?: string[];
                        conversation_id?: string;
                        mock?: boolean;
                        message?: string;
                    };
                    if (!res.ok) {
                        throw new Error(data.message ?? 'Не удалось отправить сообщение');
                    }
                    if (data.conversation_id) {
                        setConversationId(data.conversation_id);
                    }
                    if (typeof data.mock === 'boolean') {
                        setIsMock(data.mock);
                    }
                    setMessages((m) => [
                        ...m,
                        {
                            role: 'assistant',
                            text: data.reply ?? '…',
                            links: data.links,
                        },
                    ]);
                    if (data.suggestions?.length) {
                        setQuickReplies(data.suggestions);
                    }
                }
            } catch (e) {
                setMessages((m) => [
                    ...m,
                    { role: 'assistant', text: e instanceof Error ? e.message : 'Ошибка сети. Попробуйте позже.' },
                ]);
            } finally {
                setBusy(false);
            }
        },
        [busy, conversationId, streamResponses],
    );

    if (!assistant?.enabled) {
        return null;
    }

    return (
        <>
            {!open ? (
                <button
                    type="button"
                    className="assistant-fab"
                    aria-label="Открыть ассистента"
                    onClick={() => {
                        setOpen(true);
                        trackAnalyticsEvent(AnalyticsEvents.assistantOpen);
                    }}
                >
                    <Icon name="send" size={26} />
                </button>
            ) : null}

            <div className={cx('assistant-panel', open && 'is-open')} role="dialog" aria-label="AI-ассистент">
                <header className="assistant-panel__head">
                    <div>
                        <strong>AI-ассистент</strong>
                        <p className="text-xs text-muted">{isMock ? 'Каталог + шаблоны' : 'OpenRouter'} · без диагнозов</p>
                    </div>
                    <div className="assistant-panel__head-actions">
                        <button
                            type="button"
                            className="assistant-chip assistant-chip--head"
                            disabled={busy}
                            onClick={() => setShowLead((v) => !v)}
                        >
                            Заявка
                        </button>
                        <button type="button" className="icon-link" aria-label="Закрыть" onClick={() => setOpen(false)}>
                            <Icon name="x" size={22} />
                        </button>
                    </div>
                </header>

                <div className="assistant-panel__messages" ref={listRef}>
                    {messages.map((m, i) => (
                        <div key={i} className={cx('assistant-bubble', m.role === 'user' && 'is-user')}>
                            <p className="assistant-bubble__text">{m.text}</p>
                            {m.links?.length ? (
                                <ul className="assistant-bubble__links">
                                    {m.links.map((l) => (
                                        <li key={l.url}>
                                            <a href={l.url} target="_blank" rel="noreferrer">
                                                {l.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            ) : null}
                        </div>
                    ))}
                    {busy ? <p className="text-sm text-muted assistant-typing">Печатает…</p> : null}
                </div>

                {showLead ? (
                    <AssistantLeadPanel
                        conversationId={conversationId}
                        clinics={clinicChoices}
                        onClose={() => setShowLead(false)}
                        onSuccess={(text) => setMessages((m) => [...m, { role: 'assistant', text }])}
                    />
                ) : null}

                {!showLead && assistant.disclaimer ? (
                    <p className="assistant-panel__note text-xs text-muted">{assistant.disclaimer}</p>
                ) : null}

                {!showLead && quickReplies.length ? (
                    <div className="assistant-panel__chips">
                        {quickReplies.slice(0, 4).map((s) => (
                            <button key={s} type="button" className="assistant-chip" disabled={busy} onClick={() => void send(s)}>
                                {s}
                            </button>
                        ))}
                    </div>
                ) : null}

                {!showLead ? (
                    <form
                        className="assistant-panel__form"
                        onSubmit={(e) => {
                            e.preventDefault();
                            void send(input);
                        }}
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Спросите о клиниках или записи…"
                            maxLength={2000}
                            disabled={busy}
                        />
                        <Button type="submit" size="sm" disabled={busy || !input.trim()}>
                            Отправить
                        </Button>
                    </form>
                ) : null}
            </div>
        </>
    );
}
