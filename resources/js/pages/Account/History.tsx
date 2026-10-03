import { Link, router } from '@inertiajs/react';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Misc';

interface Entry { id: number; type: string; at: string | null; label: string; sub?: string; url: string; kind: string }

export default function History({ entries }: { entries: Entry[] }) {
    return (
        <div className="stack-lg">
            <PageHead
                title="История просмотров"
                text="Последние клиники, врачи и поисковые запросы."
                action={entries.length ? <Button variant="ghost" size="sm" onClick={() => router.delete('/account/history')}>Очистить</Button> : null}
            />
            {entries.length === 0 ? (
                <EmptyState title="История пуста" />
            ) : (
                <ul className="stack">
                    {entries.map((e) => (
                        <li key={e.id}>
                            <Link href={e.url} className="card card--link">
                                <span className="text-xs text-muted">{e.kind} · {e.at}</span>
                                <b>{e.label}</b>
                                {e.sub ? <div className="text-sm text-muted">{e.sub}</div> : null}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
