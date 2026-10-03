import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { FilterBar, PageHead, PagerSafe, StatusBadge } from '@/components/Dash';
import { Stars } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { SelectField, TextArea } from '@/components/ui/Fields';
import { EmptyState } from '@/components/ui/Misc';
import type { Paginated } from '@/lib/types';

interface Row {
    id: number; rating: number; title: string | null; body: string; author_name: string; status: string;
    is_verified_visit: boolean; visit_date: string | null; created_at: string | null;
    doctor: string | null; service: string | null; reply: string | null; reply_at: string | null;
    complaint: { status: string; reason: string; resolution: string | null } | null;
}

export default function Reviews({ reviews, reasons, filters }: { reviews: Paginated<Row>; reasons: Record<string, string>; filters: { filter?: string } }) {
    const [open, setOpen] = useState<number | null>(null);
    const reply = useForm({ reply_text: '' });
    const complain = useForm({ reason: Object.keys(reasons)[0] ?? '', comment: '' });

    return (
        <div className="stack-lg">
            <PageHead title="Отзывы" text="Отвечайте вежливо. Жалоба не снимает отзыв до решения модератора." />
            <FilterBar>
                <SelectField name="filter" label="Фильтр" defaultValue={filters.filter ?? ''}>
                    <option value="">Все</option>
                    <option value="unanswered">Без ответа</option>
                </SelectField>
            </FilterBar>
            {reviews.data.length === 0 ? <EmptyState title="Отзывов нет" /> : reviews.data.map((r) => (
                <article key={r.id} className="card stack">
                    <div className="row row--between">
                        <div>
                            <b>{r.author_name}</b>
                            <div className="text-xs text-muted">{r.created_at} · {r.doctor ?? r.service ?? 'клиника'}</div>
                        </div>
                        <StatusBadge status={r.status} />
                    </div>
                    <Stars value={r.rating} />
                    <p>{r.body}</p>
                    {r.reply ? <p className="review-reply">{r.reply}</p> : r.status === 'published' ? (
                        <form className="stack" onSubmit={(e) => { e.preventDefault(); reply.post(`/clinic-cabinet/reviews/${r.id}/reply`, { onSuccess: () => reply.reset() }); }}>
                            <TextArea label="Ответ клиники" value={reply.data.reply_text} onChange={(e) => reply.setData('reply_text', e.target.value)} error={reply.errors.reply_text} />
                            <Button type="submit" size="sm" loading={reply.processing}>Опубликовать ответ</Button>
                        </form>
                    ) : null}
                    {r.complaint ? <p className="text-sm text-muted">Жалоба: {r.complaint.status}</p> : (
                        <Button size="sm" variant="ghost" onClick={() => setOpen(open === r.id ? null : r.id)}>Пожаловаться</Button>
                    )}
                    {open === r.id ? (
                        <form className="stack" onSubmit={(e) => { e.preventDefault(); complain.post(`/clinic-cabinet/reviews/${r.id}/complaint`, { onSuccess: () => setOpen(null) }); }}>
                            <SelectField label="Причина" value={complain.data.reason} onChange={(e) => complain.setData('reason', e.target.value)}>
                                {Object.entries(reasons).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </SelectField>
                            <TextArea label="Комментарий" value={complain.data.comment} onChange={(e) => complain.setData('comment', e.target.value)} error={complain.errors.comment} />
                            <Button type="submit" size="sm" variant="dark" loading={complain.processing}>Отправить жалобу</Button>
                        </form>
                    ) : null}
                </article>
            ))}
            <PagerSafe page={reviews} />
        </div>
    );
}
