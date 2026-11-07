import { useEffect } from 'react';
import { IconButton } from '@/components/ui/Button';
import { Lightbox } from '@/components/ui/Overlay';

export interface ViewerPhoto {
    url: string;
    caption?: string | null;
}

/** Просмотр фото на весь экран: стрелки, клавиши ← → и счётчик. */
export function PhotoViewer({ photos, index, onIndex, title }: { photos: ViewerPhoto[]; index: number | null; onIndex: (i: number | null) => void; title: string }) {
    const open = index !== null && photos[index] !== undefined;
    const go = (step: number) => index !== null && onIndex((index + step + photos.length) % photos.length);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') go(1);
            if (e.key === 'ArrowLeft') go(-1);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    });

    if (!open) return null;
    const photo = photos[index];

    return (
        <Lightbox open onClose={() => onIndex(null)} title={`${title} · ${index + 1} из ${photos.length}${photo.caption && photo.caption !== title ? ` · ${photo.caption}` : ''}`}>
            <img className="mod-lightbox__img" src={photo.url} alt={photo.caption ?? title} />
            {photos.length > 1 ? (
                <>
                    <IconButton className="mod-lightbox__nav mod-lightbox__nav--prev" icon="chevron-left" label="Предыдущее фото" onClick={() => go(-1)} variant="secondary" round />
                    <IconButton className="mod-lightbox__nav mod-lightbox__nav--next" icon="chevron-right" label="Следующее фото" onClick={() => go(1)} variant="secondary" round />
                </>
            ) : null}
        </Lightbox>
    );
}
