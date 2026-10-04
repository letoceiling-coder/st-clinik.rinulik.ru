import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Icon, { type IconName } from '@/components/Icon';
import ToastHost from '@/components/ToastHost';
import { Drawer } from '@/components/ui/Overlay';
import { accountLabel } from '@/lib/auth';
import { cx } from '@/lib/format';
import { useClientSeo } from '@/lib/seo';
import type { SharedProps } from '@/lib/types';
import Logo from './Logo';

export interface NavItem {
    href: string;
    label: string;
    icon: IconName;
    badge?: number;
    group?: string;
    /** точное совпадение пути */
    exact?: boolean;
}

function isActive(url: string, item: NavItem) {
    const path = url.split('?')[0];
    return item.exact ? path === item.href : path === item.href || path.startsWith(item.href + '/');
}

export function SideNav({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
    const { url } = usePage();
    const groups: Record<string, NavItem[]> = {};
    items.forEach((i) => (groups[i.group ?? ''] ||= []).push(i));

    return (
        <nav className="sidenav" aria-label="Разделы кабинета">
            {Object.entries(groups).map(([group, list]) => (
                <div key={group} className="sidenav__group">
                    {group ? <div className="sidenav__title">{group}</div> : null}
                    <ul>
                        {list.map((i) => {
                            const active = isActive(url, i);
                            return (
                                <li key={i.href}>
                                    <Link href={i.href} className={cx('sidenav__link', active && 'is-active')} aria-current={active ? 'page' : undefined} onClick={onNavigate}>
                                        <Icon name={i.icon} size={20} />
                                        <span>{i.label}</span>
                                        {i.badge ? <span className="count-badge count-badge--inline">{i.badge}</span> : null}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </nav>
    );
}

export default function DashboardShell({
    children,
    items,
    brandSuffix,
    mobileBrandSuffix,
    aside,
    mobileLabel,
}: {
    children: ReactNode;
    items: NavItem[];
    brandSuffix: string;
    mobileBrandSuffix?: string;
    aside?: ReactNode;
    mobileLabel: string;
}) {
    const { auth, demo } = usePage<SharedProps>().props;
    const user = auth?.user;
    const { url } = usePage();
    const [open, setOpen] = useState(false);
    useClientSeo();

    useEffect(() => setOpen(false), [url]);

    useEffect(() => {
        const html = document.documentElement;
        const { body } = document;
        const prevHtmlOverflow = html.style.overflow;
        const prevBodyOverflow = body.style.overflow;

        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';

        return () => {
            html.style.overflow = prevHtmlOverflow;
            body.style.overflow = prevBodyOverflow;
        };
    }, []);

    const current = items.find((i) => isActive(url, i));

    return (
        <>
            <a href="#main" className="skip-link">
                Перейти к содержимому
            </a>
            <div className="shell">
                <header className="shell__top">
                    <div className="shell__top-row">
                        <button type="button" className="icon-link show-tablet" onClick={() => setOpen(true)} aria-label={`Открыть меню: ${mobileLabel}`}>
                            <Icon name="menu" size={24} />
                        </button>
                        <Logo suffix={brandSuffix} mobileSuffix={mobileBrandSuffix ?? brandSuffix} />
                        <span className="grow" />
                        <Link href="/" className="btn btn--outline btn--sm hide-mobile">
                            На сайт
                        </Link>
                        {user ? (
                            <div className="shell__user hide-mobile">
                                <span className="text-sm">
                                    <b>{user.name}</b>
                                    <br />
                                    <span className="text-muted text-xs">{accountLabel(user)}</span>
                                </span>
                            </div>
                        ) : null}
                        <Link href="/logout" method="post" as="button" className="btn btn--ghost btn--sm" type="button">
                            <Icon name="logout" size={18} /> <span className="hide-mobile">Выйти</span>
                        </Link>
                    </div>
                </header>
                {demo ? (
                    <div className="demo-banner" role="status">
                        <Icon name="info" size={18} />
                        <span>
                            <b>{demo.label}</b> — демонстрационный режим для согласования функционала и дизайна. Изменения могут сохраняться в системе.
                        </span>
                    </div>
                ) : null}
                <div className="shell__body container container--wide">
                    <aside className="shell__side hide-tablet">
                        {aside}
                        <SideNav items={items} />
                    </aside>
                    <main id="main" tabIndex={-1} className="shell__main">
                        <div className="show-tablet shell__crumb">
                            <button type="button" className="chip" onClick={() => setOpen(true)}>
                                <Icon name="menu" size={16} /> {current?.label ?? mobileLabel}
                            </button>
                        </div>
                        {children}
                    </main>
                </div>
            </div>

            <Drawer open={open} onClose={() => setOpen(false)} title={mobileLabel} side="left">
                {aside}
                <SideNav items={items} onNavigate={() => setOpen(false)} />
            </Drawer>
            <ToastHost />
        </>
    );
}
