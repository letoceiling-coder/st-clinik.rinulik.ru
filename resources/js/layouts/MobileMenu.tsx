import { Link, usePage } from '@inertiajs/react';
import Icon, { type IconName } from '@/components/Icon';
import InstallAppButton from '@/components/InstallAppButton';
import { LinkButton } from '@/components/ui/Button';
import { accountHome, accountLabel } from '@/lib/auth';
import { useCity } from '@/lib/city';
import { cx } from '@/lib/format';
import type { SharedProps } from '@/lib/types';

interface Item {
    href: string;
    label: string;
    icon: IconName;
    badge?: number;
}

function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}

function Count({ n }: { n?: number }) {
    return n ? <span className="mmenu-count">{n > 99 ? '99+' : n}</span> : null;
}

/** Мобильное меню: аккаунт, каталог плитками, «моё», установка приложения и служебные ссылки. */
export default function MobileMenu({ isActive, favorites, compare }: { isActive: (href: string) => boolean; favorites: number; compare: number }) {
    const { auth } = usePage<SharedProps>().props;
    const city = useCity();
    const user = auth?.user ?? null;

    const catalog: Item[] = [
        { href: city.path('clinics'), label: 'Клиники', icon: 'building' },
        { href: city.path('doctors'), label: 'Врачи', icon: 'users' },
        { href: city.path('directions'), label: 'Направления', icon: 'tooth' },
        { href: city.path('prices'), label: 'Цены', icon: 'ruble' },
        { href: city.path('reviews'), label: 'Отзывы', icon: 'star' },
    ];
    const mine: Item[] = [
        { href: '/favorites', label: 'Избранное', icon: 'heart', badge: favorites },
        { href: '/compare', label: 'Сравнение', icon: 'scale', badge: compare },
        ...(user
            ? [
                  { href: '/account/leads', label: 'Мои записи', icon: 'calendar' as const },
                  { href: '/account/notifications', label: 'Уведомления', icon: 'bell' as const, badge: user.unread },
              ]
            : []),
    ];
    const service: Item[] = [
        { href: '/for-clinics', label: 'Для клиник', icon: 'award' },
        { href: '/about', label: 'О сервисе', icon: 'info' },
        { href: '/review-rules', label: 'Правила отзывов', icon: 'shield' },
    ];

    return (
        <div className="mmenu">
            {user ? (
                <Link href={accountHome(user)} className="mmenu-user">
                    <span className="mmenu-user__avatar" aria-hidden="true">
                        {initials(user.name) || <Icon name="user" size={20} />}
                    </span>
                    <span className="mmenu-user__text">
                        <b>{user.name}</b>
                        <span>{accountLabel(user)}</span>
                    </span>
                    <Icon name="chevron-right" size={18} />
                </Link>
            ) : (
                <div className="mmenu-auth">
                    <p>Войдите, чтобы записываться онлайн, хранить избранное и получать напоминания.</p>
                    <div className="mmenu-auth__actions">
                        <LinkButton href="/login" icon="user">
                            Войти
                        </LinkButton>
                        <LinkButton href="/register" variant="outline">
                            Регистрация
                        </LinkButton>
                    </div>
                </div>
            )}

            <section className="mmenu__section" aria-labelledby="mmenu-catalog">
                <h3 id="mmenu-catalog" className="mmenu__title">
                    Каталог {city.nameIn}
                </h3>
                <ul className="mmenu-tiles">
                    {catalog.map((item) => (
                        <li key={item.href}>
                            <Link href={item.href} className={cx('mmenu-tile', isActive(item.href) && 'is-active')} aria-current={isActive(item.href) ? 'page' : undefined}>
                                <Icon name={item.icon} size={22} />
                                <span>{item.label}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>

            <section className="mmenu__section" aria-labelledby="mmenu-mine">
                <h3 id="mmenu-mine" className="mmenu__title">
                    Моё
                </h3>
                <ul className="mmenu-list">
                    {mine.map((item) => (
                        <li key={item.href}>
                            <Link href={item.href} className={cx('mmenu-row', isActive(item.href) && 'is-active')}>
                                <Icon name={item.icon} size={20} />
                                <span>{item.label}</span>
                                <Count n={item.badge} />
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>

            <InstallAppButton variant="menu" />

            <section className="mmenu__section" aria-labelledby="mmenu-service">
                <h3 id="mmenu-service" className="mmenu__title">
                    Сервис
                </h3>
                <ul className="mmenu-list">
                    {service.map((item) => (
                        <li key={item.href}>
                            <Link href={item.href} className={cx('mmenu-row', isActive(item.href) && 'is-active')}>
                                <Icon name={item.icon} size={20} />
                                <span>{item.label}</span>
                            </Link>
                        </li>
                    ))}
                    {user ? (
                        <li>
                            <Link href="/logout" method="post" as="button" className="mmenu-row mmenu-row--muted">
                                <Icon name="logout" size={20} />
                                <span>Выйти</span>
                            </Link>
                        </li>
                    ) : null}
                </ul>
            </section>
        </div>
    );
}
