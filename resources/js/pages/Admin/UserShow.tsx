import { Link, useForm } from '@inertiajs/react';
import { PageHead, StatusBadge } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Fields';

export default function UserShow({
    user,
    stats,
    reviews,
    appointments,
    audit,
    roles,
}: {
    user: { id: number; name: string; email: string; phone: string | null; role: string; status: string; created_at: string | null; last_login_at: string | null };
    stats: { reviews: number; appointments: number };
    reviews: { id: number; rating: number; status: string; created_at: string | null }[];
    appointments: { id: number; starts_at: string | null; status: string; clinic: string | null }[];
    audit: { action: string; at: string | null }[];
    roles: { slug: string; name: string }[];
}) {
    const form = useForm({ role: user.role, status: user.status });

    return (
        <div className="stack-lg">
            <PageHead title={user.name} text={`${user.email} · регистрация ${user.created_at ?? '—'}`} />
            <p className="text-sm">
                <Link href="/admin/users" className="link">
                    ← К списку
                </Link>
            </p>
            <div className="kpi-grid">
                <div className="kpi card">
                    <dt>Отзывы</dt>
                    <dd>{stats.reviews}</dd>
                </div>
                <div className="kpi card">
                    <dt>Записи</dt>
                    <dd>{stats.appointments}</dd>
                </div>
            </div>
            <form
                className="card stack"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.put(`/admin/users/${user.id}`);
                }}
            >
                <h2 className="card-title">Роль и доступ</h2>
                <SelectField label="Роль" value={form.data.role} onChange={(e) => form.setData('role', e.target.value)}>
                    {roles.map((r) => (
                        <option key={r.slug} value={r.slug}>
                            {r.name}
                        </option>
                    ))}
                </SelectField>
                <SelectField label="Статус" value={form.data.status} onChange={(e) => form.setData('status', e.target.value)}>
                    <option value="active">Активен</option>
                    <option value="blocked">Заблокирован</option>
                </SelectField>
                <Button type="submit" loading={form.processing}>
                    Сохранить
                </Button>
            </form>
            <section className="card stack">
                <h2 className="card-title">Последние отзывы</h2>
                {reviews.map((r) => (
                    <div key={r.id} className="row row--between">
                        <span>
                            {r.rating}★ · {r.created_at}
                        </span>
                        <StatusBadge status={r.status} />
                    </div>
                ))}
            </section>
            <section className="card stack">
                <h2 className="card-title">Записи</h2>
                {appointments.map((a) => (
                    <div key={a.id} className="row row--between">
                        <span>
                            {a.starts_at} · {a.clinic ?? '—'}
                        </span>
                        <StatusBadge status={a.status} />
                    </div>
                ))}
            </section>
            <section className="card stack">
                <h2 className="card-title">Активность (аудит)</h2>
                {audit.map((a, i) => (
                    <div key={i} className="row row--between text-sm">
                        <span>{a.action}</span>
                        <span className="text-muted">{a.at}</span>
                    </div>
                ))}
            </section>
        </div>
    );
}
