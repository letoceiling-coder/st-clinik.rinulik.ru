import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check, SelectField, TextField } from '@/components/ui/Fields';
import { Alert } from '@/components/ui/Misc';

export default function Profile({
    profile,
    cities,
}: {
    profile: { name: string; email: string; phone: string | null; city_id: number | null; notify_email: boolean; notify_leads: boolean; consent_at: string | null; consent_version: string | null };
    cities: { id: number; name: string }[];
}) {
    const form = useForm({
        name: profile.name,
        phone: profile.phone ?? '',
        city_id: profile.city_id ?? '',
        notify_email: profile.notify_email,
        notify_leads: profile.notify_leads,
    });
    const pwd = useForm({ current_password: '', password: '', password_confirmation: '' });
    const del = useForm({ password: '' });

    const save = (e: FormEvent) => {
        e.preventDefault();
        form.put('/account/profile');
    };
    const savePwd = (e: FormEvent) => {
        e.preventDefault();
        pwd.put('/account/password', { onSuccess: () => pwd.reset() });
    };

    return (
        <div className="stack-lg">
            <PageHead title="Профиль" text={`Согласие на обработку данных: ${profile.consent_at ?? 'не получено'} (${profile.consent_version ?? '—'}).`} />
            <form className="card stack" onSubmit={save}>
                <h2 className="card-title">Контакты</h2>
                <TextField label="Имя" required value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} />
                <TextField label="E-mail" value={profile.email} disabled hint="Почта не меняется в прототипе." />
                <TextField label="Телефон" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} error={form.errors.phone} />
                <SelectField label="Город" value={form.data.city_id} onChange={(e) => form.setData('city_id', e.target.value)}>
                    <option value="">Не выбран</option>
                    {cities.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </SelectField>
                <Check label="Письма на почту" checked={form.data.notify_email} onChange={(e) => form.setData('notify_email', e.target.checked)} />
                <Check label="Уведомления о заявках" checked={form.data.notify_leads} onChange={(e) => form.setData('notify_leads', e.target.checked)} />
                <Button type="submit" loading={form.processing}>Сохранить</Button>
            </form>
            <form className="card stack" onSubmit={savePwd}>
                <h2 className="card-title">Пароль</h2>
                <TextField label="Текущий пароль" type="password" value={pwd.data.current_password} onChange={(e) => pwd.setData('current_password', e.target.value)} error={pwd.errors.current_password} />
                <TextField label="Новый пароль" type="password" value={pwd.data.password} onChange={(e) => pwd.setData('password', e.target.value)} error={pwd.errors.password} />
                <TextField label="Повторите пароль" type="password" value={pwd.data.password_confirmation} onChange={(e) => pwd.setData('password_confirmation', e.target.value)} />
                <Button type="submit" variant="dark" loading={pwd.processing}>Обновить пароль</Button>
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
                <Button type="submit" variant="danger" loading={del.processing}>Удалить аккаунт</Button>
            </form>
        </div>
    );
}
