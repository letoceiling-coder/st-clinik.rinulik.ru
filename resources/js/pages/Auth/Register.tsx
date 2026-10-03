import { Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Check, TextField } from '@/components/ui/Fields';

export default function Register() {
    const form = useForm({ name: '', email: '', phone: '', password: '', password_confirmation: '', consent: false });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/register', { onFinish: () => form.reset('password', 'password_confirmation') });
    };

    return (
        <form onSubmit={submit} className="auth-card card card--shadow stack" noValidate>
            <div>
                <h1 className="auth-card__title">Регистрация</h1>
                <p className="text-muted">Записи, избранное и отзывы будут в одном месте.</p>
            </div>
            <TextField label="Имя" autoComplete="name" required value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} />
            <TextField label="E-mail" type="email" autoComplete="email" required value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} />
            <TextField label="Телефон" type="tel" autoComplete="tel" placeholder="+7 (900) 000-00-00" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} error={form.errors.phone} hint="Необязательно. Нужен, чтобы клиника могла связаться по заявке." />
            <TextField label="Пароль" type="password" autoComplete="new-password" required value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} error={form.errors.password} hint="Не менее 8 символов, буквы и цифры." />
            <TextField label="Повторите пароль" type="password" autoComplete="new-password" required value={form.data.password_confirmation} onChange={(e) => form.setData('password_confirmation', e.target.value)} error={form.errors.password_confirmation} />
            <Check
                checked={form.data.consent}
                onChange={(e) => form.setData('consent', e.target.checked)}
                error={form.errors.consent}
                label={
                    <>
                        Согласен на обработку персональных данных (
                        <Link href="/consent" className="link">
                            согласие
                        </Link>
                        ) и принимаю{' '}
                        <Link href="/privacy" className="link">
                            политику конфиденциальности
                        </Link>
                    </>
                }
            />
            <Button type="submit" block size="lg" loading={form.processing}>
                Создать аккаунт
            </Button>
            <p className="text-sm text-center">
                Уже есть аккаунт?{' '}
                <Link href="/login" className="link">
                    Войти
                </Link>
            </p>
        </form>
    );
}
