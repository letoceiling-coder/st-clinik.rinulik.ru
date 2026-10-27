import { Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/Button';

export default function AcceptStaffInvite({ email, phone, organization, role, token }: { email: string | null; phone: string | null; organization: string | null; role: string; token: string }) {
    return (
        <div className="auth-card card card--shadow stack">
            <h1 className="auth-card__title">Приглашение в организацию</h1>
            <p className="text-muted">
                {organization ?? 'Клиника'} · роль: {role}
                {email ? ` · ${email}` : phone ? ` · ${phone}` : ''}
            </p>
            <Button type="button" onClick={() => router.post(`/invite/staff/${token}`)}>
                Принять приглашение
            </Button>
            <Link href="/login" className="text-sm link">
                Сначала войти в другой аккаунт
            </Link>
        </div>
    );
}
