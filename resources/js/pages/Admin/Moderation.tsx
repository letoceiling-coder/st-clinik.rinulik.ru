import { Link, useForm, usePage } from '@inertiajs/react';
import { PageHead } from '@/components/Dash';
import Icon from '@/components/Icon';
import { ModerationCard, type ModerationItem } from '@/components/moderation/ModerationCard';
import { Button } from '@/components/ui/Button';
import { Check } from '@/components/ui/Fields';
import { EmptyState } from '@/components/ui/Misc';

type Item = ModerationItem;

export default function Moderation({
    queue,
    typeLabels,
    content_moderation_settings,
}: {
    queue: Item[];
    typeLabels: Record<string, string>;
    content_moderation_settings: { moderate_review_replies: boolean; moderate_promotions: boolean };
}) {
    const activeType = new URLSearchParams(usePage().url.split('?')[1] ?? '').get('type') ?? '';
    const counts = queue.reduce<Record<string, number>>((acc, item) => ({ ...acc, [item.type]: (acc[item.type] ?? 0) + 1 }), {});
    const visible = activeType ? queue.filter((item) => item.type === activeType) : queue;

    return (
        <div className="stack-lg">
            <PageHead
                title="Модерация"
                text="Здесь проверяются материалы, которые клиники и пациенты добавили на сайт: карточки клиник, врачи, фото, документы и отзывы. Пока материал не одобрен, посетители его не видят. При отклонении автор получит вашу причину."
            />
            <nav className="dict-tabs" aria-label="Тип материалов">
                <Link href="/admin/moderation" className={activeType ? 'chip' : 'chip is-active'} preserveScroll>
                    Все · {queue.length}
                </Link>
                {Object.entries(typeLabels).map(([type, label]) => (
                    <Link key={type} href={`/admin/moderation?type=${type}`} className={type === activeType ? 'chip is-active' : 'chip'} preserveScroll>
                        {label} · {counts[type] ?? 0}
                    </Link>
                ))}
            </nav>
            {visible.length === 0 ? (
                <EmptyState icon="check" title={activeType ? 'Здесь всё проверено' : 'Очередь пуста'} text="Новые материалы появятся здесь автоматически." />
            ) : (
                visible.map((item) => <ModerationCard key={`${item.type}-${item.id}`} item={item} />)
            )}
            <ModerationSettings initial={content_moderation_settings} />
        </div>
    );
}

function ModerationSettings({ initial }: { initial: { moderate_review_replies: boolean; moderate_promotions: boolean } }) {
    const settings = useForm({ ...initial });

    return (
        <details className="card mod-settings">
            <summary>
                <Icon name="settings" size={18} /> Настройки модерации
            </summary>
            <form
                className="stack"
                onSubmit={(e) => {
                    e.preventDefault();
                    settings.post('/admin/moderation/settings', { preserveScroll: true });
                }}
            >
                <p className="text-sm text-muted">Что отправлять на ручную проверку, прежде чем показать на сайте.</p>
                <Check
                    label="Проверять ответы клиник на отзывы"
                    checked={settings.data.moderate_review_replies}
                    onChange={(e) => settings.setData('moderate_review_replies', e.target.checked)}
                />
                <Check
                    label="Проверять все рекламные заказы клиник (включая поднятие в выдаче)"
                    checked={settings.data.moderate_promotions}
                    onChange={(e) => settings.setData('moderate_promotions', e.target.checked)}
                />
                <div>
                    <Button type="submit" size="sm" loading={settings.processing}>
                        Сохранить настройки
                    </Button>
                </div>
            </form>
        </details>
    );
}
