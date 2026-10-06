import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
import { registerServiceWorker } from '@/lib/pwa-install';

registerServiceWorker();
import AccountLayout from './layouts/AccountLayout';
import AdminLayout from './layouts/AdminLayout';
import AuthLayout from './layouts/AuthLayout';
import CabinetLayout from './layouts/CabinetLayout';
import PublicLayout from './layouts/PublicLayout';

createInertiaApp({
    layout: (name: string) => {
        if (name.startsWith('Auth/')) return AuthLayout;
        if (name.startsWith('Account/')) return AccountLayout;
        if (name.startsWith('Cabinet/')) return CabinetLayout;
        if (name.startsWith('Admin/')) return AdminLayout;
        if (name === 'Error') return AuthLayout;
        return PublicLayout;
    },
    progress: { color: '#CAF65A', delay: 150 },
});
