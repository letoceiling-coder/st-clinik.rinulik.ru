import { Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Check, TextField } from '@/components/ui/Fields';

export default function Login() {
    const form = useForm({ email: '', password: '', remember: false });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/login', { onFinish: () => form.reset('password') });
    };

    return (
        <form onSubmit={submit} className="auth-card card card--shadow stack" noValidate>
            <div>
                <h1 className="auth-card__title">Вход</h1>
                <p className="text-muted">Для пациентов, клиник и сотрудников сервиса.</p>
            </div>
            <TextField label="E-mail" type="email" autoComplete="email" required value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} />
            <TextField label="Пароль" type="password" autoComplete="current-password" required value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} error={form.errors.password} />
            <Check label="Запомнить меня" checked={form.data.remember} onChange={(e) => form.setData('remember', e.target.checked)} />
            <Button type="submit" block size="lg" loading={form.processing}>
                Войти
            </Button>
            <p className="text-sm text-center">
                Нет аккаунта?{' '}
                <Link href="/register" className="link">
                    Зарегистрироваться
                </Link>
            </p>
        </form>
    );
}
