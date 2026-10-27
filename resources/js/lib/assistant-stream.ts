export type AssistantReplyPayload = {
    reply: string;
    suggestions?: string[];
    links?: { label: string; url: string }[];
    conversation_id?: string;
    mock?: boolean;
};

function parseSseBlock(block: string): { event: string; data: string } | null {
    const lines = block.split('\n');
    let event = 'message';
    let data = '';
    for (const line of lines) {
        if (line.startsWith('event:')) {
            event = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
            data += line.slice(5).trim();
        }
    }
    if (data === '') {
        return null;
    }

    return { event, data };
}

export async function postAssistantMessageStream(
    url: string,
    body: { message: string; conversation_id: string | null },
    headers: Record<string, string>,
    onChunk: (text: string) => void,
): Promise<AssistantReplyPayload> {
    const res = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? 'Не удалось отправить сообщение');
    }

    const reader = res.body?.getReader();
    if (!reader) {
        throw new Error('Поток недоступен');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let donePayload: AssistantReplyPayload | null = null;

    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';
        for (const part of parts) {
            const parsed = parseSseBlock(part.trim());
            if (!parsed) {
                continue;
            }
            const json = JSON.parse(parsed.data) as Record<string, unknown>;
            if (parsed.event === 'chunk' && typeof json.text === 'string') {
                onChunk(json.text);
            }
            if (parsed.event === 'done') {
                donePayload = json as AssistantReplyPayload;
            }
            if (parsed.event === 'error') {
                throw new Error(typeof json.message === 'string' ? json.message : 'Ошибка ассистента');
            }
        }
    }

    if (!donePayload) {
        throw new Error('Ответ оборвался');
    }

    return donePayload;
}
