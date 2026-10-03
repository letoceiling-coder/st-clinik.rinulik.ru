import { Link } from '@inertiajs/react';
import { Kpis, PageHead, StatusBadge } from '@/components/Dash';
import { LinkButton } from '@/components/ui/Button';
import { Alert, EmptyState } from '@/components/ui/Misc';

export default function Dashboard({
    completeness,
    kpi,
    moderation,
    recent_leads,
}: {
    completeness: { percent: number; items?: { label: string; done: boolean }[] };
    kpi: { leads_30d: number; leads_new: number; views: number; rating: number; reviews: number; unanswered: number };
    moderation: { clinic: string; clinic_note: string | null; doctors_pending: number; photos_pending: number; documents_pending: number; documents_rejected: number };
    recent_leads: { id: number; name: string; phone: string; status: string; status_label: string; service: string | null; created_at: string | null }[];
}) {
    const percent = completeness.percent ?? 0;
    return (
        <div className="stack-lg">
            <PageHead title="Обзор филиала" text="Полнота профиля влияет на выдачу в каталоге и скорость модерации." />
            {moderation.clinic === 'rejected' ? <Alert tone="danger">Отклонено: {moderation.clinic_note}</Alert> : null}
            {moderation.clinic === 'pending' ? <Alert tone="warning">Филиал на модерации.</Alert> : null}
            <Kpis
                items={[
                    { label: 'Заявки за 30 дней', value: kpi.leads_30d },
                    { label: 'Новые заявки', value: kpi.leads_new },
                    { label: 'Просмотры', value: kpi.views },
                    { label: 'Рейтинг', value: kpi.rating.toFixed(1).replace('.', ',') },
                    { label: 'Отзывы', value: kpi.reviews, hint: kpi.unanswered ? `без ответа: ${kpi.unanswered}` : undefined },
                    { label: 'Заполненность', value: `${percent}%` },
                ]}
            />
            <section className="card stack">
                <h2 className="card-title">Модерация</h2>
                <div className="row row--wrap">
                    <StatusBadge status={moderation.clinic} />
                    <span className="text-sm text-muted">врачи: {moderation.doctors_pending} · фото: {moderation.photos_pending} · документы: {moderation.documents_pending}</span>
                </div>
                {completeness.items?.some((i) => !i.done) ? (
                    <p className="text-sm text-muted">Чтобы улучшить карточку: {completeness.items.filter((i) => !i.done).map((i) => i.label).join(', ')}.</p>
                ) : null}
            </section>
            <section className="card stack">
                <div className="row row--between">
                    <h2 className="card-title" style={{ margin: 0 }}>Последние заявки</h2>
                    <Link href="/clinic-cabinet/leads" className="link">Все заявки</Link>
                </div>
                {recent_leads.length === 0 ? <EmptyState title="Заявок пока нет" /> : recent_leads.map((l) => (
                    <div key={l.id} className="row row--between">
                        <div>
                            <b>{l.name}</b>
                            <div className="text-sm text-muted">{l.service ?? l.phone} · {l.created_at}</div>
                        </div>
                        <StatusBadge status={l.status} />
                    </div>
                ))}
            </section>
            <LinkButton href="/clinic-cabinet/stats" variant="outline">Открыть статистику</LinkButton>
        </div>
    );
}
