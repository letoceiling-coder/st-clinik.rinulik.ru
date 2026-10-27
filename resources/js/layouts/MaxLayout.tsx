import { Head, Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import Icon from '@/components/Icon';
import { LeadProvider } from '@/components/LeadContext';
import SearchBox from '@/components/SearchBox';
import AssistantWidget from '@/components/AssistantWidget';
import ToastHost from '@/components/ToastHost';
import { accountHome, accountLabel } from '@/lib/auth';
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

export default function MaxLayout({ children }: { children: ReactNode }) {
    const { auth, maxBridgeScript } = usePage<MaxPageProps>().props;
    const city = useCity();
    const active = useActive();
    const user = auth?.user;

    const tabs = [
        { href: '/max', label: 'Главная', icon: 'home' as const },
        { href: '/max/clinics', label: 'Клиники', icon: 'building' as const },
        ...(user ? [{ href: '/max/appointments', label: 'Записи', icon: 'calendar' as const }] : []),
        { href: user ? accountHome(user) : '/login', label: user ? 'Профиль' : 'Вход', icon: 'user' as const },
    ];

    return (
        <LeadProvider>
            <div className="min-h-dvh bg-[var(--surface-page)] text-[var(--text-primary)] pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
                <Head>
                    {maxBridgeScript ? <script src={maxBridgeScript} defer /> : null}
                </Head>

                <header className="header">
                    <div className="container header__row">
                        <Logo />
                        <CityPicker />
                        <div className="header__search hide-mobile">
                            <SearchBox />
                        </div>
                        <nav className="header__actions" aria-label="MAX">
                            {user ? (
                                <Link href={accountHome(user)} className="text-sm font-semibold">
                                    {accountLabel(user)}
                                </Link>
                            ) : (
                                <span className="text-xs text-muted">MAX</span>
                            )}
                        </nav>
                    </div>
                    <div className="header__nav hide-mobile">
                        <nav className="container" aria-label="MAX навигация">
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

                <main id="main" className="main">
                    {children}
                </main>

                <nav className="tabbar" aria-label="MAX навигация">
                    {tabs.map((t) => (
                        <Link key={t.href} href={t.href} className={cx('tabbar__item', active(t.href) && 'is-active')}>
                            <Icon name={t.icon} size={24} />
                            <span>{t.label}</span>
                        </Link>
                    ))}
                </nav>

                <AssistantWidget />
                <ToastHost />
            </div>
        </LeadProvider>
    );
}
