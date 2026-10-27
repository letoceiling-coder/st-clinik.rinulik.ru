import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Panel } from '@/components/Dash';
import Icon from '@/components/Icon';
import { AnchorButton, Button } from '@/components/ui/Button';
import { PhoneField, TextArea, TextField } from '@/components/ui/Fields';
import { Alert, Badge } from '@/components/ui/Misc';

export interface DispatchChannel {
    key: string;
    label: string;
    mode: 'auto' | 'manual';
    available: boolean;
    reason: string | null;
    contact: string | null;
    link: string | null;
    last: { status: string; at: string | null } | null;
}

function xsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

/** Дополнительный текст об акциях и спецпредложениях + подсказка ИИ (принимается вручную). */
export function ExtraPanel({ offerId, extra, disabled }: { offerId: number; extra: { text: string; max: number; ai_available: boolean }; disabled: boolean }) {
    const form = useForm({ extra_note: extra.text });
    const [suggestion, setSuggestion] = useState<string | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    const improve = async () => {
        setAiLoading(true);
        setAiError(null);
        try {
            const response = await fetch(`/admin/offers/${offerId}/improve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-XSRF-TOKEN': xsrfToken() },
                body: JSON.stringify({ text: form.data.extra_note }),
            });
            const json = (await response.json()) as { text?: string; message?: string };
            if (!response.ok || !json.text) {
                throw new Error(json.message ?? 'Не удалось получить вариант от ИИ.');
            }
            setSuggestion(json.text);
        } catch (e) {
            setAiError(e instanceof Error ? e.message : 'Не удалось получить вариант от ИИ.');
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <Panel title="Дополнительное предложение">
            <form
                className="stack"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.put(`/admin/offers/${offerId}/extra`, { preserveScroll: true });
                }}
            >
                <p className="text-sm text-muted">
                    Акции, бонусы, особые условия для этой клиники. Текст появится отдельным блоком на странице КП и подставится в письмо вместо {'{extra}'}.
                </p>
                <TextArea
                    label="Текст предложения"
                    rows={4}
                    maxLength={extra.max}
                    value={form.data.extra_note}
                    onChange={(e) => form.setData('extra_note', e.target.value)}
                    error={form.errors.extra_note}
                    placeholder="Например: при подключении до 30 ноября — 3 месяца тарифа «Профи» по цене двух и бесплатное оформление карточки."
                    disabled={disabled}
                />
                {aiError ? <Alert tone="warning">{aiError}</Alert> : null}
                {suggestion !== null ? (
                    <div className="offer-ai-suggestion">
                        <span className="offer-ai-suggestion__label">
                            <Icon name="sparkle" size={16} /> Вариант от ИИ — проверьте факты перед сохранением
                        </span>
                        <p>{suggestion}</p>
                        <div className="row row--wrap">
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                    form.setData('extra_note', suggestion);
                                    setSuggestion(null);
                                }}
                            >
                                Подставить
                            </Button>
                            <Button type="button" size="sm" variant="ghost" onClick={() => setSuggestion(null)}>
                                Отклонить
                            </Button>
                        </div>
                    </div>
                ) : null}
                <div className="row row--wrap">
                    <Button type="submit" loading={form.processing} disabled={disabled}>
                        Сохранить в КП
                    </Button>
                    {extra.ai_available ? (
                        <Button type="button" variant="outline" icon="sparkle" loading={aiLoading} disabled={disabled || form.data.extra_note.trim() === ''} onClick={improve}>
                            Улучшить с ИИ
                        </Button>
                    ) : (
                        <span className="text-xs text-muted">ИИ недоступен: добавьте ключ OpenRouter в Интеграциях.</span>
                    )}
                </div>
            </form>
        </Panel>
    );
}

/** Отправка КП одному получателю: показываются только каналы с подключённой интеграцией. */
export function DispatchPanel({ offerId, channels, statuses, disabled }: { offerId: number; channels: DispatchChannel[]; statuses: Record<string, string>; disabled: boolean }) {
    const [contacts, setContacts] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState<string | null>(null);

    const send = (channel: DispatchChannel) => {
        const verb = channel.mode === 'auto' ? `Отправить КП: ${channel.label}?` : `Отметить, что КП отправлено вручную: ${channel.label}?`;
        if (!window.confirm(verb)) {
            return;
        }
        setBusy(channel.key);
        router.post(
            `/admin/offers/${offerId}/send`,
            { channel: channel.key, contact: contacts[channel.key] ?? '' },
            { preserveScroll: true, onFinish: () => setBusy(null) },
        );
    };

    return (
        <Panel title="Отправка КП">
            {disabled ? <Alert tone="warning">КП отозвано или истекло — отправка недоступна.</Alert> : null}
            <p className="text-sm text-muted">Email и SMS отправляются автоматически. Для мессенджеров и звонка откроется готовый текст — после отправки отметьте её здесь.</p>
            <div className="offer-dispatch">
                {channels.map((c) => {
                    const needsContact = c.reason === 'Нет подходящего контакта в карточке.';
                    const blocked = !c.available && !needsContact;

                    return (
                        <div key={c.key} className={`offer-dispatch__item card${blocked ? ' is-off' : ''}`}>
                            <div className="row row--between">
                                <b>{c.label}</b>
                                <Badge tone={c.mode === 'auto' ? 'info' : undefined}>{c.mode === 'auto' ? 'авто' : 'вручную'}</Badge>
                            </div>
                            {c.contact ? <span className="text-sm">{c.contact}</span> : null}
                            {c.reason ? <span className="text-xs text-muted">{c.reason}</span> : null}
                            {needsContact && !disabled ? (
                                c.key === 'email' ? (
                                    <TextField
                                        aria-label={`Контакт для канала ${c.label}`}
                                        placeholder="email@clinic.ru"
                                        type="email"
                                        value={contacts[c.key] ?? ''}
                                        onChange={(e) => setContacts((prev) => ({ ...prev, [c.key]: e.target.value }))}
                                    />
                                ) : (
                                    <PhoneField
                                        aria-label={`Номер для канала ${c.label}`}
                                        autoComplete="off"
                                        value={contacts[c.key] ?? ''}
                                        onChange={(e) => setContacts((prev) => ({ ...prev, [c.key]: e.target.value }))}
                                    />
                                )
                            ) : null}
                            {c.last ? (
                                <span className="text-xs text-muted">
                                    Последняя: {statuses[c.last.status] ?? c.last.status}
                                    {c.last.at ? `, ${c.last.at}` : ''}
                                </span>
                            ) : null}
                            <div className="row row--wrap">
                                {c.link && !disabled ? (
                                    <AnchorButton href={c.link} target="_blank" rel="noopener" size="sm" variant="outline" icon="external">
                                        {c.key === 'phone' ? 'Позвонить' : 'Открыть'}
                                    </AnchorButton>
                                ) : null}
                                <Button size="sm" disabled={disabled || blocked || (needsContact && !(contacts[c.key] ?? '').trim())} loading={busy === c.key} onClick={() => send(c)}>
                                    {c.mode === 'auto' ? 'Отправить' : 'Отметить отправку'}
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Panel>
    );
}
