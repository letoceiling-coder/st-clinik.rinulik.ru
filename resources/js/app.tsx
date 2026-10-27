import '../css/app.css';
import { createInertiaApp, router } from '@inertiajs/react';
import { registerServiceWorker } from '@/lib/pwa-install';
import { AnalyticsEvents, trackAnalyticsEvent } from '@/lib/analytics';

registerServiceWorker();

declare global {
    interface Window {
        ym?: (counterId: number, action: string, ...args: unknown[]) => void;
        ymCounterId?: number;
    }
}

// Счётчик инициализируется с defer: true, поэтому каждый просмотр (включая первый) отправляем сами.
if (typeof window !== 'undefined') {
    router.on('navigate', (event) => {
        if (window.ym && window.ymCounterId) {
            window.ym(window.ymCounterId, 'hit', event.detail.page.url, { referer: document.referrer });
        }
        const url = event.detail.page.url;
        if (!url.includes('/admin') && !url.includes('/cabinet') && !url.includes('/max')) {
            trackAnalyticsEvent(AnalyticsEvents.pageView, { path: url });
        }
    });
}
import AccountLayout from './layouts/AccountLayout';
import AdminLayout from './layouts/AdminLayout';
import AuthLayout from './layouts/AuthLayout';
import CabinetLayout from './layouts/CabinetLayout';
import MaxLayout from './layouts/MaxLayout';
import PublicLayout from './layouts/PublicLayout';

createInertiaApp({
    layout: (name: string) => {
        if (name.startsWith('Auth/')) return AuthLayout;
        if (name.startsWith('Account/')) return AccountLayout;
        if (name.startsWith('Cabinet/')) return CabinetLayout;
        if (name.startsWith('Admin/')) return AdminLayout;
        if (name.startsWith('Max/')) return MaxLayout;
        if (name === 'Error') return AuthLayout;
        return PublicLayout;
    },
    progress: { color: '#CAF65A', delay: 150 },
});
