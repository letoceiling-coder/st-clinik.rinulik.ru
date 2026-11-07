import { Link, useForm } from '@inertiajs/react';
import { useState } from 'react';
import Icon from '@/components/Icon';
import { DoctorArt, PhotoArt } from '@/components/PhotoArt';
import { Button, LinkButton } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/Fields';
import { Stars } from '@/components/ui/Misc';
import { Modal } from '@/components/ui/Overlay';
import { PhotoViewer, type ViewerPhoto } from './PhotoViewer';

export type Media =
    | { kind: 'image'; url: string; caption: string; download_url?: string }
    | { kind: 'pdf'; url: string; caption: string; download_url?: string }
    | { kind: 'photo_art'; seed: number; photo_kind: string; caption: string }
    | { kind: 'doctor_art'; seed: number; caption: string }
    | { kind: 'missing'; caption: string };

export interface ModerationItem {
    type: string;
    type_label: string;
    id: number;
    title: string;
    clinic: { id: number; name: string } | null;
    clinic_id: number | null;
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
    gallery: { id: number; url: string; status: string }[];
    gallery_total: number;
    review_url: string | null;
    can_publish: boolean;
}

/** Карточка материала в очереди: факты, текст, медиа и решение. */
export function ModerationCard({ item, compact = false }: { item: ModerationItem; compact?: boolean }) {
    const form = useForm({ decision: 'approve', note: '', publish: false });
    const [viewer, setViewer] = useState<number | null>(null);
    const send = (decision: 'approve' | 'reject', publish = false) => {
        form.transform((d) => ({ ...d, decision, publish }));
        form.post(`/admin/moderation/${item.type}/${item.id}`, { preserveScroll: true });
    };
    const photos: ViewerPhoto[] = item.gallery.map((p) => ({ url: p.url, caption: item.title }));
    const isClinic = item.type === 'clinic';

    return (
        <article className={`card mod-card${compact ? ' mod-card--compact' : ''}`} aria-labelledby={`mod-${item.type}-${item.id}`}>
            {item.media ? <MediaPreview media={item.media} title={item.title} /> : null}
            <div className="mod-card__main">
                <div className="mod-card__meta">
                    <span className="badge badge--primary">{item.type_label}</span>
                    {item.clinic && !compact ? (
                        <Link href={item.review_url ?? `/admin/clinics/${item.clinic.id}`} className="link">
                            {item.clinic.name}
                        </Link>
                    ) : null}
                    {item.at ? <span className="text-sm text-muted">отправлено {item.at}</span> : null}
                </div>
                <h2 id={`mod-${item.type}-${item.id}`} className="mod-card__title">
                    {isClinic && item.review_url ? (
                        <Link href={item.review_url} className="mod-card__title-link">
                            {item.title}
                        </Link>
                    ) : (
                        item.title
                    )}
                </h2>
                {item.rating ? <Stars value={item.rating} /> : null}

                {item.gallery.length > 0 ? (
                    <div className="mod-strip" aria-label="Фото клиники">
                        {item.gallery.map((p, i) => (
                            <button key={p.id} type="button" className="mod-strip__item" onClick={() => setViewer(i)} aria-label={`Открыть фото ${i + 1}`}>
                                <img src={p.url} alt="" loading="lazy" />
                            </button>
                        ))}
                        {item.gallery_total > item.gallery.length && item.review_url ? (
                            <Link href={item.review_url} className="mod-strip__more">
                                ещё {item.gallery_total - item.gallery.length}
                            </Link>
                        ) : null}
                    </div>
                ) : isClinic ? (
                    <p className="mod-flags" role="note">
                        <Icon name="alert" size={16} /> У клиники нет фото.
                    </p>
                ) : null}

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

                {!compact ? (
                    <p className="mod-hint">
                        <Icon name="info" size={16} />
                        <span>{item.hint}</span>
                    </p>
                ) : null}

                {item.links.length > 0 || (isClinic && item.review_url) ? (
                    <div className="row row--wrap" style={{ gap: 12 }}>
                        {isClinic && item.review_url ? (
                            <LinkButton href={item.review_url} size="sm" variant="dark" icon="eye">
                                Открыть полную проверку
                            </LinkButton>
                        ) : null}
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
                    {isClinic && item.can_publish ? (
                        <Button size="sm" loading={form.processing} onClick={() => send('approve', true)}>
                            <Icon name="check" size={16} /> Одобрить и опубликовать
                        </Button>
                    ) : null}
                    <Button size="sm" variant={isClinic && item.can_publish ? 'outline' : 'primary'} loading={form.processing} onClick={() => send('approve')}>
                        {isClinic && item.can_publish ? null : <Icon name="check" size={16} />} {isClinic ? 'Только одобрить' : 'Одобрить и опубликовать'}
                    </Button>
                    <Button size="sm" variant="danger" loading={form.processing} onClick={() => send('reject')}>
                        Отклонить
                    </Button>
                </div>
            </div>
            <PhotoViewer photos={photos} index={viewer} onIndex={setViewer} title={item.title} />
        </article>
    );
}

export function MediaPreview({ media, title }: { media: Media; title: string }) {
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
                {media.kind === 'image' ? <img className="mod-viewer__img" src={media.url} alt={title} /> : <iframe className="mod-viewer__pdf" src={media.url} title={title} />}
            </Modal>
        </figure>
    );
}
