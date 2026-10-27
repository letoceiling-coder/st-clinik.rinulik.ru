import { Link } from '@inertiajs/react';
import { Kpis, PageHead, STATUS } from '@/components/Dash';
import Icon from '@/components/Icon';

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
    const revenueRub = Math.round(kpi.revenue_30d / 100);

    return (
        <div className="stack-lg">
            <PageHead title="Админ-панель" text="Метрики платформы, модерация и быстрые ссылки." />
            <Kpis
                items={[
                    { label: 'Пользователи', value: kpi.users, hint: `+${kpi.users_new_30d} за 30 дн.` },
                    { label: 'Клиники в каталоге', value: kpi.clinics, hint: `всего ${kpi.clinics_total}` },
                    { label: 'Врачи', value: kpi.doctors },
                    { label: 'Записи (30 дн.)', value: kpi.appointments_30d, hint: `предстоящих: ${kpi.appointments_upcoming}` },
                    { label: 'Выручка 30 дн.', value: `${revenueRub.toLocaleString('ru-RU')} ₽` },
                    { label: 'Активная реклама', value: kpi.active_promotions },
                    { label: 'Заявки 30 дн.', value: kpi.leads_30d },
                    { label: 'Жалобы', value: kpi.complaints },
                ]}
            />
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
                <div className="kpi-grid">
                    {Object.entries(clinics_by_status).map(([status, count]) => (
                        <div key={status} className="kpi card card--muted">
                            <dt>{STATUS[status]?.label ?? status}</dt>
                            <dd>{count}</dd>
                        </div>
                    ))}
                </div>
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
                <div className="kpi-grid">
                    {(['clinics', 'doctors', 'photos', 'documents', 'reviews'] as const).map((k) => (
                        <div key={k} className="kpi card card--muted">
                            <dt>{k}</dt>
                            <dd>{queue[k]}</dd>
                        </div>
                    ))}
                </div>
            </section>
            <section className="card stack">
                <div className="row row--between">
                    <h2 className="card-title" style={{ margin: 0 }}>
                        Последний аудит
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
        </div>
    );
}
