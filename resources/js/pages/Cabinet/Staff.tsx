import { router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { PhoneField, SelectField, TextField } from '@/components/ui/Fields';

export default function Staff({
    members,
    invitations,
    roles,
    can_manage,
    sms_invites_enabled,
}: {
    members: { id: number; role_label: string; name: string | null; email: string | null }[];
    invitations: { id: number; email: string | null; phone: string | null; role_label: string; expires_at: string }[];
    roles: Record<string, string>;
    can_manage: boolean;
    sms_invites_enabled: boolean;
}) {
    const form = useForm({ email: '', phone: '', role: 'manager' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/clinic-cabinet/staff/invite', { onSuccess: () => form.reset() });
    };

    return (
        <>
            <PageHead title="Сотрудники" />
            <div className="stack">
                <div className="card stack">
                    <h2 className="card-title">Команда</h2>
                    <ul className="stack text-sm">
                        {members.map((m) => (
                            <li key={m.id} className="row row--between row--wrap">
                                <span>
                                    {m.name} · {m.email} · {m.role_label}
                                </span>
                                {can_manage ? (
                                    <Button type="button" variant="outline" size="sm" onClick={() => router.delete(`/clinic-cabinet/staff/${m.id}`)}>
                                        Отозвать
                                    </Button>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                </div>
                {can_manage ? (
                    <form className="card stack" onSubmit={submit}>
                        <h2 className="card-title">Пригласить</h2>
                        <TextField label="E-mail" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} />
                        <PhoneField label="Телефон" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} error={form.errors.phone} />
                        {!sms_invites_enabled ? (
                            <p className="text-xs text-muted">SMS не настроен — по телефону ссылку нужно будет передать вручную.</p>
                        ) : null}
                        <SelectField label="Роль" value={form.data.role} onChange={(e) => form.setData('role', e.target.value)}>
                            {Object.entries(roles).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </SelectField>
                        <Button type="submit" loading={form.processing}>
                            Отправить приглашение
                        </Button>
                    </form>
                ) : null}
                {invitations.length > 0 ? (
                    <div className="card stack text-sm">
                        <h2 className="card-title">Ожидают принятия</h2>
                        {invitations.map((i) => (
                            <div key={i.id}>
                                {i.email ?? i.phone} · {i.role_label} · до {i.expires_at}
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>
        </>
    );
}
