import { router, useForm } from '@inertiajs/react';
import { PageHead, StatusBadge } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check, TextArea } from '@/components/ui/Fields';
import { EmptyState } from '@/components/ui/Misc';

interface Item {
    type: string; id: number; title: string; meta?: string | null; body?: string | null;
    has_file?: boolean; image?: string | null; flags?: unknown; at?: string | null;
}

export default function Moderation({
    queue,
    typeLabels,
    content_moderation_settings,
}: {
    queue: Item[];
    typeLabels: Record<string, string>;
    content_moderation_settings: { moderate_review_replies: boolean; moderate_promotions: boolean };
}) {
    const settings = useForm({ ...content_moderation_settings });

    return (
        <div className="stack-lg">
            <PageHead title="Очередь модерации" text={`${queue.length} объектов ждут решения.`} />
            <form
                className="card stack"
                onSubmit={(e) => {
                    e.preventDefault();
                    settings.post('/admin/moderation/settings');
                }}
            >
                <h2 className="h3">Настройки</h2>
                <Check
                    label="Модерировать ответы клиник на отзывы"
                    checked={settings.data.moderate_review_replies}
                    onChange={(e) => settings.setData('moderate_review_replies', e.target.checked)}
                />
                <Check
                    label="Модерировать все рекламные заказы (включая буст)"
                    checked={settings.data.moderate_promotions}
                    onChange={(e) => settings.setData('moderate_promotions', e.target.checked)}
                />
                <Button type="submit" size="sm" loading={settings.processing}>
                    Сохранить
                </Button>
            </form>
            {queue.length === 0 ? <EmptyState title="Очередь пуста" /> : queue.map((item) => <Card key={`${item.type}-${item.id}`} item={item} label={typeLabels[item.type] ?? item.type} />)}
        </div>
    );
}

function Card({ item, label }: { item: Item; label: string }) {
    const form = useForm({ decision: 'approve', note: '' });
    const send = (decision: 'approve' | 'reject') => {
        form.transform((d) => ({ ...d, decision }));
        form.post(`/admin/moderation/${item.type}/${item.id}`);
    };
    return (
        <article className="card stack mod-card">
            <div className="row row--between">
                <div>
                    <span className="badge badge--primary">{label}</span>
                    <h2>{item.title}</h2>
                    <p className="text-sm text-muted">{item.meta} · {item.at}</p>
                </div>
            </div>
            {item.body ? <p>{item.body}</p> : null}
            {item.image ? <img src={item.image} alt="" style={{ maxWidth: 280, borderRadius: 12 }} /> : null}
            {item.has_file ? <a className="link" href={`/admin/moderation/documents/${item.id}`}>Открыть файл</a> : null}
            <TextArea label="Комментарий при отклонении" value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} error={form.errors.note} />
            <div className="row">
                <Button size="sm" loading={form.processing} onClick={() => send('approve')}>Одобрить</Button>
                <Button size="sm" variant="danger" loading={form.processing} onClick={() => send('reject')}>Отклонить</Button>
            </div>
        </article>
    );
}
