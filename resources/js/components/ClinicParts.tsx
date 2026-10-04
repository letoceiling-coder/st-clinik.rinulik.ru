import { useState } from 'react';
import { cx, dateRu, money, priceFrom } from '@/lib/format';
import type { ClinicDetailData, PhotoRef, PriceItem } from '@/lib/types';
import Icon from './Icon';
import { PhotoArt } from './PhotoArt';
import { Lightbox } from './ui/Overlay';

export const PHOTO_KINDS: Record<string, string> = {
    exterior: 'Фасад',
    interior: 'Интерьер',
    reception: 'Ресепшн',
    cabinet: 'Кабинет',
    equipment: 'Оборудование',
    team: 'Команда',
};

function Photo({ photo, eager }: { photo: PhotoRef; eager?: boolean }) {
    return photo.url ? (
        <img src={photo.url} alt={photo.caption ?? PHOTO_KINDS[photo.kind] ?? 'Фото клиники'} loading={eager ? 'eager' : 'lazy'} />
    ) : (
        <PhotoArt seed={photo.art_seed} kind={photo.kind} />
    );
}

export function Gallery({ photos, name }: { photos: PhotoRef[]; name: string }) {
    const [open, setOpen] = useState<number | null>(null);
    if (photos.length === 0) return null;
    const shown = photos.slice(0, 5);

    return (
        <>
            <div className={cx('gallery', `gallery--${Math.min(shown.length, 5)}`)} role="group" aria-label={`Фотографии клиники ${name}`}>
                {shown.map((p, i) => (
                    <button key={i} type="button" className="gallery__item" onClick={() => setOpen(i)} aria-label={`Открыть фото ${i + 1} из ${photos.length}`}>
                        <Photo photo={p} eager={i === 0} />
                        {i === shown.length - 1 && photos.length > shown.length ? <span className="gallery__more">+{photos.length - shown.length}</span> : null}
                    </button>
                ))}
            </div>
            <Lightbox
                open={open !== null}
                onClose={() => setOpen(null)}
                title={open !== null ? (photos[open].caption ?? PHOTO_KINDS[photos[open].kind] ?? 'Фото') : undefined}
            >
                {open !== null ? (
                    <>
                        <button type="button" className="lightbox__nav lightbox__nav--prev" onClick={() => setOpen((open - 1 + photos.length) % photos.length)} aria-label="Предыдущее фото">
                            <Icon name="chevron-left" size={24} />
                        </button>
                        <div className="lightbox__frame">
                            <Photo photo={photos[open]} eager />
                        </div>
                        <button type="button" className="lightbox__nav lightbox__nav--next" onClick={() => setOpen((open + 1) % photos.length)} aria-label="Следующее фото">
                            <Icon name="chevron-right" size={24} />
                        </button>
                        <p className="lightbox__count text-sm text-muted">
                            {open + 1} / {photos.length}
                        </p>
                    </>
                ) : null}
            </Lightbox>
        </>
    );
}

export function ScheduleView({ week, compact }: { week: ClinicDetailData['week']; compact?: boolean }) {
    return (
        <dl className={cx('schedule', compact && 'schedule--compact')}>
            {week.map((d) => (
                <div key={d.key} className={cx('schedule__row', d.today && 'is-today')}>
                    <dt>
                        {d.day}
                        {d.today ? <span className="badge badge--primary">сегодня</span> : null}
                    </dt>
                    <dd>{d.hours}</dd>
                </div>
            ))}
        </dl>
    );
}

export function PriceTable({ items }: { items: PriceItem[] }) {
    return (
        <ul className="price-list">
            {items.map((p) => (
                <li key={p.id} className="price-row price-row--static">
                    <span className="price-row__name">
                        <b>
                            {p.name}
                            {p.is_promo ? (
                                <span className="badge badge--primary" style={{ marginLeft: 8 }}>
                                    акция
                                </span>
                            ) : null}
                        </b>
                        {p.description ? <span className="text-sm text-muted">{p.description}</span> : null}
                    </span>
                    <span className="price-row__meta text-sm text-muted">{p.duration_min ? `~${p.duration_min} мин` : ''}</span>
                    <b className="price-row__price">{p.price_to && p.price_to > p.price_from ? `${money(p.price_from)} – ${money(p.price_to)}` : priceFrom(p.price_from)}</b>
                </li>
            ))}
        </ul>
    );
}

export function RatingSummary({ rating, count, distribution, active, onPick }: { rating: number; count: number; distribution: Record<string, number>; active?: number; onPick?: (n: number) => void }) {
    return (
        <div className="rating-summary">
            <div className="rating-summary__score">
                <b>{count > 0 ? rating.toFixed(1).replace('.', ',') : '—'}</b>
                <div className="stars" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className={i <= Math.round(rating) ? '' : 'off'}>
                            <Icon name="star" size={20} />
                        </span>
                    ))}
                </div>
                <span className="text-sm text-muted">{count > 0 ? `${count} оценок` : 'Пока нет оценок'}</span>
            </div>
            <ul className="rating-summary__bars">
                {[5, 4, 3, 2, 1].map((n) => {
                    const v = distribution[n] ?? 0;
                    const pct = count ? Math.round((v / count) * 100) : 0;
                    return (
                        <li key={n}>
                            <button type="button" className={cx('bar-row', active === n && 'is-active')} onClick={() => onPick?.(active === n ? 0 : n)} aria-pressed={active === n} aria-label={`${n} из 5: ${v}`}>
                                <span>{n}</span>
                                <Icon name="star" size={14} />
                                <span className="bar">
                                    <span style={{ width: `${pct}%` }} />
                                </span>
                                <span className="bar-row__n text-sm text-muted">{v}</span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

export function documentTitle(d: ClinicDetailData['documents'][number]) {
    const date = d.issued_at ? ` от ${dateRu(d.issued_at)}` : '';
    return `${d.title}${d.number ? ` № ${d.number}` : ''}${date}`;
}
