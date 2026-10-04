import { Link, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Icon, { type IconName } from '@/components/Icon';
import { LeadProvider } from '@/components/LeadContext';
import SearchBox from '@/components/SearchBox';
import ToastHost from '@/components/ToastHost';
import { Button, LinkButton } from '@/components/ui/Button';
import { Drawer, useDismiss } from '@/components/ui/Overlay';
import { accountHome, accountLabel } from '@/lib/auth';
import { useCity } from '@/lib/city';
import { useCollections, useGuestSync } from '@/lib/collections';
import { cx } from '@/lib/format';
import { useClientSeo } from '@/lib/seo';
import type { SharedProps } from '@/lib/types';
import CityPicker from './CityPicker';
import Logo from './Logo';

function useActive() {
    const { url } = usePage();
    return (href: string) => {
        const path = url.split('?')[0];
        return href === '/' ? path === '/' : path === href || path.startsWith(href + '/');
    };
}

function Badge({ n }: { n: number }) {
    return n > 0 ? <span className="count-badge" aria-label={`${n}`}>{n > 9 ? '9+' : n}</span> : null;
}

function UserMenu() {
    const { auth } = usePage<SharedProps>().props;
    const user = auth?.user;
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useDismiss(open, () => setOpen(false), ref);

    if (!user) {
        return (
            <LinkButton href="/login" variant="dark" size="sm" icon="user" className="hide-mobile">
                Войти
            </LinkButton>
        );
    }

    return (
        <div className="menu" ref={ref}>
            <button type="button" className="icon-link" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-label="Меню профиля">
                <Icon name="user" size={22} />
                <Badge n={user.unread} />
            </button>
            {open ? (
                <div className="menu__panel" role="menu">
                    <div className="menu__who">
                        <b>{user.name}</b>
                        <span className="text-xs text-muted">{user.email}</span>
                    </div>
                    <Link role="menuitem" href={accountHome(user)} onClick={() => setOpen(false)}>
                        <Icon name="home" size={18} /> {accountLabel(user)}
                    </Link>
                    {accountHome(user) !== '/account' ? (
                        <Link role="menuitem" href="/account" onClick={() => setOpen(false)}>
                            <Icon name="user" size={18} /> Мой профиль
                        </Link>
                    ) : null}
                    <Link role="menuitem" href="/account/leads" onClick={() => setOpen(false)}>
                        <Icon name="calendar" size={18} /> Мои записи
                    </Link>
                    <Link role="menuitem" href="/account/notifications" onClick={() => setOpen(false)}>
                        <Icon name="bell" size={18} /> Уведомления
                        <Badge n={user.unread} />
                    </Link>
                    <Link role="menuitem" href="/logout" method="post" as="button" onClick={() => setOpen(false)}>
                        <Icon name="logout" size={18} /> Выйти
                    </Link>
                </div>
            ) : null}
        </div>
    );
}

function CookieBanner() {
    const [show, setShow] = useState(false);
    useEffect(() => {
        try {
            if (!localStorage.getItem('stk.cookie')) setShow(true);
        } catch {
            /* без хранилища баннер не показываем */
        }
    }, []);
    if (!show) return null;
    return (
        <div className="cookie" role="region" aria-label="Уведомление о cookie">
            <Icon name="cookie" size={24} />
            <p>
                Мы используем только необходимые cookie: город, сессия и избранное. Подробнее — в{' '}
                <Link href="/privacy" className="link">
                    политике конфиденциальности
                </Link>
                .
            </p>
            <Button
                size="sm"
                onClick={() => {
                    try {
                        localStorage.setItem('stk.cookie', '1');
                    } catch {
                        /* ignore */
                    }
                    setShow(false);
                }}
            >
                Понятно
            </Button>
        </div>
    );
}

function Footer() {
    const city = useCity();
    return (
        <footer className="footer">
            <div className="container footer__grid">
                <div className="footer__brand">
                    <Logo />
                    <p className="text-sm text-muted">Сервис поиска стоматологических клиник и врачей по всей России. Сравнивайте цены, читайте проверенные отзывы и записывайтесь онлайн.</p>
                </div>
                <nav aria-label="Каталог">
                    <h2 className="footer__title">Каталог</h2>
                    <ul>
                        <li><Link href={city.path('clinics')}>Клиники</Link></li>
                        <li><Link href={city.path('doctors')}>Врачи</Link></li>
                        <li><Link href={city.path('directions')}>Направления</Link></li>
                        <li><Link href={city.path('prices')}>Цены на услуги</Link></li>
                        <li><Link href={city.path('reviews')}>Отзывы</Link></li>
                    </ul>
                </nav>
                <nav aria-label="Пользователям">
                    <h2 className="footer__title">Пользователям</h2>
                    <ul>
                        <li><Link href="/favorites">Избранное</Link></li>
                        <li><Link href="/compare">Сравнение</Link></li>
                        <li><Link href="/review-rules">Правила отзывов</Link></li>
                        <li><Link href="/about">О сервисе</Link></li>
                    </ul>
                </nav>
                <nav aria-label="Клиникам и документы">
                    <h2 className="footer__title">Клиникам</h2>
                    <ul>
                        <li><Link href="/for-clinics">Подключить клинику</Link></li>
                        <li><Link href="/login">Кабинет клиники</Link></li>
                        <li><Link href="/privacy">Политика конфиденциальности</Link></li>
                        <li><Link href="/consent">Согласие на обработку данных</Link></li>
                        <li><Link href="/terms">Пользовательское соглашение</Link></li>
                    </ul>
                </nav>
            </div>
            <div className="container footer__legal">
                <p>
                    Информация на сайте носит справочный характер и не является медицинской консультацией или публичной офертой. Цены указаны «от», окончательную стоимость лечения называет врач после осмотра. Имеются противопоказания, необходима консультация специалиста.
                </p>
                <p>
                    Не отправляйте через сайт диагнозы, результаты анализов и медицинские документы. © {new Date().getFullYear()} СтомКлиник.
                </p>
            </div>
        </footer>
    );
}

export default function PublicLayout({ children, bare }: { children: ReactNode; bare?: boolean }) {
    const city = useCity();
    const { auth } = usePage<SharedProps>().props;
    const active = useActive();
    const { count } = useCollections();
    const [menu, setMenu] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const { url } = usePage();

    useClientSeo();
    useGuestSync();

    useEffect(() => {
        setMenu(false);
        setSearchOpen(false);
    }, [url]);

    const nav: { href: string; label: string }[] = [
        { href: city.path('clinics'), label: 'Клиники' },
        { href: city.path('doctors'), label: 'Врачи' },
        { href: city.path('directions'), label: 'Направления' },
        { href: city.path('prices'), label: 'Цены' },
        { href: city.path('reviews'), label: 'Отзывы' },
    ];
    const favCount = count('favorite');
    const cmpCount = count('compare');

    const tabs: { href: string; label: string; icon: IconName; badge?: number; action?: () => void }[] = [
        { href: '/', label: 'Главная', icon: 'home' },
        { href: '#search', label: 'Поиск', icon: 'search', action: () => setSearchOpen(true) },
        { href: city.path('clinics'), label: 'Клиники', icon: 'building' },
        { href: '/favorites', label: 'Избранное', icon: 'heart', badge: favCount },
        { href: '/account', label: 'Профиль', icon: 'user' },
    ];

    return (
        <LeadProvider>
            <a href="#main" className="skip-link">
                Перейти к содержимому
            </a>

            <header className="header">
                <div className="container header__row">
                    <Logo />
                    <CityPicker />
                    <div className="header__search hide-mobile">
                        <SearchBox />
                    </div>
                    <nav className="header__actions" aria-label="Быстрые действия">
                        <Link href="/favorites" className="icon-link hide-mobile" aria-label={`Избранное${favCount ? `, ${favCount}` : ''}`}>
                            <Icon name="heart" size={22} />
                            <Badge n={favCount} />
                        </Link>
                        <Link href="/compare" className="icon-link hide-mobile" aria-label={`Сравнение${cmpCount ? `, ${cmpCount}` : ''}`}>
                            <Icon name="scale" size={22} />
                            <Badge n={cmpCount} />
                        </Link>
                        <UserMenu />
                        <button type="button" className="icon-link show-mobile" onClick={() => setMenu(true)} aria-label="Открыть меню">
                            <Icon name="menu" size={24} />
                        </button>
                    </nav>
                </div>
                <div className="header__nav hide-mobile">
                    <nav className="container" aria-label="Основная навигация">
                        <ul>
                            {nav.map((n) => (
                                <li key={n.href}>
                                    <Link href={n.href} className={cx(active(n.href) && 'is-active')} aria-current={active(n.href) ? 'page' : undefined}>
                                        {n.label}
                                    </Link>
                                </li>
                            ))}
                            <li className="grow" />
                            <li>
                                <Link href="/for-clinics" className="header__b2b">
                                    Для клиник
                                </Link>
                            </li>
                        </ul>
                    </nav>
                </div>
            </header>

            <main id="main" tabIndex={-1} className={cx('main', bare && 'main--bare')}>
                {children}
            </main>

            <Footer />

            <nav className="tabbar" aria-label="Мобильная навигация">
                {tabs.map((t) =>
                    t.action ? (
                        <button key={t.label} type="button" onClick={t.action} className="tabbar__item">
                            <Icon name={t.icon} size={24} />
                            <span>{t.label}</span>
                        </button>
                    ) : (
                        <Link key={t.label} href={t.href} className={cx('tabbar__item', active(t.href) && 'is-active')} aria-current={active(t.href) ? 'page' : undefined}>
                            <span className="tabbar__icon">
                                <Icon name={t.icon} size={24} />
                                <Badge n={t.badge ?? 0} />
                            </span>
                            <span>{t.label}</span>
                        </Link>
                    ),
                )}
            </nav>

            <Drawer open={menu} onClose={() => setMenu(false)} title="Меню">
                <ul className="drawer-nav">
                    {nav.map((n) => (
                        <li key={n.href}>
                            <Link href={n.href}>{n.label}</Link>
                        </li>
                    ))}
                    <li>
                        <Link href="/favorites">Избранное {favCount ? `(${favCount})` : ''}</Link>
                    </li>
                    <li>
                        <Link href="/compare">Сравнение {cmpCount ? `(${cmpCount})` : ''}</Link>
                    </li>
                    <li>
                        <Link href="/for-clinics">Для клиник</Link>
                    </li>
                    <li>
                        <Link href="/about">О сервисе</Link>
                    </li>
                    <li>{auth?.user ? <Link href={accountHome(auth.user)}>{accountLabel(auth.user)}</Link> : <Link href="/login">Войти</Link>}</li>
                </ul>
            </Drawer>

            <Drawer open={searchOpen} onClose={() => setSearchOpen(false)} title="Поиск" side="right">
                <SearchBox variant="hero" autoFocus onDone={() => setSearchOpen(false)} />
                <p className="text-sm text-muted" style={{ marginTop: 16 }}>
                    Например: «болит зуб», «имплантация», «детский стоматолог», название клиники или фамилия врача.
                </p>
            </Drawer>

            <CookieBanner />
            <ToastHost />
        </LeadProvider>
    );
}
