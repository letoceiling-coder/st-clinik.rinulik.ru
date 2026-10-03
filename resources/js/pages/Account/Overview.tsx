import { Link } from '@inertiajs/react';
import { Kpis, PageHead, StatusBadge } from '@/components/Dash';
import { LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Misc';

interface Lead {
    id: number;
    status: string;
    status_label: string;
    clinic: { name: string; slug: string; address: string } | null;
    service?: string | null;
    created_at: string | null;
}

interface Note {
    id: number;
    title: string;
    body: string | null;
    url: string | null;
    read: boolean;
    at: string | null;
}

export default function Overview({
    counts,
    leads,
    notifications,
}: {
    counts: { leads: number; active_leads: number; favorites: number; compare: number; reviews: number; unread: number };
    leads: Lead[];
    notifications: Note[];
}) {
    return (
        <div className="stack-lg">
            <PageHead title="Личный кабинет" text="Заявки, избранное и отзывы в одном месте." />
            <Kpis
                items={[
                    { label: 'Активные записи', value: counts.active_leads },
                    { label: 'Избранное', value: counts.favorites },
                    { label: 'Сравнение', value: counts.compare },
                    { label: 'Мои отзывы', value: counts.reviews },
                    { label: 'Непрочитанные', value: counts.unread },
                ]}
            />
            <section className="card stack">
                <div className="row row--between">
                    <h2 className="card-title" style={{ margin: 0 }}>Последние заявки</h2>
                    <Link href="/account/leads" className="link">Все заявки</Link>
                </div>
                {leads.length === 0 ? (
                    <EmptyState title="Заявок пока нет" text="Найдите клинику и отправьте заявку на приём." action={<LinkButton href="/">На главную</LinkButton>} />
                ) : (
                    <ul className="stack">
                        {leads.map((l) => (
                            <li key={l.id} className="row row--between">
                                <div>
                                    <b>{l.clinic?.name ?? 'Клиника'}</b>
                                    <div className="text-sm text-muted">{l.service ?? l.clinic?.address} · {l.created_at}</div>
                                </div>
                                <StatusBadge status={l.status} />
                            </li>
                        ))}
                    </ul>
                )}
            </section>
            <section className="card stack">
                <div className="row row--between">
                    <h2 className="card-title" style={{ margin: 0 }}>Уведомления</h2>
                    <Link href="/account/notifications" className="link">Все</Link>
                </div>
                {notifications.length === 0 ? <p className="text-muted">Пока тихо.</p> : notifications.map((n) => (
                    <Link key={n.id} href={n.url || '/account/notifications'} className="stack" style={{ opacity: n.read ? 0.7 : 1 }}>
                        <b>{n.title}</b>
                        <span className="text-sm text-muted">{n.body} · {n.at}</span>
                    </Link>
                ))}
            </section>
        </div>
    );
}
