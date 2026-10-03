import { Link, router } from '@inertiajs/react';
import { PageHead, StatusBadge } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Misc';

interface Card { id: number; name: string; address: string; phone: string | null; city: string | null; status: string; reviews_count: number; doctors_count: number; slug: string }
interface Pair { key: string; a: Card; b: Card; reasons: string[] }

export default function Duplicates({ pairs }: { pairs: Pair[] }) {
    return (
        <div className="stack-lg">
            <PageHead title="Дубликаты" text="Совпадения по телефону, адресу или названию в городе." />
            {pairs.length === 0 ? <EmptyState title="Подозрительных пар нет" /> : pairs.map((p) => (
                <article key={p.key} className="card stack">
                    <p className="text-sm text-muted">{p.reasons.join(' · ')}</p>
                    <div className="two-col two-col--even">
                        <Clinic c={p.a} />
                        <Clinic c={p.b} />
                    </div>
                    <div className="row row--wrap">
                        <Button size="sm" variant="secondary" onClick={() => router.post('/admin/duplicates/dismiss', { a: p.a.id, b: p.b.id })}>Это разные клиники</Button>
                        <Button size="sm" onClick={() => confirm('Объединить в первую?') && router.post('/admin/duplicates/merge', { keep: p.a.id, remove: p.b.id })}>Оставить первую</Button>
                        <Button size="sm" variant="dark" onClick={() => confirm('Объединить во вторую?') && router.post('/admin/duplicates/merge', { keep: p.b.id, remove: p.a.id })}>Оставить вторую</Button>
                    </div>
                </article>
            ))}
        </div>
    );
}

function Clinic({ c }: { c: Card }) {
    return (
        <div className="card card--muted">
            <Link href={`/clinics/${c.slug}`} className="link">{c.name}</Link>
            <p className="text-sm">{c.city}, {c.address}</p>
            <p className="text-sm text-muted">{c.phone} · отзывы {c.reviews_count} · врачи {c.doctors_count}</p>
            <StatusBadge status={c.status} />
        </div>
    );
}
