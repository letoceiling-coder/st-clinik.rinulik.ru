import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check } from '@/components/ui/Fields';
import { Alert } from '@/components/ui/Misc';

type PrefRow = { key: string; label: string; channels: string[]; available: string[] };

export default function Settings({
    notification_preferences,
    notification_channel_labels,
    assistant_leads,
}: {
    notification_preferences: PrefRow[];
    notification_channel_labels: Record<string, string>;
    assistant_leads: { enabled: boolean; accepts: boolean; can_manage: boolean };
}) {
    const notifyForm = useForm({
        preferences: notification_preferences.map((row) => ({ key: row.key, channels: [...row.channels] })),
    });
    const assistantForm = useForm({ accepts_assistant_leads: assistant_leads.accepts });

    const toggleChannel = (rowIndex: number, channel: string) => {
        const channels = [...(notifyForm.data.preferences[rowIndex]?.channels ?? [])];
        const next = channels.includes(channel) ? channels.filter((c) => c !== channel) : [...channels, channel];
        const prefs = [...notifyForm.data.preferences];
        prefs[rowIndex] = { ...prefs[rowIndex], channels: next };
        notifyForm.setData('preferences', prefs);
    };

    const saveNotify = (e: FormEvent) => {
        e.preventDefault();
        notifyForm.put('/clinic-cabinet/settings/notifications');
    };

    const saveAssistant = (e: FormEvent) => {
        e.preventDefault();
        assistantForm.put('/clinic-cabinet/settings/assistant-leads');
    };

    return (
        <div className="stack-lg">
            <PageHead title="Настройки" text="Уведомления для вашего аккаунта и параметры филиала." />

            <form className="card stack" onSubmit={saveNotify}>
                <h2 className="card-title">Уведомления в кабинете</h2>
                <p className="text-sm text-muted">Снимите все галочки у типа события, чтобы не получать такие уведомления.</p>
                <div className="stack">
                    {notification_preferences.map((row, rowIndex) => (
                        <div key={row.key} className="stack">
                            <strong className="text-sm">{row.label}</strong>
                            <div className="row row--wrap">
                                {row.available.map((channel) => (
                                    <Check
                                        key={`${row.key}-${channel}`}
                                        label={notification_channel_labels[channel] ?? channel}
                                        checked={notifyForm.data.preferences[rowIndex]?.channels.includes(channel) ?? false}
                                        onChange={() => toggleChannel(rowIndex, channel)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <Button type="submit" loading={notifyForm.processing}>
                    Сохранить уведомления
                </Button>
            </form>

            {assistant_leads.enabled ? (
                <form className="card stack" onSubmit={saveAssistant}>
                    <h2 className="card-title">Лиды AI-ассистента</h2>
                    <p className="text-sm text-muted">
                        Если включено, филиал может получать рассылку заявок от ассистента на сайте (первый принявший забирает лид).
                    </p>
                    {assistant_leads.can_manage ? (
                        <>
                            <Check
                                label="Принимать лиды ассистента для текущего филиала"
                                checked={assistantForm.data.accepts_assistant_leads}
                                onChange={(e) => assistantForm.setData('accepts_assistant_leads', e.target.checked)}
                            />
                            <Button type="submit" loading={assistantForm.processing}>
                                Сохранить
                            </Button>
                        </>
                    ) : (
                        <Alert tone="info">
                            {assistant_leads.accepts ? 'Приём лидов включён.' : 'Приём лидов выключен.'} Изменить может владелец или администратор.
                        </Alert>
                    )}
                </form>
            ) : (
                <div className="card stack text-sm text-muted">
                    <h2 className="card-title">Лиды AI-ассистента</h2>
                    <p>Подключите тариф с функцией «Лиды ассистента», чтобы участвовать в рассылке заявок.</p>
                </div>
            )}
        </div>
    );
}
