import { Link, router } from '@inertiajs/react';
import { PageHead, PagerSafe } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Misc';
import type { Paginated } from '@/lib/types';

interface Note { id: number; title: string; body: string | null; url: string | null; read: boolean; at: string | null }

export default function Notifications({ notifications }: { notifications: Paginated<Note> }) {
    return (
        <div className="stack-lg">
            <PageHead
                title="Уведомления"
                action={<Button size="sm" variant="secondary" onClick={() => router.post('/account/notifications/read-all')}>Прочитать все</Button>}
            />
            {notifications.data.length === 0 ? <EmptyState title="Уведомлений нет" /> : (
                <ul className="stack">
                    {notifications.data.map((n) => (
                        <li key={n.id} className="card">
                            <div className="row row--between">
                                <div>
                                    <b>{n.title}</b>
                                    <p className="text-sm text-muted">{n.body} · {n.at}</p>
                                </div>
                                {!n.read ? <Button size="sm" variant="ghost" onClick={() => router.post(`/account/notifications/${n.id}/read`)}>Прочитано</Button> : null}
                            </div>
                            {n.url ? <Link href={n.url} className="link">Открыть</Link> : null}
                        </li>
                    ))}
                </ul>
            )}
            <PagerSafe page={notifications} />
        </div>
    );
}
