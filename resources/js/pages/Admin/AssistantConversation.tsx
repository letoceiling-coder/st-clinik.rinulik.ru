import { Link } from '@inertiajs/react';
import { PageHead, Panel } from '@/components/Dash';

interface Message {
    role: string;
    content: string;
    meta: Record<string, unknown> | null;
    created_at: string | null;
}

interface ConversationPayload {
    public_id: string;
    channel: string;
    city: string | null;
    user: { name: string; email: string } | null;
    last_message_at: string | null;
    messages: Message[];
}

export default function AdminAssistantConversation({ conversation }: { conversation: ConversationPayload }) {
    return (
        <>
            <PageHead
                title="Диалог ассистента"
                text={
                    <>
                        <Link href="/admin/assistant">← Настройки ассистента</Link>
                        {' · '}
                        {conversation.channel}
                        {conversation.city ? ` · ${conversation.city}` : ''}
                        {conversation.user ? ` · ${conversation.user.name}` : ''}
                    </>
                }
            />

            <Panel title="Сообщения">
                <div className="assistant-transcript">
                    {conversation.messages.map((m, i) => (
                        <article
                            key={i}
                            className={m.role === 'user' ? 'assistant-transcript__user' : 'assistant-transcript__bot'}
                        >
                            <header>{m.role === 'user' ? 'Пользователь' : 'Ассистент'}</header>
                            <p>{m.content}</p>
                            {m.meta && Object.keys(m.meta).length > 0 ? (
                                <pre className="assistant-transcript__meta">{JSON.stringify(m.meta, null, 2)}</pre>
                            ) : null}
                        </article>
                    ))}
                </div>
            </Panel>
        </>
    );
}
