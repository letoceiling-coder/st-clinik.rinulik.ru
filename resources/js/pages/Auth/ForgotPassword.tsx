import { Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Fields';
import { Alert } from '@/components/ui/Misc';

export default function ForgotPassword() {
    const form = useForm({ email: '' });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/forgot-password');
    };

    return (
        <form onSubmit={submit} className="auth-card card card--shadow stack" noValidate>
            <div>
                <h1 className="auth-card__title">Забыли пароль?</h1>
                <p className="text-muted">Укажите e-mail — отправим ссылку для сброса пароля.</p>
            </div>
            {form.recentlySuccessful && <Alert tone="success">Если аккаунт существует, письмо уже отправлено.</Alert>}
            <TextField label="E-mail" type="email" autoComplete="email" required value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} />
            <Button type="submit" block size="lg" loading={form.processing}>
                Отправить ссылку
            </Button>
            <p className="text-sm text-center">
                <Link href="/login" className="link">
                    Вернуться ко входу
                </Link>
            </p>
        </form>
    );
}
