import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '@/lib/format';
import { IconButton } from './Button';

const FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Фокус-ловушка, Esc, блокировка прокрутки и возврат фокуса. */
function useOverlay(open: boolean, onClose: () => void, panel: React.RefObject<HTMLElement | null>) {
    useEffect(() => {
        if (!open) return;
        const previous = document.activeElement as HTMLElement | null;
        const html = document.documentElement;
        const prevOverflow = html.style.overflow;
        html.style.overflow = 'hidden';

        const focusables = () => Array.from(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
        const first = focusables().find((el) => el.dataset.autofocus !== undefined) ?? focusables()[0];
        (first ?? panel.current)?.focus();

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            }
            if (e.key === 'Tab') {
                const items = focusables();
                if (!items.length) return;
                const a = items[0];
                const b = items[items.length - 1];
                if (e.shiftKey && document.activeElement === a) {
                    e.preventDefault();
                    b.focus();
                } else if (!e.shiftKey && document.activeElement === b) {
                    e.preventDefault();
                    a.focus();
                }
            }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            html.style.overflow = prevOverflow;
            previous?.focus?.();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
}

function Portal({ children }: { children: ReactNode }) {
    if (typeof document === 'undefined') return null;
    return createPortal(children, document.body);
}

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    footer?: ReactNode;
    wide?: boolean;
    sheet?: boolean;
}

export function Modal({ open, onClose, title, children, footer, wide, sheet = true }: ModalProps) {
    const ref = useRef<HTMLDivElement>(null);
    const titleId = useId();
    useOverlay(open, onClose, ref);
    if (!open) return null;

    return (
        <Portal>
            <div
                className={cx('overlay', sheet && 'overlay--sheet')}
                onMouseDown={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <div ref={ref} className={cx('modal', wide && 'modal--wide')} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
                    <div className="modal__head">
                        <h2 id={titleId}>{title}</h2>
                        <IconButton icon="x" label="Закрыть" onClick={onClose} variant="secondary" round />
                    </div>
                    <div className="modal__body">{children}</div>
                    {footer ? <div className="modal__foot">{footer}</div> : null}
                </div>
            </div>
        </Portal>
    );
}

interface DrawerProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    side?: 'left' | 'right';
    footer?: ReactNode;
}

export function Drawer({ open, onClose, title, children, side = 'right', footer }: DrawerProps) {
    const ref = useRef<HTMLDivElement>(null);
    const titleId = useId();
    useOverlay(open, onClose, ref);
    if (!open) return null;

    return (
        <Portal>
            <div className="overlay" style={{ padding: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
                <div ref={ref} className={cx('drawer', `drawer--${side}`)} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
                    <div className="modal__head">
                        <h2 id={titleId}>{title}</h2>
                        <IconButton icon="x" label="Закрыть" onClick={onClose} variant="secondary" round />
                    </div>
                    <div className="modal__body">{children}</div>
                    {footer ? <div className="modal__foot">{footer}</div> : null}
                </div>
            </div>
        </Portal>
    );
}

interface LightboxProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
}

/** Полноэкранный просмотр изображений с кнопкой закрытия, Esc и кликом по фону. */
export function Lightbox({ open, onClose, title, children }: LightboxProps) {
    const ref = useRef<HTMLDivElement>(null);
    useOverlay(open, onClose, ref);
    if (!open) return null;

    return (
        <Portal>
            <div
                ref={ref}
                className="lightbox"
                role="dialog"
                aria-modal="true"
                aria-label={title ?? 'Просмотр фото'}
                tabIndex={-1}
                onMouseDown={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <IconButton className="lightbox__close" icon="x" label="Закрыть" onClick={onClose} variant="secondary" round />
                {title ? <p className="lightbox__title">{title}</p> : null}
                {children}
            </div>
        </Portal>
    );
}

/** Закрытие по клику вне элемента и Esc (для поповеров). */
export function useDismiss(open: boolean, onClose: () => void, ref: React.RefObject<HTMLElement | null>) {
    useEffect(() => {
        if (!open) return;
        const down = (e: MouseEvent | TouchEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
        document.addEventListener('mousedown', down);
        document.addEventListener('touchstart', down);
        document.addEventListener('keydown', key);
        return () => {
            document.removeEventListener('mousedown', down);
            document.removeEventListener('touchstart', down);
            document.removeEventListener('keydown', key);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);
}
