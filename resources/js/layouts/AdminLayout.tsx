import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import ParserActivity from '@/components/ParserActivity';
import { can } from '@/lib/auth';
import type { SharedProps } from '@/lib/types';
import DashboardShell, { type NavItem } from './DashboardShell';

const ALL: (NavItem & { perm: string })[] = [
    { href: '/admin', label: 'Обзор', icon: 'home', exact: true, group: 'Работа', perm: 'admin.dashboard' },
    { href: '/admin/appointments', label: 'Записи', icon: 'calendar', group: 'Работа', perm: 'admin.appointments' },
    { href: '/admin/reports', label: 'Отчёты', icon: 'file', group: 'Работа', perm: 'admin.reports' },
    { href: '/admin/analytics', label: 'Аналитика', icon: 'chart', group: 'Работа', perm: 'admin.analytics' },
    { href: '/admin/geography', label: 'География', icon: 'pin', group: 'Справочники', perm: 'admin.dictionaries' },
    { href: '/admin/dictionaries/regions', label: 'Регионы', icon: 'globe', group: 'Справочники', perm: 'admin.dictionaries' },
    { href: '/admin/moderation', label: 'Модерация', icon: 'shield', group: 'Работа', perm: 'admin.moderation' },
    { href: '/admin/promotions', label: 'Продвижение', icon: 'sparkle', group: 'Работа', perm: 'admin.promotions' },
    { href: '/admin/site-display', label: 'Сайт: карта и реклама', icon: 'globe', group: 'Контент и SEO', perm: 'admin.site_display' },
    { href: '/admin/tariffs', label: 'Тарифы', icon: 'ruble', group: 'Работа', perm: 'admin.tariffs' },
    { href: '/admin/finance', label: 'Финансы', icon: 'chart', group: 'Работа', perm: 'admin.finance' },
    { href: '/admin/card-bonuses', label: 'Бонусы карточек', icon: 'sparkle', group: 'Работа', perm: 'admin.promotions' },
    { href: '/admin/clinic-card-appearance', label: 'Премиум-карточки', icon: 'crown', group: 'Работа', perm: 'admin.promotions' },
    { href: '/admin/parser', label: 'Парсер', icon: 'search', group: 'Работа', perm: 'admin.parser' },
    { href: '/admin/offers', label: 'КП и демо', icon: 'send', group: 'Работа', perm: 'offers.manage' },
    { href: '/admin/campaigns', label: 'Кампании КП', icon: 'mail', group: 'Работа', perm: 'offers.manage' },
    { href: '/admin/broadcasts', label: 'Рассылки', icon: 'send', group: 'Работа', perm: 'admin.broadcasts' },
    { href: '/admin/assistant', label: 'AI-ассистент', icon: 'send', group: 'Система', perm: 'admin.assistant' },
    { href: '/admin/system', label: 'Состояние системы', icon: 'shield', group: 'Система', perm: 'admin.integrations' },
    { href: '/admin/integrations', label: 'Интеграции', icon: 'settings', group: 'Система', perm: 'admin.integrations' },
    { href: '/admin/complaints', label: 'Жалобы', icon: 'alert', group: 'Работа', perm: 'admin.complaints' },
    { href: '/admin/duplicates', label: 'Дубликаты', icon: 'refresh', group: 'Работа', perm: 'admin.duplicates' },
    { href: '/admin/clinics', label: 'Клиники', icon: 'building', group: 'Каталог', perm: 'admin.clinics' },
    { href: '/admin/doctors', label: 'Врачи', icon: 'user', group: 'Каталог', perm: 'admin.doctors' },
    { href: '/admin/reviews', label: 'Отзывы', icon: 'thumb', group: 'Каталог', perm: 'admin.reviews' },
    { href: '/admin/dictionaries/cities', label: 'Города', icon: 'pin', group: 'Справочники', perm: 'admin.dictionaries' },
    { href: '/admin/dictionaries/districts', label: 'Районы', icon: 'grid', group: 'Справочники', perm: 'admin.dictionaries' },
    { href: '/admin/dictionaries/specialties', label: 'Направления', icon: 'sparkle', group: 'Справочники', perm: 'admin.dictionaries' },
    { href: '/admin/dictionaries/services', label: 'Услуги', icon: 'tooth', group: 'Справочники', perm: 'admin.dictionaries' },
    { href: '/admin/dictionaries/concerns', label: 'Что беспокоит', icon: 'pain', group: 'Справочники', perm: 'admin.dictionaries' },
    { href: '/admin/dictionaries/clinic_property_types', label: 'Свойства клиник', icon: 'sparkle', group: 'Справочники', perm: 'admin.dictionaries' },
    { href: '/admin/dictionaries/pages', label: 'CMS-страницы', icon: 'file', group: 'Контент и SEO', perm: 'admin.cms' },
    { href: '/admin/dictionaries/seo', label: 'SEO-шаблоны', icon: 'globe', group: 'Контент и SEO', perm: 'admin.seo' },
    { href: '/admin/users', label: 'Пользователи', icon: 'users', group: 'Система', perm: 'admin.users' },
    { href: '/admin/roles', label: 'Роли и права', icon: 'lock', group: 'Система', perm: 'admin.roles' },
    { href: '/admin/audit', label: 'Журнал аудита', icon: 'list', group: 'Система', perm: 'admin.audit' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
    const { auth } = usePage<SharedProps>().props;
    const items = useMemo(() => ALL.filter((i) => can(auth?.user, i.perm)), [auth?.user]);
    return (
        <DashboardShell items={items} brandSuffix="админ-панель" mobileBrandSuffix="Админ" mobileLabel="Админ-панель">
            {children}
            {can(auth?.user, 'admin.parser') ? <ParserActivity /> : null}
        </DashboardShell>
    );
}
