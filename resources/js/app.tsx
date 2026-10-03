import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
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
        return PublicLayout;
    },
    progress: { color: '#FA4F04', delay: 150 },
});
