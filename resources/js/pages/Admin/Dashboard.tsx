import { Link } from '@inertiajs/react';
import { Kpis, PageHead } from '@/components/Dash';

export default function Dashboard({
    kpi,
    queue,
    audit,
}: {
    kpi: { users: number; clinics: number; doctors: number; reviews: number; leads_30d: number; complaints: number };
    queue: { clinics: number; doctors: number; photos: number; documents: number; reviews: number; total: number };
    audit: { id: number; action: string; user: string; at: string | null }[];
}) {
    return (
        <div className="stack-lg">
            <PageHead title="Админ-панель" text="Очередь модерации и ключевые метрики прототипа." />
            <Kpis
                items={[
                    { label: 'Пользователи', value: kpi.users },
                    { label: 'Клиники', value: kpi.clinics },
                    { label: 'Врачи', value: kpi.doctors },
                    { label: 'Отзывы', value: kpi.reviews },
                    { label: 'Заявки 30 дн.', value: kpi.leads_30d },
                    { label: 'Жалобы', value: kpi.complaints },
                ]}
            />
            <section className="card stack">
                <div className="row row--between">
                    <h2 className="card-title" style={{ margin: 0 }}>Очередь · {queue.total}</h2>
                    <Link href="/admin/moderation" className="link">Открыть</Link>
                </div>
                <div className="kpi-grid">
                    {(['clinics', 'doctors', 'photos', 'documents', 'reviews'] as const).map((k) => (
                        <div key={k} className="kpi card card--muted"><dt>{k}</dt><dd>{queue[k]}</dd></div>
                    ))}
                </div>
            </section>
            <section className="card stack">
                <h2 className="card-title">Последний аудит</h2>
                {audit.map((a) => (
                    <div key={a.id} className="row row--between">
                        <span>{a.action} · {a.user}</span>
                        <span className="text-xs text-muted">{a.at}</span>
                    </div>
                ))}
            </section>
        </div>
    );
}
