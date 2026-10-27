import { Head, Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Icon, { type IconName } from '@/components/Icon';
import { LeadProvider } from '@/components/LeadContext';
import SearchBox from '@/components/SearchBox';
import AssistantWidget from '@/components/AssistantWidget';
import ToastHost from '@/components/ToastHost';
import { Drawer } from '@/components/ui/Overlay';
import { accountHome } from '@/lib/auth';
import { useCity } from '@/lib/city';
import { cx } from '@/lib/format';
import type { SharedProps } from '@/lib/types';
import CityPicker from './CityPicker';
import Logo from './Logo';

type MaxPageProps = SharedProps & {
    maxBridgeScript?: string;
};

function useActive() {
    const { url } = usePage();
    return (href: string) => {
        const path = url.split('?')[0];
        if (path === href) {
            return true;
        }

        return href !== '/max' && path.startsWith(`${href}/`);
    };
}

/** Мини-приложение в MAX: компактная шапка (город и поиск), нижняя навигация, без подвала сайта. */
export default function MaxLayout({ children }: { children: ReactNode }) {
    const { auth, maxBridgeScript } = usePage<MaxPageProps>().props;
    const { url } = usePage();
    const city = useCity();
    const active = useActive();
    const user = auth?.user;
    const [searchOpen, setSearchOpen] = useState(false);

    useEffect(() => setSearchOpen(false), [url]);

    const tabs: { href: string; label: string; icon: IconName; action?: () => void; badge?: number }[] = [
        { href: '/max', label: 'Главная', icon: 'home' },
        { href: '#search', label: 'Поиск', icon: 'search', action: () => setSearchOpen(true) },
        { href: '/max/clinics', label: 'Клиники', icon: 'building' },
        ...(user ? [{ href: '/max/appointments', label: 'Записи', icon: 'calendar' as const }] : []),
        { href: user ? accountHome(user) : '/login', label: user ? 'Профиль' : 'Вход', icon: 'user', badge: user?.unread },
    ];

    return (
        <LeadProvider>
            <div className="max-app">
                <Head>{maxBridgeScript ? <script src={maxBridgeScript} defer /> : null}</Head>

                <header className="header max-app__header">
                    <div className="container header__row">
                        <Logo to="/max" />
                        <CityPicker />
                        <nav className="header__actions" aria-label="Действия">
                            <button type="button" className="icon-link" onClick={() => setSearchOpen(true)} aria-label="Поиск">
                                <Icon name="search" size={22} />
                            </button>
                        </nav>
                    </div>
                    <div className="header__nav hide-mobile">
                        <nav className="container" aria-label="Навигация мини-приложения">
                            <ul>
                                <li>
                                    <Link href="/max" className={cx(active('/max') && 'is-active')}>
                                        Главная
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/max/clinics" className={cx(active('/max/clinics') && 'is-active')}>
                                        Клиники {city.nameIn}
                                    </Link>
                                </li>
                                {user ? (
                                    <li>
                                        <Link href="/max/appointments" className={cx(active('/max/appointments') && 'is-active')}>
                                            Мои записи
                                        </Link>
                                    </li>
                                ) : null}
                                <li className="grow" />
                                <li>
                                    <Link href="/privacy" className="header__b2b">
                                        Конфиденциальность
                                    </Link>
                                </li>
                            </ul>
                        </nav>
                    </div>
                </header>

                <main id="main" className="main max-app__main">
                    {children}
                </main>

                <nav className="tabbar max-app__tabbar" aria-label="Навигация мини-приложения">
                    {tabs.map((t) =>
                        t.action ? (
                            <button key={t.label} type="button" onClick={t.action} className={cx('tabbar__item', searchOpen && 'is-active')}>
                                <span className="tabbar__icon">
                                    <Icon name={t.icon} size={24} />
                                </span>
                                <span>{t.label}</span>
                            </button>
                        ) : (
                            <Link key={t.label} href={t.href} className={cx('tabbar__item', active(t.href) && 'is-active')} aria-current={active(t.href) ? 'page' : undefined}>
                                <span className="tabbar__icon">
                                    <Icon name={t.icon} size={24} />
                                    {t.badge ? <span className="count-badge">{t.badge > 9 ? '9+' : t.badge}</span> : null}
                                </span>
                                <span>{t.label}</span>
                            </Link>
                        ),
                    )}
                </nav>

                <Drawer open={searchOpen} onClose={() => setSearchOpen(false)} title="Поиск">
                    <SearchBox variant="hero" autoFocus onDone={() => setSearchOpen(false)} />
                    <p className="text-sm text-muted" style={{ marginTop: 16 }}>
                        Например: «болит зуб», «имплантация», «детский стоматолог», название клиники или фамилия врача.
                    </p>
                </Drawer>

                <AssistantWidget />
                <ToastHost />
            </div>
        </LeadProvider>
    );
}
