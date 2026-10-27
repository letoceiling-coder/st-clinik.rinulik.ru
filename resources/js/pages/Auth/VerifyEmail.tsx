import { Link, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { Button, LinkButton } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Misc';

export default function VerifyEmail({
    status,
    email,
    placeholder_email,
}: {
    status?: string;
    email?: string;
    placeholder_email?: boolean;
}) {
    const form = useForm({});

    const resend = (e: FormEvent) => {
        e.preventDefault();
        form.post('/email/verification-notification');
    };

    if (placeholder_email) {
        return (
            <div className="auth-card card card--shadow stack">
                <div>
                    <h1 className="auth-card__title">E-mail не указан</h1>
                    <p className="text-muted">
                        Вход через соцсеть выполнен без адреса почты (так бывает у VK ID). Личный кабинет уже доступен — добавьте реальный e-mail в профиле для
                        восстановления доступа и писем.
                    </p>
                </div>
                <LinkButton href="/account/profile" variant="dark" block>
                    Перейти в профиль
                </LinkButton>
                <p className="text-sm text-center">
                    <Link href="/logout" method="post" as="button" className="link">
                        Выйти
                    </Link>
                </p>
            </div>
        );
    }

    return (
        <div className="auth-card card card--shadow stack">
            <div>
                <h1 className="auth-card__title">Подтвердите e-mail</h1>
                <p className="text-muted">
                    Мы отправили письмо на <strong>{email}</strong>. Без подтверждения личный кабинет недоступен.
                </p>
            </div>
            {status === 'verification-link-sent' && <Alert tone="success">Новое письмо отправлено.</Alert>}
            <form onSubmit={resend}>
                <Button type="submit" block loading={form.processing}>
                    Отправить письмо ещё раз
                </Button>
            </form>
            <p className="text-sm text-center">
                <Link href="/logout" method="post" as="button" className="link">
                    Выйти
                </Link>
            </p>
        </div>
    );
}
