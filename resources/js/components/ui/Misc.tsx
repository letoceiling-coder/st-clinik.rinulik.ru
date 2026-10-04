import { Link, router } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { cx, initials, ratingText } from '@/lib/format';
import type { Crumb, Paginated } from '@/lib/types';
import Icon, { type IconName } from '../Icon';

export function Badge({ children, tone, icon }: { children: ReactNode; tone?: 'success' | 'info' | 'warning' | 'danger' | 'primary' | 'dark'; icon?: IconName }) {
    return (
        <span className={cx('badge', tone && `badge--${tone}`)}>
            {icon ? <Icon name={icon} size={14} /> : null}
            {children}
        </span>
    );
}

export function Rating({ value, count, size = 'md' }: { value: number; count?: number; size?: 'sm' | 'md' | 'lg' }) {
    const has = (count ?? 1) > 0;
    return (
        <span className="rating" style={{ fontSize: size === 'lg' ? '1.5rem' : size === 'sm' ? '0.9375rem' : '1.0625rem' }}>
            <Icon name="star" size={size === 'lg' ? 26 : 18} />
            <span aria-label={has ? `Рейтинг ${ratingText(value, count ?? 1)} из 5` : 'Пока нет оценок'}>{ratingText(value, count ?? 1)}</span>
        </span>
    );
}

export function Stars({ value, size = 16 }: { value: number; size?: number }) {
    return (
        <span className="stars" role="img" aria-label={`Оценка ${value} из 5`}>
            {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={i <= Math.round(value) ? '' : 'off'}>
                    <Icon name="star" size={size} />
                </span>
            ))}
        </span>
    );
}

export function Skeleton({ w, h = 16, r, className }: { w?: number | string; h?: number | string; r?: number; className?: string }) {
    return <span className={cx('skeleton', className)} style={{ width: w ?? '100%', height: h, borderRadius: r }} aria-hidden="true" />;
}

export function EmptyState({
    icon = 'search',
    title,
    text,
    action,
}: {
    icon?: IconName;
    title: string;
    text?: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="state" role="status">
            <div className="state__icon">
                <Icon name={icon} size={32} />
            </div>
            <h3>{title}</h3>
            {text ? <p>{text}</p> : null}
            {action}
        </div>
    );
}

export function ErrorState({ title = 'Что-то пошло не так', text, action }: { title?: string; text?: ReactNode; action?: ReactNode }) {
    return (
        <div className="state state--error" role="alert">
            <div className="state__icon">
                <Icon name="alert" size={32} />
            </div>
            <h3>{title}</h3>
            {text ? <p>{text}</p> : null}
            {action}
        </div>
    );
}

export function Alert({ tone, icon, children }: { tone?: 'warning' | 'danger' | 'success' | 'muted'; icon?: IconName; children: ReactNode }) {
    const defaultIcon: IconName = tone === 'warning' || tone === 'danger' ? 'alert' : tone === 'success' ? 'check-circle' : 'info';
    return (
        <div className={cx('alert', tone && `alert--${tone}`)} role={tone === 'danger' ? 'alert' : undefined}>
            <Icon name={icon ?? defaultIcon} size={20} />
            <div>{children}</div>
        </div>
    );
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
    if (!items?.length) return null;
    return (
        <nav aria-label="Хлебные крошки" className="container">
            <ol className="breadcrumbs">
                {items.map(([label, href], i) => {
                    const last = i === items.length - 1;
                    const path = href.replace(/^https?:\/\/[^/]+/, '') || '/';
                    return (
                        <li key={href + i}>
                            {last ? <span aria-current="page">{label}</span> : <Link href={path}>{label}</Link>}
                            {last ? null : <Icon name="chevron-right" size={14} />}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

function scrollToBlock(target: string | (() => HTMLElement | null)): void {
    const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target();
    if (!el) {
        return;
    }

    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    el.scrollIntoView({ behavior, block: 'start' });
}

export function Pagination({
    page,
    only,
    keepScroll,
    param = 'page',
    scrollTo,
}: {
    page: Pick<Paginated<unknown>, 'current_page' | 'last_page' | 'path'>;
    only?: string[];
    keepScroll?: boolean;
    param?: string;
    scrollTo?: string | (() => HTMLElement | null);
}) {
    const { current_page: current, last_page: last } = page;
    if (last <= 1) return null;

    const go = (n: number) => {
        if (n === current) {
            return;
        }

        const url = new URL(window.location.href);
        if (param !== 'page') {
            url.searchParams.delete('page');
        } else {
            url.searchParams.delete('reviews_page');
        }
        if (n <= 1) {
            url.searchParams.delete(param);
        } else {
            url.searchParams.set(param, String(n));
        }

        router.get(url.pathname + url.search, {}, {
            preserveScroll: scrollTo ? false : (keepScroll ?? false),
            only,
            preserveState: true,
            replace: true,
            onSuccess: () => {
                if (scrollTo) {
                    scrollToBlock(scrollTo);
                }
            },
        });
    };

    const nums: (number | '…')[] = [];
    for (let i = 1; i <= last; i++) {
        if (i === 1 || i === last || Math.abs(i - current) <= 1) nums.push(i);
        else if (nums[nums.length - 1] !== '…') nums.push('…');
    }

    return (
        <nav className="pagination" aria-label="Страницы">
            <button className={cx('page-btn', current === 1 && 'is-disabled')} onClick={() => go(current - 1)} aria-label="Предыдущая страница" disabled={current === 1}>
                <Icon name="chevron-left" size={18} />
            </button>
            {nums.map((n, i) =>
                n === '…' ? (
                    <span key={`d${i}`} className="text-muted" aria-hidden="true">
                        …
                    </span>
                ) : (
                    <button key={n} className={cx('page-btn', n === current && 'is-active')} onClick={() => go(n)} aria-current={n === current ? 'page' : undefined} aria-label={`Страница ${n}`}>
                        {n}
                    </button>
                ),
            )}
            <button className={cx('page-btn', current === last && 'is-disabled')} onClick={() => go(current + 1)} aria-label="Следующая страница" disabled={current === last}>
                <Icon name="chevron-right" size={18} />
            </button>
        </nav>
    );
}

export function Avatar({ name }: { name: string }) {
    return (
        <span className="avatar" aria-hidden="true">
            {initials(name)}
        </span>
    );
}

export function Tabs<T extends string>({ value, items, onChange, label }: { value: T; items: { key: T; label: string; count?: number }[]; onChange: (k: T) => void; label: string }) {
    return (
        <div className="tabs" role="tablist" aria-label={label}>
            {items.map((i) => (
                <button key={i.key} role="tab" aria-selected={value === i.key} className={cx('tab', value === i.key && 'is-active')} onClick={() => onChange(i.key)}>
                    {i.label}
                    {i.count !== undefined ? <span className="text-muted"> {i.count}</span> : null}
                </button>
            ))}
        </div>
    );
}

export function SectionHead({ title, text, action }: { title: ReactNode; text?: ReactNode; action?: ReactNode }) {
    return (
        <div className="section-head">
            <div>
                <h2>{title}</h2>
                {text ? <p>{text}</p> : null}
            </div>
            {action ? <div className="section-head__action">{action}</div> : null}
        </div>
    );
}
