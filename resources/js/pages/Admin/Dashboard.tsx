import { Link, usePage } from '@inertiajs/react';
import { Kpis, PageHead, STATUS, type KpiItem } from '@/components/Dash';
import Icon from '@/components/Icon';
import { can } from '@/lib/auth';
import type { SharedProps } from '@/lib/types';

/** Типы очереди модерации: ключ из контроллера, название и тип для фильтра на странице модерации. */
const QUEUE_TYPES = [
    { key: 'clinics', label: 'Клиники', type: 'clinic' },
    { key: 'doctors', label: 'Врачи', type: 'doctor' },
    { key: 'photos', label: 'Фото', type: 'photo' },
    { key: 'documents', label: 'Документы', type: 'document' },
    { key: 'reviews', label: 'Отзывы', type: 'review' },
] as const;

export default function Dashboard({
    kpi,
    queue,
    audit,
    clinics_by_status,
}: {
    kpi: {
        users: number;
        users_new_30d: number;
        clinics: number;
        clinics_total: number;
        doctors: number;
        reviews: number;
        leads_30d: number;
        complaints: number;
        appointments_upcoming: number;
        appointments_30d: number;
        revenue_30d: number;
        active_promotions: number;
    };
    queue: { clinics: number; doctors: number; photos: number; documents: number; reviews: number; total: number };
    audit: { id: number; action: string; user: string; at: string | null }[];
    clinics_by_status: Record<string, number>;
}) {
    const user = usePage<SharedProps>().props.auth?.user;
    const linkIf = (permission: string, href: string): string | undefined => (can(user, permission) ? href : undefined);
    const revenueRub = Math.round(kpi.revenue_30d / 100);

    const kpis: KpiItem[] = [
        { label: 'Пользователи', value: kpi.users, hint: `+${kpi.users_new_30d} за 30 дн.`, href: linkIf('admin.users', '/admin/users') },
        { label: 'Клиники в каталоге', value: kpi.clinics, hint: `всего ${kpi.clinics_total}`, href: linkIf('admin.clinics', '/admin/clinics?status=published') },
        { label: 'Врачи', value: kpi.doctors, href: linkIf('admin.doctors', '/admin/doctors') },
        { label: 'Записи (30 дн.)', value: kpi.appointments_30d, hint: `предстоящих: ${kpi.appointments_upcoming}`, href: linkIf('admin.appointments', '/admin/appointments') },
        { label: 'Выручка 30 дн.', value: `${revenueRub.toLocaleString('ru-RU')} ₽`, href: linkIf('admin.finance', '/admin/finance') },
        { label: 'Активная реклама', value: kpi.active_promotions, href: linkIf('admin.promotions', '/admin/promotions') },
        { label: 'Заявки 30 дн.', value: kpi.leads_30d, href: linkIf('admin.analytics', '/admin/analytics') },
        { label: 'Жалобы', value: kpi.complaints, href: linkIf('admin.complaints', '/admin/complaints') },
    ];

    const statuses: KpiItem[] = Object.entries(clinics_by_status).map(([status, count]) => ({
        label: STATUS[status]?.label ?? 'Другой статус',
        value: count,
        href: linkIf('admin.clinics', `/admin/clinics?status=${status}`),
    }));

    const queueItems: KpiItem[] = QUEUE_TYPES.map((t) => ({
        label: t.label,
        value: queue[t.key],
        href: linkIf('admin.moderation', `/admin/moderation?type=${t.type}`),
    }));

    return (
        <div className="stack-lg">
            <PageHead title="Админ-панель" text="Метрики платформы, модерация и быстрые ссылки." />
            <Kpis items={kpis} />
            <nav className="quick-links" aria-label="Быстрые ссылки">
                <Link href="/admin/appointments" className="quick-links__item">
                    <Icon name="calendar" size={18} />
                    Все записи
                </Link>
                <Link href="/admin/reports" className="quick-links__item">
                    <Icon name="file" size={18} />
                    Отчёты CSV
                </Link>
                <Link href="/admin/finance" className="quick-links__item">
                    <Icon name="ruble" size={18} />
                    Финансы
                </Link>
            </nav>
            <section className="card stack">
                <h2 className="card-title">Клиники по статусам</h2>
                <Kpis items={statuses} muted balanced={false} />
            </section>
            <section className="card stack">
                <div className="row row--between">
                    <h2 className="card-title" style={{ margin: 0 }}>
                        Очередь модерации · {queue.total}
                    </h2>
                    <Link href="/admin/moderation" className="link">
                        Открыть
                    </Link>
                </div>
                <Kpis items={queueItems} muted balanced={false} />
            </section>
            {audit.length > 0 ? (
                <section className="card stack">
                    <div className="row row--between">
                        <h2 className="card-title" style={{ margin: 0 }}>
                            Последние действия
                        </h2>
                        <Link href="/admin/audit" className="link">
                            Журнал
                        </Link>
                    </div>
                    {audit.map((a) => (
                        <div key={a.id} className="row row--between">
                            <span>
                                {a.action} · {a.user}
                            </span>
                            <span className="text-xs text-muted">{a.at}</span>
                        </div>
                    ))}
                </section>
            ) : null}
        </div>
    );
}
