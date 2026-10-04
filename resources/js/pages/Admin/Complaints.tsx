import { router } from '@inertiajs/react';
import { FilterBar, PageHead, PagerSafe, StatusBadge } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Fields';
import type { Paginated } from '@/lib/types';

interface Row {
    id: number; reason: string; comment: string; reporter: string; reporter_role: string; status: string;
    resolution: string | null; created_at: string | null;
    review: { id: number; author: string; rating: number; body: string; status: string; clinic: string | null } | null;
}

export default function Complaints({ complaints, filters }: { complaints: Paginated<Row>; filters: { status: string } }) {
    const decide = (id: number, decision: 'uphold' | 'reject') => {
        const resolution = prompt('Резолюция:') ?? '';
        router.post(`/admin/complaints/${id}/resolve`, { decision, resolution });
    };
    return (
        <div className="stack-lg">
            <PageHead title="Жалобы на отзывы" />
            <FilterBar>
                <SelectField name="status" label="Статус" defaultValue={filters.status}>
                    <option value="open">Открытые</option>
                    <option value="upheld">Подтверждённые</option>
                    <option value="rejected">Отклонённые</option>
                    <option value="all">Все</option>
                </SelectField>
            </FilterBar>
            {complaints.data.map((c) => (
                <article key={c.id} className="card stack complaint-card">
                    <div className="complaint-card__head">
                        <b className="complaint-card__reason">{c.reason}</b>
                        <StatusBadge status={c.status} />
                    </div>
                    <p className="complaint-card__comment">{c.comment}</p>
                    <p className="text-sm text-muted">{c.reporter} ({c.reporter_role}) · {c.created_at}</p>
                    {c.review ? (
                        <blockquote className="card card--muted complaint-card__review">
                            {c.review.author} · {c.review.clinic}
                            <br />
                            {c.review.body}
                        </blockquote>
                    ) : null}
                    {c.status === 'open' ? (
                        <div className="card-actions">
                            <Button size="sm" block onClick={() => decide(c.id, 'uphold')}>
                                Скрыть отзыв
                            </Button>
                            <Button size="sm" variant="secondary" block onClick={() => decide(c.id, 'reject')}>
                                Оставить отзыв
                            </Button>
                        </div>
                    ) : (
                        <p className="text-sm text-muted">{c.resolution}</p>
                    )}
                </article>
            ))}
            <PagerSafe page={complaints} />
        </div>
    );
}
