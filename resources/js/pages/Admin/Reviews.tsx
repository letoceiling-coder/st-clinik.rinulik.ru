import { router } from '@inertiajs/react';
import { FilterBar, PageHead, PagerSafe, StatusBadge } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { SearchInput, SelectField } from '@/components/ui/Fields';
import { Stars } from '@/components/ui/Misc';
import type { Paginated } from '@/lib/types';

interface Row {
    id: number; author: string; clinic: string | null; rating: number; title: string | null; body: string;
    status: string; flags: string[] | null; moderation_note: string | null; is_verified_visit: boolean; created_at: string | null;
}

export default function Reviews({ reviews, statuses, filters }: { reviews: Paginated<Row>; statuses: string[]; filters: { status?: string; q?: string } }) {
    const act = (id: number, action: string) => {
        const note = action === 'reject' || action === 'hide' ? prompt('Комментарий (увидит автор):') ?? '' : '';
        router.put(`/admin/reviews/${id}`, { action, note });
    };
    return (
        <div className="stack-lg">
            <PageHead title="Отзывы" text="Не пропускайте диагнозы, персональные данные и рекламу." />
            <FilterBar>
                <SearchInput name="q" defaultValue={filters.q} placeholder="Текст или автор" />
                <SelectField name="status" label="Статус" defaultValue={filters.status ?? ''}>
                    <option value="">Все</option>
                    {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </SelectField>
            </FilterBar>
            {reviews.data.map((r) => (
                <article key={r.id} className="card stack">
                    <div className="row row--between">
                        <div>
                            <b>{r.author}</b> · {r.clinic}
                            <div className="text-xs text-muted">{r.created_at}{r.is_verified_visit ? ' · визит' : ''}</div>
                        </div>
                        <StatusBadge status={r.status} />
                    </div>
                    <Stars value={r.rating} />
                    <p>{r.body}</p>
                    {r.flags ? <p className="text-xs text-muted">Флаги: {Array.isArray(r.flags) ? r.flags.join(', ') : JSON.stringify(r.flags)}</p> : null}
                    <div className="row row--wrap">
                        <Button size="sm" onClick={() => act(r.id, 'approve')}>Одобрить</Button>
                        <Button size="sm" variant="danger" onClick={() => act(r.id, 'reject')}>Отклонить</Button>
                        <Button size="sm" variant="secondary" onClick={() => act(r.id, 'hide')}>Скрыть</Button>
                        <Button size="sm" variant="ghost" onClick={() => act(r.id, 'restore')}>Вернуть</Button>
                    </div>
                </article>
            ))}
            <PagerSafe page={reviews} />
        </div>
    );
}
