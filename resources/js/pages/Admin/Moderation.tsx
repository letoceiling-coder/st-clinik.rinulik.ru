import { Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { PageHead } from '@/components/Dash';
import Icon from '@/components/Icon';
import { DoctorArt, PhotoArt } from '@/components/PhotoArt';
import { Button } from '@/components/ui/Button';
import { Check, TextArea } from '@/components/ui/Fields';
import { EmptyState, Stars } from '@/components/ui/Misc';
import { Modal } from '@/components/ui/Overlay';

type Media =
    | { kind: 'image'; url: string; caption: string; download_url?: string }
    | { kind: 'pdf'; url: string; caption: string; download_url?: string }
    | { kind: 'photo_art'; seed: number; photo_kind: string; caption: string }
    | { kind: 'doctor_art'; seed: number; caption: string }
    | { kind: 'missing'; caption: string };

interface Item {
    type: string;
    type_label: string;
    id: number;
    title: string;
    clinic: { id: number; name: string } | null;
    at: string | null;
    hint: string;
    facts: { label: string; value: string }[];
    body: string | null;
    body_label: string | null;
    context: string | null;
    context_label: string | null;
    media: Media | null;
    links: { label: string; url: string; external?: boolean }[];
    flags: string[];
    rating: number | null;
    note_required: boolean;
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

function ModerationCard({ item }: { item: Item }) {
    const form = useForm({ decision: 'approve', note: '' });
    const send = (decision: 'approve' | 'reject') => {
        form.transform((d) => ({ ...d, decision }));
        form.post(`/admin/moderation/${item.type}/${item.id}`, { preserveScroll: true });
    };

    return (
        <article className="card mod-card" aria-labelledby={`mod-${item.type}-${item.id}`}>
            {item.media ? <MediaPreview media={item.media} title={item.title} /> : null}
            <div className="mod-card__main">
                <div className="mod-card__meta">
                    <span className="badge badge--primary">{item.type_label}</span>
                    {item.clinic ? (
                        <Link href={`/admin/clinics/${item.clinic.id}`} className="link">
                            {item.clinic.name}
                        </Link>
                    ) : null}
                    {item.at ? <span className="text-sm text-muted">отправлено {item.at}</span> : null}
                </div>
                <h2 id={`mod-${item.type}-${item.id}`} className="mod-card__title">
                    {item.title}
                </h2>
                {item.rating ? <Stars value={item.rating} /> : null}

                {item.facts.length > 0 ? (
                    <dl className="mod-facts">
                        {item.facts.map((f) => (
                            <div key={f.label}>
                                <dt>{f.label}</dt>
                                <dd>{f.value}</dd>
                            </div>
                        ))}
                    </dl>
                ) : null}

                {item.context ? (
                    <div className="mod-text mod-text--context">
                        <span className="mod-text__label">{item.context_label}</span>
                        <p>{item.context}</p>
                    </div>
                ) : null}
                {item.body ? (
                    <div className="mod-text">
                        <span className="mod-text__label">{item.body_label}</span>
                        <p>{item.body}</p>
                    </div>
                ) : null}

                {item.flags.length > 0 ? (
                    <p className="mod-flags" role="note">
                        <Icon name="alert" size={16} /> Автопроверка нашла в тексте: {item.flags.join(', ')}.
                    </p>
                ) : null}

                <p className="mod-hint">
                    <Icon name="info" size={16} />
                    <span>{item.hint}</span>
                </p>

                {item.links.length > 0 ? (
                    <div className="row row--wrap" style={{ gap: 12 }}>
                        {item.links.map((l) =>
                            l.external ? (
                                <a key={l.url} className="link" href={l.url} target="_blank" rel="noreferrer">
                                    {l.label} <Icon name="external" size={14} />
                                </a>
                            ) : (
                                <Link key={l.url} className="link" href={l.url}>
                                    {l.label}
                                </Link>
                            ),
                        )}
                    </div>
                ) : null}

                <TextArea
                    label={item.note_required ? 'Причина отклонения (обязательна, её увидит автор)' : 'Причина отклонения (необязательно)'}
                    value={form.data.note}
                    maxLength={500}
                    rows={2}
                    onChange={(e) => form.setData('note', e.target.value)}
                    error={form.errors.note}
                />
                <div className="row row--wrap" style={{ gap: 8 }}>
                    <Button size="sm" loading={form.processing} onClick={() => send('approve')}>
                        <Icon name="check" size={16} /> Одобрить и опубликовать
                    </Button>
                    <Button size="sm" variant="danger" loading={form.processing} onClick={() => send('reject')}>
                        Отклонить
                    </Button>
                </div>
            </div>
        </article>
    );
}

function MediaPreview({ media, title }: { media: Media; title: string }) {
    const [open, setOpen] = useState(false);

    if (media.kind === 'missing') {
        return (
            <div className="mod-media mod-media--missing">
                <Icon name="file" size={28} />
                <span>{media.caption}</span>
            </div>
        );
    }

    if (media.kind === 'photo_art' || media.kind === 'doctor_art') {
        return (
            <figure className="mod-media">
                {media.kind === 'photo_art' ? <PhotoArt seed={media.seed} kind={media.photo_kind} label={title} /> : <DoctorArt seed={media.seed} name={title} />}
                <figcaption>{media.caption}</figcaption>
            </figure>
        );
    }

    return (
        <figure className="mod-media">
            <button type="button" className="mod-media__open" onClick={() => setOpen(true)} aria-label={`Открыть: ${title}`}>
                {media.kind === 'image' ? (
                    <img src={media.url} alt="" loading="lazy" />
                ) : (
                    <span className="mod-media__pdf">
                        <Icon name="file" size={36} />
                        PDF
                    </span>
                )}
                <span className="mod-media__zoom">
                    <Icon name="eye" size={16} /> {media.kind === 'pdf' ? 'Открыть документ' : 'Увеличить'}
                </span>
            </button>
            <figcaption>{media.caption}</figcaption>
            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title={title}
                wide
                sheet={false}
                footer={
                    <div className="row row--wrap" style={{ gap: 12 }}>
                        <a className="link" href={media.url} target="_blank" rel="noreferrer">
                            Открыть в новой вкладке <Icon name="external" size={14} />
                        </a>
                        {media.download_url ? (
                            <a className="link" href={media.download_url}>
                                Скачать файл
                            </a>
                        ) : null}
                    </div>
                }
            >
                {media.kind === 'image' ? (
                    <img className="mod-viewer__img" src={media.url} alt={title} />
                ) : (
                    <iframe className="mod-viewer__pdf" src={media.url} title={title} />
                )}
            </Modal>
        </figure>
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
