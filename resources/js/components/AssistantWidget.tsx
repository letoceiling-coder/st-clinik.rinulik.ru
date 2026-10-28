import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import Icon from '@/components/Icon';
import AssistantLeadPanel, { clinicChoicesFromMessages } from '@/components/AssistantLeadPanel';
import { postAssistantMessageStream } from '@/lib/assistant-stream';
import { AnalyticsEvents, trackAnalyticsEvent } from '@/lib/analytics';
import { cx } from '@/lib/format';
import type { SharedProps } from '@/lib/types';

type Msg = { role: 'user' | 'assistant'; text: string; links?: { label: string; url: string }[] };

const STARTER_REPLIES = ['Болит зуб', 'Подобрать имплантацию', 'Детский стоматолог', 'Записаться сегодня'];

const MOBILE_QUERY = '(max-width: 767px)';

function xsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Знак ассистента: графитовый круг с иконкой «облачко с искрой» и живым переливающимся кольцом
 * фирменных цветов в духе Siri; пока ассистент отвечает, кольцо вращается быстрее.
 */
function AssistantMark({ active = false, size = 'md' }: { active?: boolean; size?: 'sm' | 'md' }) {
    return (
        <span className={cx('assistant-mark', `assistant-mark--${size}`, active && 'is-active')} aria-hidden="true">
            <span className="assistant-mark__glow" />
            <span className="assistant-mark__ring" />
            <span className="assistant-mark__core">
                <Icon name="assistant" size={size === 'sm' ? 20 : 26} strokeWidth={1.8} />
            </span>
        </span>
    );
}

/**
 * На телефоне чат занимает весь экран и повторяет видимую область (visualViewport),
 * поэтому поле ввода остаётся над клавиатурой, а страница под чатом не прокручивается.
 */
