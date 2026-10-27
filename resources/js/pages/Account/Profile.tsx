import { router, useForm, usePage } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import { PageHead } from '@/components/Dash';
import { SocialOAuthButtons } from '@/components/auth/SocialOAuthButtons';
import { Button } from '@/components/ui/Button';
import { Check, PhoneField, SelectField, TextField } from '@/components/ui/Fields';
import { Alert } from '@/components/ui/Misc';
import { subscribeToWebPush, unsubscribeFromWebPush } from '@/lib/web-push';

type NotificationPrefRow = {
    key: string;
    label: string;
    channels: string[];
    available: string[];
};

const providerLabels: Record<string, string> = {
    yandex: 'Яндекс ID',
    vk: 'VK ID',
    max: 'MAX',
};

export default function Profile({
    profile,
    cities,
    social_accounts,
    notification_preferences,
    web_push_subscribed,
    notification_channel_labels,
    clinic_follows,
    recent_deliveries,
}: {
    profile: {
        name: string;
        email: string;
        pending_email: string | null;
        phone: string | null;
        city_id: number | null;
        notify_email: boolean;
        notify_leads: boolean;
        consent_at: string | null;
        consent_version: string | null;
        has_password: boolean;
        placeholder_email: boolean;
    };
    cities: { id: number; name: string }[];
    social_accounts: { provider: string; name: string | null; email: string | null; linked_at: string | null; can_unlink: boolean }[];
    notification_preferences: NotificationPrefRow[];
    web_push_subscribed: boolean;
    notification_channel_labels: Record<string, string>;
    clinic_follows: { id: number; name: string; slug: string; channels: string[]; subscribed_at: string }[];
    recent_deliveries: { channel: string; event_label: string; status: string; at: string | null }[];
}) {
    const { webpush } = usePage<{ webpush?: { public_key: string } | null }>().props;
    const [pushBusy, setPushBusy] = useState(false);
    const [pushOn, setPushOn] = useState(web_push_subscribed);

    const notifyForm = useForm({
        preferences: notification_preferences.map((row) => ({ key: row.key, channels: [...row.channels] })),
    });

    const form = useForm({
        name: profile.name,
        phone: profile.phone ?? '',
        city_id: profile.city_id ?? '',
        notify_email: profile.notify_email,
        notify_leads: profile.notify_leads,
    });
    const pwd = useForm({ current_password: '', password: '', password_confirmation: '' });
    const emailForm = useForm({ email: profile.pending_email ?? '', password: '' });
    const del = useForm({ password: '' });

    const save = (e: FormEvent) => {
        e.preventDefault();
        form.put('/account/profile');
    };
    const savePwd = (e: FormEvent) => {
        e.preventDefault();
        pwd.put('/account/password', { onSuccess: () => pwd.reset() });
    };
    const saveEmail = (e: FormEvent) => {
        e.preventDefault();
        emailForm.post('/account/email', { onSuccess: () => emailForm.reset('password') });
    };

    const linked = new Set(social_accounts.map((a) => a.provider));

    const toggleNotifyChannel = (rowIndex: number, channel: string) => {
        const row = notifyForm.data.preferences[rowIndex];
        const has = row.channels.includes(channel);
        const channels = has ? row.channels.filter((c) => c !== channel) : [...row.channels, channel];
        const next = [...notifyForm.data.preferences];
        next[rowIndex] = { ...row, channels: channel === 'in_app' ? channels.includes('in_app') ? channels : ['in_app', ...channels] : channels };
        notifyForm.setData('preferences', next);
    };

    const saveNotify = (e: FormEvent) => {
        e.preventDefault();
        notifyForm.put('/account/notification-preferences');
    };

    const togglePush = async () => {
        if (!webpush?.public_key) {
            return;
        }
        setPushBusy(true);
        try {
            if (pushOn) {
                await unsubscribeFromWebPush();
                setPushOn(false);
            } else {
                const ok = await subscribeToWebPush(webpush.public_key);
                setPushOn(ok);
            }
        } finally {
            setPushBusy(false);
        }
    };

    return (
        <div className="stack-lg">
            <PageHead title="Профиль" text={`Согласие на обработку данных: ${profile.consent_at ?? 'не получено'} (${profile.consent_version ?? '—'}).`} />
            <form className="card stack" onSubmit={save}>
                <h2 className="card-title">Контакты</h2>
                <TextField label="Имя" required autoComplete="name" maxLength={60} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} />
                <TextField
                    label="E-mail"
                    value={profile.placeholder_email ? 'Не указан (вход через соцсеть)' : profile.email}
                    disabled
                    hint={profile.pending_email ? `Ожидает подтверждения: ${profile.pending_email}` : profile.placeholder_email ? 'Добавьте e-mail в блоке ниже.' : 'Смена e-mail — в блоке ниже.'}
                />
                <PhoneField label="Телефон" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} error={form.errors.phone} />
                <SelectField label="Город" value={form.data.city_id} onChange={(e) => form.setData('city_id', e.target.value)}>
                    <option value="">Не выбран</option>
                    {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </SelectField>
                <Check label="Письма на почту" checked={form.data.notify_email} onChange={(e) => form.setData('notify_email', e.target.checked)} />
                <Check label="Уведомления о заявках" checked={form.data.notify_leads} onChange={(e) => form.setData('notify_leads', e.target.checked)} />
                <Button type="submit" loading={form.processing}>
                    Сохранить
                </Button>
            </form>

            <form className="card stack" onSubmit={saveNotify}>
                <h2 className="card-title">Уведомления о записях</h2>
                <p className="text-sm text-muted">Выберите каналы для каждого типа события. «На сайте» всегда включено.</p>
                {webpush?.public_key ? (
                    <div className="row row--wrap row--between">
                        <span className="text-sm">Push в браузере {pushOn ? 'подключён' : 'не подключён'}</span>
                        <Button type="button" variant="outline" size="sm" loading={pushBusy} onClick={togglePush}>
                            {pushOn ? 'Отключить push' : 'Включить push'}
                        </Button>
                    </div>
                ) : null}
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
                                        disabled={channel === 'in_app'}
                                        onChange={() => toggleNotifyChannel(rowIndex, channel)}
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

            {recent_deliveries.length > 0 ? (
                <div className="card stack">
                    <h2 className="card-title">Последние отправки</h2>
                    <p className="text-sm text-muted">Журнал доставки уведомлений по каналам (email, MAX, push).</p>
                    <ul className="stack text-sm">
                        {recent_deliveries.map((row, i) => (
                            <li key={i} className="row row--wrap row--between">
                                <span>
                                    {row.event_label} · {notification_channel_labels[row.channel] ?? row.channel}
                                </span>
                                <span className="text-muted">
                                    {row.status === 'sent' ? 'доставлено' : row.status === 'failed' ? 'ошибка' : row.status}
                                    {row.at ? ` · ${row.at}` : ''}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {clinic_follows.length > 0 ? (
                <div className="card stack">
                    <h2 className="card-title">Подписки на клиники</h2>
                    {clinic_follows.map((f) => (
                        <div key={f.id} className="row row--between row--wrap">
                            <div>
                                <strong>{f.name}</strong>
                                <p className="text-sm text-muted">с {f.subscribed_at}</p>
                            </div>
                            <Button type="button" variant="outline" size="sm" onClick={() => router.delete(`/account/clinic-follows/${f.id}`)}>
                                Отписаться
                            </Button>
                        </div>
                    ))}
                </div>
            ) : null}

            {(profile.has_password || profile.placeholder_email) && (
                <form className="card stack" onSubmit={saveEmail}>
                    <h2 className="card-title">{profile.placeholder_email ? 'Добавить e-mail' : 'Смена e-mail'}</h2>
                    {profile.placeholder_email && <Alert tone="info">VK ID часто не передаёт почту. Укажите свой e-mail — пришлём ссылку для подтверждения.</Alert>}
                    <TextField label="E-mail" type="email" autoComplete="email" required value={emailForm.data.email} onChange={(e) => emailForm.setData('email', e.target.value)} error={emailForm.errors.email} />
                    {profile.has_password && (
                        <TextField label="Текущий пароль" type="password" autoComplete="current-password" required value={emailForm.data.password} onChange={(e) => emailForm.setData('password', e.target.value)} error={emailForm.errors.password} />
                    )}
                    <Button type="submit" variant="dark" loading={emailForm.processing}>
                        Отправить подтверждение
                    </Button>
                </form>
            )}

            <div className="card stack">
                <h2 className="card-title">Привязанные входы</h2>
                {social_accounts.length === 0 && <p className="text-muted text-sm">Пока только пароль или вход не настроен.</p>}
                {social_accounts.map((acc) => (
                    <div key={acc.provider} className="oauth-linked">
                        <div>
                            <strong>{providerLabels[acc.provider] ?? acc.provider}</strong>
                            <p className="text-sm text-muted">{acc.email ?? acc.name ?? 'Привязано'} · {acc.linked_at ?? '—'}</p>
                        </div>
                        {acc.can_unlink ? (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (confirm('Отвязать этот способ входа?')) {
                                        router.delete(`/account/social/${acc.provider}`);
                                    }
                                }}
                            >
                                Отвязать
                            </Button>
                        ) : (
                            <span className="text-sm text-muted">Единственный вход</span>
                        )}
                    </div>
                ))}
                <SocialOAuthButtons
                    showHeading={false}
                    providers={(['yandex', 'vk', 'max'] as const).filter((key) => !linked.has(key))}
                />
            </div>

            <form className="card stack" onSubmit={savePwd}>
                <h2 className="card-title">Пароль</h2>
                {!profile.has_password && <Alert tone="info">У вас вход только через соцсеть. Задайте пароль, чтобы отвязать провайдеры при необходимости.</Alert>}
                {profile.has_password && (
                    <TextField label="Текущий пароль" type="password" autoComplete="current-password" value={pwd.data.current_password} onChange={(e) => pwd.setData('current_password', e.target.value)} error={pwd.errors.current_password} />
                )}
                <TextField label="Новый пароль" type="password" autoComplete="new-password" value={pwd.data.password} onChange={(e) => pwd.setData('password', e.target.value)} error={pwd.errors.password} />
                <TextField label="Повторите пароль" type="password" autoComplete="new-password" value={pwd.data.password_confirmation} onChange={(e) => pwd.setData('password_confirmation', e.target.value)} />
                <Button type="submit" variant="dark" loading={pwd.processing}>
                    Обновить пароль
                </Button>
            </form>
            <form
                className="card stack"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (confirm('Удалить аккаунт и персональные данные? Это нельзя отменить.')) del.delete('/account');
                }}
            >
                <h2 className="card-title">Удаление аккаунта</h2>
                <Alert tone="warning">Диагнозы и медицинские документы через сервис не собираются. Удаление стирает профиль, заявки и отзывы.</Alert>
                <TextField label="Пароль для подтверждения" type="password" value={del.data.password} onChange={(e) => del.setData('password', e.target.value)} error={del.errors.password} />
                <Button type="submit" variant="danger" loading={del.processing}>
                    Удалить аккаунт
                </Button>
            </form>
        </div>
    );
}
