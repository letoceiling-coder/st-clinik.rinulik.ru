import { usePage } from '@inertiajs/react';
import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Check, SelectField, TextArea, TextField } from '@/components/ui/Fields';
import type { SharedProps } from '@/lib/types';

export type ClinicChoice = { slug: string; label: string };

function xsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function slugFromClinicUrl(url: string): string | null {
    const m = url.match(/\/clinics\/([^/?#]+)/);
    return m?.[1] ?? null;
}

export function clinicChoicesFromMessages(
    messages: { links?: { label: string; url: string }[] }[],
): ClinicChoice[] {
    const map = new Map<string, string>();
    for (const msg of messages) {
        for (const link of msg.links ?? []) {
            const slug = slugFromClinicUrl(link.url);
            if (slug && !map.has(slug)) {
                map.set(slug, link.label);
            }
        }
    }

    return [...map.entries()].map(([slug, label]) => ({ slug, label }));
}

export default function AssistantLeadPanel({
    conversationId,
    clinics,
    onClose,
    onSuccess,
}: {
    conversationId: string | null;
    clinics: ClinicChoice[];
    onClose: () => void;
    onSuccess: (message: string) => void;
}) {
    const { auth } = usePage<SharedProps>().props;
    const [clinic, setClinic] = useState(clinics[0]?.slug ?? '');
    const [name, setName] = useState(auth.user?.name ?? '');
    const [phone, setPhone] = useState('');
    const [comment, setComment] = useState('');
    const [consent, setConsent] = useState(false);
    const [broadcast, setBroadcast] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clinicOptions = useMemo(() => clinics, [clinics]);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!conversationId) {
            setError('Сначала задайте вопрос ассистенту, чтобы начать диалог.');
            return;
        }
        if (!broadcast && !clinic) {
            setError('Выберите клинику из списка или отметьте «Любая клиника города».');
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const res = await fetch('/api/v1/assistant/lead', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': xsrfToken(),
                },
                body: JSON.stringify({
                    conversation_id: conversationId,
                    clinic: broadcast ? clinic || undefined : clinic,
                    broadcast,
                    name,
                    phone,
                    comment: comment || undefined,
                    consent: consent ? true : undefined,
                }),
            });
            const data = (await res.json()) as { message?: string; errors?: Record<string, string[]> };
            if (!res.ok) {
                const first = data.errors ? Object.values(data.errors).flat()[0] : data.message;
                throw new Error(first ?? 'Не удалось отправить заявку');
            }
            onSuccess(data.message ?? 'Заявка отправлена.');
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка сети');
        } finally {
            setBusy(false);
        }
    };

    return (
        <form className="assistant-lead" onSubmit={(e) => void submit(e)}>
            <p className="text-sm text-muted">Клиника перезвонит для подтверждения. Для выбора времени сразу — онлайн-запись в карточке клиники.</p>
            <Check
                label="Любая подходящая клиника города (заявку получат несколько клиник)"
                checked={broadcast}
                onChange={(e) => setBroadcast(e.target.checked)}
            />
            {clinicOptions.length && !broadcast ? (
                <SelectField label="Клиника" value={clinic} onChange={(e) => setClinic(e.target.value)} required>
                    {clinicOptions.map((c) => (
                        <option key={c.slug} value={c.slug}>
                            {c.label}
                        </option>
                    ))}
                </SelectField>
            ) : !broadcast ? (
                <TextField
                    label="Slug клиники"
                    value={clinic}
                    onChange={(e) => setClinic(e.target.value)}
                    placeholder="из ссылки каталога"
                    required
                />
            ) : null}
            <TextField label="Имя" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
            <TextField label="Телефон" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" />
            <TextArea label="Комментарий" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={300} />
            <Check
                label={
                    broadcast
                        ? 'Согласие: контакты будут переданы нескольким клиникам города для обратного звонка'
                        : 'Согласие на обработку персональных данных'
                }
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
            />
            {error ? <p className="text-sm assistant-lead__error">{error}</p> : null}
            <div className="assistant-lead__actions">
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                    Отмена
                </Button>
                <Button type="submit" size="sm" disabled={busy || !consent}>
                    Отправить
                </Button>
            </div>
        </form>
    );
}
