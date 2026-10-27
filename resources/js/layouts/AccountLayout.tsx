import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import Icon, { type IconName } from '@/components/Icon';
import { cx } from '@/lib/format';
import type { SharedProps } from '@/lib/types';
import PublicLayout from './PublicLayout';

const ITEMS: { href: string; label: string; icon: IconName; exact?: boolean; shortLabel?: string }[] = [
    { href: '/account', label: 'Обзор', icon: 'home', exact: true },
    { href: '/account/appointments', label: 'Мои записи', shortLabel: 'Записи', icon: 'calendar' },
    { href: '/account/leads', label: 'Заявки на звонок', shortLabel: 'Заявки', icon: 'phone' },
    { href: '/account/favorites', label: 'Избранное', icon: 'heart' },
    { href: '/account/compare', label: 'Сравнение', icon: 'scale' },
    { href: '/account/history', label: 'История просмотров', shortLabel: 'История', icon: 'clock' },
    { href: '/account/reviews', label: 'Мои отзывы', shortLabel: 'Отзывы', icon: 'thumb' },
    { href: '/account/notifications', label: 'Уведомления', shortLabel: 'Уведомл.', icon: 'bell' },
    { href: '/account/profile', label: 'Профиль', icon: 'settings' },
];

export default function AccountLayout({ children }: { children: ReactNode }) {
    const { url } = usePage();
    const { auth } = usePage<SharedProps>().props;
    const path = url.split('?')[0];

    return (
        <PublicLayout>
            <div className="container account">
                <aside className="account__side">
                    <p className="account__hello">
                        Здравствуйте,
                        <br />
                        <b>{auth.user?.name}</b>
                    </p>
                    <nav aria-label="Личный кабинет" className="account__nav">
                        {ITEMS.map((i) => {
                            const active = i.exact ? path === i.href : path === i.href || path.startsWith(i.href + '/');
                            return (
                                <Link key={i.href} href={i.href} className={cx('account__link', active && 'is-active')} aria-current={active ? 'page' : undefined}>
                                    <Icon name={i.icon} size={20} />
                                    <span className="account__link-label">
                                        {i.shortLabel ? (
                                            <>
                                                <span className="account__link-label-full">{i.label}</span>
                                                <span className="account__link-label-short">{i.shortLabel}</span>
                                            </>
                                        ) : (
                                            i.label
                                        )}
                                    </span>
                                    {i.href === '/account/notifications' && auth.user?.unread ? <span className="count-badge count-badge--inline">{auth.user.unread}</span> : null}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>
                <div className="account__main">{children}</div>
            </div>
        </PublicLayout>
    );
}