function useMobileSheet(open: boolean, panelRef: RefObject<HTMLDivElement | null>): void {
    useEffect(() => {
        const panel = panelRef.current;
        if (!open || !panel || !window.matchMedia(MOBILE_QUERY).matches) {
            return undefined;
        }

        const viewport = window.visualViewport;
        const sync = (): void => {
            const height = viewport ? viewport.height : window.innerHeight;
            const top = viewport ? viewport.offsetTop : 0;
            panel.style.setProperty('--assistant-vh', `${Math.round(height)}px`);
            panel.style.setProperty('--assistant-top', `${Math.round(top)}px`);
        };
        sync();
        viewport?.addEventListener('resize', sync);
        viewport?.addEventListener('scroll', sync);
        window.addEventListener('resize', sync);

        const root = document.documentElement;
        root.classList.add('assistant-open');

        return () => {
            viewport?.removeEventListener('resize', sync);
            viewport?.removeEventListener('scroll', sync);
            window.removeEventListener('resize', sync);
            root.classList.remove('assistant-open');
            panel.style.removeProperty('--assistant-vh');
            panel.style.removeProperty('--assistant-top');
        };
    }, [open, panelRef]);
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
    const [showLead, setShowLead] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [quickReplies, setQuickReplies] = useState<string[]>([]);

    const clinicChoices = useMemo(() => clinicChoicesFromMessages(messages), [messages]);
    const userHasWritten = messages.some((m) => m.role === 'user');
    const chips = quickReplies.length ? quickReplies : userHasWritten ? [] : STARTER_REPLIES;

    useMobileSheet(open, panelRef);

    useEffect(() => {
        if (open && messages.length === 0 && assistant?.greeting) {
            setMessages([{ role: 'assistant', text: assistant.greeting }]);
        }
    }, [open, assistant?.greeting, messages.length]);

    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, open, showLead, busy]);

    useEffect(() => {
        if (!open) {
            return undefined;
        }
        const onKey = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };
        window.addEventListener('keydown', onKey);
        // На телефоне клавиатуру сразу не открываем: сначала видно приветствие и подсказки.
        if (!window.matchMedia(MOBILE_QUERY).matches) {
            inputRef.current?.focus();
        }

        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    useEffect(() => {
        const field = inputRef.current;
        if (field) {
            field.style.height = 'auto';
            // +2px: высота строки дробная, без запаса появляется полоса прокрутки и текст уезжает вниз.
            const contentHeight = field.scrollHeight + 2;
            field.style.height = `${Math.min(contentHeight, 120)}px`;
            field.style.overflowY = contentHeight > 120 ? 'auto' : 'hidden';
        }
    }, [input, open, showLead]);

    const send = useCallback(
        async (text: string) => {
            const trimmed = text.trim();
            if (!trimmed || busy) {
                return;
            }
            setInput('');
            setShowLead(false);
            setQuickReplies([]);
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
                        message?: string;
                    };
                    if (!res.ok) {
                        throw new Error(data.message ?? 'Не удалось отправить сообщение');
                    }
                    if (data.conversation_id) {
                        setConversationId(data.conversation_id);
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
                setMessages((m) => {
                    const last = m[m.length - 1];
                    const base = last?.role === 'assistant' && last.text === '' ? m.slice(0, -1) : m;

                    return [...base, { role: 'assistant', text: e instanceof Error ? e.message : 'Ошибка сети. Попробуйте позже.' }];
                });
            } finally {
                setBusy(false);
            }
        },
        [busy, conversationId, streamResponses],
    );

    if (!assistant?.enabled) {
        return null;
    }

    const lastMessage = messages[messages.length - 1];
    const waitingFirstPiece = busy && !(lastMessage?.role === 'assistant' && lastMessage.text !== '');

    return (
        <>
            {!open ? (
                <button
                    type="button"
                    className="assistant-fab"
                    aria-label="Открыть AI-ассистента"
                    onClick={() => {
                        setOpen(true);
                        trackAnalyticsEvent(AnalyticsEvents.assistantOpen);
                    }}
                >
                    <AssistantMark />
                    <span className="assistant-fab__label">Спросить AI</span>
                </button>
            ) : null}

            <div ref={panelRef} className={cx('assistant-panel', open && 'is-open')} role="dialog" aria-modal={open} aria-label="AI-ассистент" hidden={!open}>
                <header className="assistant-panel__head">
                    <AssistantMark active={busy} size="sm" />
                    <div className="assistant-panel__title">
                        <strong>AI-ассистент</strong>
                        <span>{busy ? 'Подбирает ответ…' : 'Поможет найти клинику и врача'}</span>
                    </div>
                    <div className="assistant-panel__head-actions">
                        <button type="button" className={cx('assistant-chip assistant-chip--head', showLead && 'is-active')} disabled={busy} onClick={() => setShowLead((v) => !v)}>
                            <Icon name="calendar" size={16} />
                            Заявка
                        </button>
                        <button type="button" className="assistant-panel__close" aria-label="Закрыть" onClick={() => setOpen(false)}>
                            <Icon name="x" size={20} />
                        </button>
                    </div>
                </header>

                <div className="assistant-panel__messages" ref={listRef} aria-live="polite">
                    {messages.map((m, i) =>
                        m.role === 'assistant' && m.text === '' ? null : (
                            <div key={i} className={cx('assistant-bubble', m.role === 'user' && 'is-user')}>
                                <p className="assistant-bubble__text">{m.text}</p>
                                {m.links?.length ? (
                                    <ul className="assistant-bubble__links">
                                        {m.links.map((l) => (
                                            <li key={l.url}>
                                                <a href={l.url} target="_blank" rel="noreferrer">
                                                    {l.label}
                                                    <Icon name="chevron-right" size={14} />
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </div>
                        ),
                    )}
                    {waitingFirstPiece ? (
                        <div className="assistant-bubble assistant-typing" aria-label="Ассистент печатает">
                            <span />
                            <span />
                            <span />
                        </div>
                    ) : null}
                </div>

                {showLead ? (
                    <AssistantLeadPanel
                        conversationId={conversationId}
                        clinics={clinicChoices}
                        onClose={() => setShowLead(false)}
                        onSuccess={(text) => setMessages((m) => [...m, { role: 'assistant', text }])}
                    />
                ) : null}

                {!showLead && chips.length ? (
                    <div className="assistant-panel__chips">
                        {chips.slice(0, 4).map((s) => (
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
                        <textarea
                            ref={inputRef}
                            rows={1}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                                    e.preventDefault();
                                    void send(input);
                                }
                            }}
                            placeholder="Напишите вопрос…"
                            aria-label="Сообщение ассистенту"
                            maxLength={2000}
                            enterKeyHint="send"
                            autoComplete="off"
                        />
                        <button type="submit" className="assistant-panel__send" aria-label="Отправить" disabled={busy || !input.trim()}>
                            <Icon name="arrow-up" size={20} strokeWidth={2.4} />
                        </button>
                    </form>
                ) : null}

                {!showLead && !userHasWritten && assistant.disclaimer ? <p className="assistant-panel__note">{assistant.disclaimer}</p> : null}
            </div>
        </>
    );
}
