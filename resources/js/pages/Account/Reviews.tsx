import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { PageHead, StatusBadge } from '@/components/Dash';
import { Stars } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { TextArea, TextField } from '@/components/ui/Fields';
import { EmptyState } from '@/components/ui/Misc';

interface Row {
    id: number; rating: number; title: string | null; body: string; status: string; moderation_note: string | null;
    is_verified_visit: boolean; visit_date: string | null; created_at: string | null;
    clinic: { name: string; slug: string } | null; reply: string | null;
}

export default function Reviews({ reviews }: { reviews: Row[] }) {
    const [edit, setEdit] = useState<number | null>(null);
    const form = useForm({ rating: 5, title: '', body: '' });

    return (
        <div className="stack-lg">
            <PageHead title="Мои отзывы" text="Опубликованный отзыв нельзя править — только удалить и написать новый. Без диагнозов и персональных данных." />
            {reviews.length === 0 ? <EmptyState title="Вы ещё не оставляли отзывов" /> : reviews.map((r) => (
                <article key={r.id} className="card stack">
                    <div className="row row--between">
                        <div>
                            {r.clinic ? <Link href={`/clinics/${r.clinic.slug}`} className="link">{r.clinic.name}</Link> : null}
                            <div className="text-xs text-muted">{r.created_at}{r.is_verified_visit ? ' · подтверждённый визит' : ''}</div>
                        </div>
                        <StatusBadge status={r.status} />
                    </div>
                    <Stars value={r.rating} />
                    {r.title ? <b>{r.title}</b> : null}
                    <p>{r.body}</p>
                    {r.moderation_note ? <p className="text-sm text-muted">Комментарий модератора: {r.moderation_note}</p> : null}
                    {r.reply ? <p className="review-reply">Ответ клиники: {r.reply}</p> : null}
                    <div className="row">
                        {['pending', 'rejected'].includes(r.status) ? (
                            <Button size="sm" variant="secondary" onClick={() => { setEdit(r.id); form.setData({ rating: r.rating, title: r.title ?? '', body: r.body }); }}>Изменить</Button>
                        ) : null}
                        <Button size="sm" variant="ghost" onClick={() => confirm('Удалить отзыв?') && router.delete(`/account/reviews/${r.id}`)}>Удалить</Button>
                    </div>
                    {edit === r.id ? (
                        <form className="stack" onSubmit={(e) => { e.preventDefault(); form.put(`/account/reviews/${r.id}`, { onSuccess: () => setEdit(null) }); }}>
                            <TextField label="Заголовок" value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} />
                            <TextArea label="Текст" required minLength={40} value={form.data.body} onChange={(e) => form.setData('body', e.target.value)} error={form.errors.body} />
                            <Button type="submit" size="sm" loading={form.processing}>Отправить на проверку</Button>
                        </form>
                    ) : null}
                </article>
            ))}
        </div>
    );
}
