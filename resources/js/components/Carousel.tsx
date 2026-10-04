import { Children, type CSSProperties, type MouseEvent, type PointerEvent, type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react';
import { cx } from '@/lib/format';
import Icon from './Icon';

interface CarouselProps {
    children: ReactNode;
    ariaLabel: string;
    className?: string;
    slideClassName?: string;
    gap?: number;
    staticClassName?: string;
}

const DRAG_THRESHOLD = 6;

export default function Carousel({ children, ariaLabel, className, slideClassName, gap, staticClassName }: CarouselProps) {
    const trackId = useId().replace(/:/g, '');
    const trackRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef({ active: false, moved: false, startX: 0, scrollLeft: 0 });
    const [edges, setEdges] = useState({ prev: false, next: false });
    const items = Children.toArray(children);

    const updateEdges = useCallback(() => {
        const track = trackRef.current;
        if (!track) {
            return;
        }

        const maxScroll = track.scrollWidth - track.clientWidth;
        setEdges({
            prev: track.scrollLeft > 2,
            next: maxScroll > 2 && track.scrollLeft < maxScroll - 2,
        });
    }, []);

    useEffect(() => {
        const track = trackRef.current;
        if (!track) {
            return;
        }

        updateEdges();
        track.addEventListener('scroll', updateEdges, { passive: true });
        const observer = new ResizeObserver(updateEdges);
        observer.observe(track);

        return () => {
            track.removeEventListener('scroll', updateEdges);
            observer.disconnect();
        };
    }, [items.length, updateEdges]);

    useEffect(() => {
        const track = trackRef.current;
        if (!track) {
            return;
        }

        const onWheel = (event: WheelEvent) => {
            const maxScroll = track.scrollWidth - track.clientWidth;
            if (maxScroll <= 0) {
                return;
            }

            const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            if (delta === 0) {
                return;
            }

            const goingForward = delta > 0;
            const atStart = track.scrollLeft <= 0;
            const atEnd = track.scrollLeft >= maxScroll - 1;
            if ((goingForward && atEnd) || (!goingForward && atStart)) {
                return;
            }

            event.preventDefault();
            track.scrollLeft += delta;
        };

        track.addEventListener('wheel', onWheel, { passive: false });

        return () => track.removeEventListener('wheel', onWheel);
    }, []);

    const scrollByDir = (direction: -1 | 1) => {
        const track = trackRef.current;
        if (!track) {
            return;
        }

        const step = Math.max(track.clientWidth * 0.75, 220);
        track.scrollBy({ left: direction * step, behavior: 'smooth' });
    };

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        const track = trackRef.current;
        if (!track || event.button !== 0) {
            return;
        }

        dragRef.current = {
            active: true,
            moved: false,
            startX: event.clientX,
            scrollLeft: track.scrollLeft,
        };
        track.setPointerCapture(event.pointerId);
        track.classList.add('is-dragging');
    };

    const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
        if (!dragRef.current.active) {
            return;
        }

        const track = trackRef.current;
        if (!track) {
            return;
        }

        const delta = event.clientX - dragRef.current.startX;
        if (Math.abs(delta) > DRAG_THRESHOLD) {
            dragRef.current.moved = true;
        }

        if (dragRef.current.moved) {
            event.preventDefault();
            track.scrollLeft = dragRef.current.scrollLeft - delta;
        }
    };

    const endDrag = (event: PointerEvent<HTMLDivElement>) => {
        const track = trackRef.current;
        if (!track) {
            return;
        }

        dragRef.current.active = false;
        track.classList.remove('is-dragging');
        if (track.hasPointerCapture(event.pointerId)) {
            track.releasePointerCapture(event.pointerId);
        }
    };

    const onClickCapture = (event: MouseEvent<HTMLDivElement>) => {
        if (dragRef.current.moved) {
            event.preventDefault();
            event.stopPropagation();
            dragRef.current.moved = false;
        }
    };

    const trackStyle = gap !== undefined ? ({ '--carousel-gap': `${gap}px` } as CSSProperties) : undefined;

    return (
        <div className={cx('carousel', className)}>
            <button
                type="button"
                className="carousel__nav carousel__nav--prev"
                aria-label="Назад"
                aria-controls={trackId}
                disabled={!edges.prev}
                onClick={() => scrollByDir(-1)}
            >
                <Icon name="chevron-left" size={20} />
            </button>

            <div className="carousel__viewport">
                <div
                    ref={trackRef}
                    id={trackId}
                    className={cx('carousel__track', staticClassName)}
                    role="list"
                    aria-label={ariaLabel}
                    style={trackStyle}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onClickCapture={onClickCapture}
                >
                    {items.map((child, index) => (
                        <div key={index} className={cx('carousel__slide', slideClassName)} role="listitem">
                            {child}
                        </div>
                    ))}
                </div>
            </div>

            <button
                type="button"
                className="carousel__nav carousel__nav--next"
                aria-label="Вперёд"
                aria-controls={trackId}
                disabled={!edges.next}
                onClick={() => scrollByDir(1)}
            >
                <Icon name="chevron-right" size={20} />
            </button>
        </div>
    );
}
