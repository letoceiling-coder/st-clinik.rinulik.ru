import { useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Fields';

const providerLabels: Record<string, string> = {
    yandex: 'Яндекс ID',
    vk: 'VK ID',
    max: 'MAX',
};

export default function LinkSocial({ email, provider }: { email: string; provider: string }) {
    const form = useForm({ password: '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/auth/social/link');
    };

    return (
        <form onSubmit={submit} className="auth-card card card--shadow stack" noValidate>
            <div>
                <h1 className="auth-card__title">Привязать {providerLabels[provider] ?? provider}</h1>
                <p className="text-muted">
                    Аккаунт <strong>{email}</strong> уже зарегистрирован. Введите пароль, чтобы привязать вход через {providerLabels[provider] ?? provider}.
                </p>
            </div>
            <TextField label="Пароль" type="password" autoComplete="current-password" required value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} error={form.errors.password} />
            <Button type="submit" block size="lg" loading={form.processing}>
                Войти и привязать
            </Button>
        </form>
    );
}
