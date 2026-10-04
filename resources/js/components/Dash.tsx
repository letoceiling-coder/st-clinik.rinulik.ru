import { Link, router } from '@inertiajs/react';
import { Children, cloneElement, isValidElement, type FormEvent, type ReactElement, type ReactNode } from 'react';
import { cx } from '@/lib/format';
import type { Paginated } from '@/lib/types';
import { Button } from './ui/Button';
import { Badge } from './ui/Misc';

export const STATUS: Record<string, { label: string; tone?: 'success' | 'warning' | 'danger' | 'info' | 'primary' }> = {
    draft: { label: 'Черновик' },
    pending: { label: 'На модерации', tone: 'warning' },
    published: { label: 'Опубликовано', tone: 'success' },
    rejected: { label: 'Отклонено', tone: 'danger' },
    hidden: { label: 'Скрыто', tone: 'info' },
    active: { label: 'Активен', tone: 'success' },
    blocked: { label: 'Заблокирован', tone: 'danger' },
    new: { label: 'Новая', tone: 'primary' },
    confirmed: { label: 'Подтверждена', tone: 'info' },
    completed: { label: 'Состоялась', tone: 'success' },
    cancelled: { label: 'Отменена' },
    no_show: { label: 'Не пришёл', tone: 'warning' },
    open: { label: 'Открыта', tone: 'warning' },
    upheld: { label: 'Подтверждена', tone: 'success' },
};

export function StatusBadge({ status }: { status: string }) {
    const s = STATUS[status];
    return <Badge tone={s?.tone}>{s?.label ?? status}</Badge>;
}

export function PageHead({ title, text, action }: { title: string; text?: ReactNode; action?: ReactNode }) {
    return (
        <div className="page-head page-head--dash">
            <div>
                <h1>{title}</h1>
                {text ? <p className="text-muted">{text}</p> : null}
            </div>
            {action}
        </div>
    );
}

export function Kpis({ items }: { items: { label: string; value: ReactNode; hint?: string }[] }) {
    return (
        <dl className="kpi-grid">
            {items.map((i) => (
                <div key={i.label} className="kpi card">
                    <dt>{i.label}</dt>
                    <dd>{i.value}</dd>
                    {i.hint ? <span className="text-xs text-muted">{i.hint}</span> : null}
                </div>
            ))}
        </dl>
    );
}

export function Panel({ title, action, children }: { title?: ReactNode; action?: ReactNode; children: ReactNode }) {
    return (
        <section className="card stack">
            {title || action ? (
                <div className="row row--between">
                    {title ? <h2 className="card-title" style={{ margin: 0 }}>{title}</h2> : <span />}
                    {action}
                </div>
            ) : null}
            {children}
        </section>
    );
}

export function FilterBar({ action = '', children }: { action?: string; children: ReactNode }) {
    const submit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget).entries());
        router.get(action || window.location.pathname, data, { preserveState: true, replace: true });
    };
    return (
        <form className="filter-bar" onSubmit={submit}>
            {children}
            <Button type="submit" variant="dark" size="sm">
                Найти
            </Button>
        </form>
    );
}

function labelRows(headers: string[], children: ReactNode): ReactNode {
    return Children.map(children, (row) => {
        if (!isValidElement(row)) {
            return row;
        }

        const cells = Children.toArray(row.props.children);
        return cloneElement(
            row as ReactElement<{ children?: ReactNode }>,
            {},
            cells.map((cell, index) => {
                if (!isValidElement(cell)) {
                    return cell;
                }

                if (cell.props['data-label'] !== undefined) {
                    return cell;
                }

                return cloneElement(cell as ReactElement<{ 'data-label'?: string }>, {
                    'data-label': headers[index] ?? '',
                });
            }),
        );
    });
}

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
    return (
        <div className="table-wrap">
            <table className="table table--responsive">
                <thead>
                    <tr>
                        {headers.map((h, index) => (
                            <th key={`${h}-${index}`} scope="col">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>{labelRows(headers, children)}</tbody>
            </table>
        </div>
    );
}

export function PagerSafe({ page }: { page?: Paginated<unknown> }) {
    if (!page || page.last_page <= 1) return null;
    return (
        <nav className="pagination" aria-label="Страницы">
            {page.prev_page_url ? (
                <Link href={page.prev_page_url} className="page-btn" preserveState>
                    Назад
                </Link>
            ) : (
                <span className="page-btn is-disabled">Назад</span>
            )}
            <span className="text-sm text-muted">
                {page.current_page} / {page.last_page}
            </span>
            {page.next_page_url ? (
                <Link href={page.next_page_url} className="page-btn" preserveState>
                    Вперёд
                </Link>
            ) : (
                <span className="page-btn is-disabled">Вперёд</span>
            )}
        </nav>
    );
}
