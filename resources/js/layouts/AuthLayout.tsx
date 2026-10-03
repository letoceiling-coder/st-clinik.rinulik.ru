import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import ToastHost from '@/components/ToastHost';
import { useClientSeo } from '@/lib/seo';
import Logo from './Logo';

export default function AuthLayout({ children }: { children: ReactNode }) {
    useClientSeo();
    return (
        <div className="auth">
            <a href="#main" className="skip-link">
                Перейти к содержимому
            </a>
            <header className="auth__top container">
                <Logo />
                <Link href="/" className="link">
                    На главную
                </Link>
            </header>
            <main id="main" tabIndex={-1} className="auth__main">
                {children}
            </main>
            <footer className="auth__foot container text-xs text-muted">
                Не указывайте в формах диагнозы и медицинские документы.
            </footer>
            <ToastHost />
        </div>
    );
}
