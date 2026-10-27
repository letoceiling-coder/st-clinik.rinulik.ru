import { Link, router, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { SelectField } from '@/components/ui/Fields';
import { Badge } from '@/components/ui/Misc';
import type { SharedProps } from '@/lib/types';
import DashboardShell, { type NavItem } from './DashboardShell';

export interface CabinetProps {
    organization: { name: string };
    branches: { id: number; name: string; address: string; status: string }[];
    branch: { id: number; name: string; status: string; slug: string; completeness: number } | null;
    abilities?: string[];
}

export const STATUS_LABEL: Record<string, string> = {
    draft: 'Черновик',
    pending: 'На модерации',
    approved: 'Одобрен',
    published: 'Опубликована',
    rejected: 'Отклонена',
    hidden: 'Скрыта',
    blocked: 'Заблокирована',
};
export const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | undefined> = {
    draft: undefined,
    pending: 'warning',
    approved: 'info',
    published: 'success',
    rejected: 'danger',
    hidden: 'info',
    blocked: 'danger',
};

type CabinetNavItem = NavItem & { ability?: string | null };

const ITEMS: CabinetNavItem[] = [
    { href: '/clinic-cabinet', label: 'Обзор', icon: 'home', exact: true, group: 'Работа', ability: null },
    { href: '/clinic-cabinet/calendar', label: 'Календарь', icon: 'calendar', group: 'Работа', ability: 'manage_operations' },
    { href: '/clinic-cabinet/leads', label: 'Заявки', icon: 'phone', group: 'Работа', ability: 'manage_operations' },
    { href: '/clinic-cabinet/reviews', label: 'Отзывы', icon: 'thumb', group: 'Работа', ability: 'manage_operations' },
    { href: '/clinic-cabinet/stats', label: 'Статистика', icon: 'chart', group: 'Работа', ability: null },
    { href: '/clinic-cabinet/organization', label: 'Организация', icon: 'building', group: 'Профиль', ability: 'manage_organization' },
    { href: '/clinic-cabinet/staff', label: 'Сотрудники', icon: 'users', group: 'Профиль', ability: 'manage_staff' },
    { href: '/clinic-cabinet/branches', label: 'Филиалы', icon: 'building', group: 'Профиль', ability: 'manage_content' },
    { href: '/clinic-cabinet/doctors', label: 'Врачи', icon: 'users', group: 'Профиль', ability: 'manage_content' },
    { href: '/clinic-cabinet/prices', label: 'Услуги и цены', icon: 'ruble', group: 'Профиль', ability: 'manage_content' },
    { href: '/clinic-cabinet/schedule', label: 'График работы', icon: 'clock', group: 'Профиль', exact: true, ability: 'manage_schedule' },
    { href: '/clinic-cabinet/schedule/doctors', label: 'Расписание врачей', icon: 'clock', group: 'Профиль', ability: 'manage_schedule' },
    { href: '/clinic-cabinet/photos', label: 'Фото', icon: 'image', group: 'Профиль', ability: 'manage_content' },
    { href: '/clinic-cabinet/posts', label: 'Новости и акции', icon: 'flash', group: 'Профиль', ability: 'manage_content' },
    { href: '/clinic-cabinet/card-bonuses', label: 'Бонусы на карточке', icon: 'sparkle', group: 'Профиль', ability: 'manage_content' },
    { href: '/clinic-cabinet/payments', label: 'Тариф и платежи', icon: 'ruble', group: 'Работа', ability: 'manage_billing' },
    { href: '/clinic-cabinet/promotions', label: 'Продвижение', icon: 'sparkle', group: 'Работа', ability: 'manage_promotions' },
    { href: '/clinic-cabinet/broadcasts', label: 'Рассылки', icon: 'send', group: 'Работа', ability: 'manage_promotions' },
    { href: '/clinic-cabinet/documents', label: 'Документы', icon: 'file', group: 'Профиль', ability: 'manage_content' },
    { href: '/clinic-cabinet/settings', label: 'Настройки', icon: 'settings', group: 'Профиль', ability: null },
];

function BranchSwitcher() {
    const { cabinet } = usePage<SharedProps & { cabinet?: CabinetProps }>().props;
    if (!cabinet) return null;
    const { branch, branches, organization } = cabinet;

    const change = (id: string) => {
        const url = new URL(window.location.href);
        const path = url.pathname.includes('/branches/') ? '/clinic-cabinet' : url.pathname;
        router.get(path, { branch: id });
    };

    return (
        <div className="cabinet-switch">
            <div className="text-xs text-muted">{organization.name}</div>
            {branches.length > 0 ? (
                <SelectField label="Филиал" value={branch?.id ?? ''} onChange={(e) => change(e.target.value)}>
                    {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                            {b.name}
                        </option>
                    ))}
                </SelectField>
            ) : (
                <Link href="/clinic-cabinet/branches/create" className="btn btn--primary btn--sm btn--block">
                    Добавить филиал
                </Link>
            )}
            {branch ? (
                <>
                    <div className="row row--wrap" style={{ gap: 8 }}>
                        <Badge tone={STATUS_TONE[branch.status]}>{STATUS_LABEL[branch.status] ?? branch.status}</Badge>
                        {branch.status === 'published' ? (
                            <Link href={`/clinics/${branch.slug}`} className="link text-sm">
                                Страница на сайте
                            </Link>
                        ) : null}
                    </div>
                    <div>
                        <div className="row" style={{ justifyContent: 'space-between' }}>
                            <span className="text-sm">Заполненность профиля</span>
                            <b className="text-sm">{branch.completeness}%</b>
                        </div>
                        <div className="progress" role="progressbar" aria-valuenow={branch.completeness} aria-valuemin={0} aria-valuemax={100} aria-label="Заполненность профиля">
                            <span style={{ width: `${branch.completeness}%` }} />
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}

function sectionOf(href: string) {
    return href.split('/')[2] ?? 'dashboard';
}

function visibleItems(items: CabinetNavItem[], abilities: string[] | undefined, demoSections: string[] | undefined): NavItem[] {
    let list = items;
    if (demoSections) {
        list = list.filter((i) => demoSections.includes(sectionOf(i.href)));
    } else if (abilities && abilities.length > 0) {
        list = list.filter((i) => i.ability === null || i.ability === undefined || abilities.includes(i.ability));
    }
    return list;
}

export default function CabinetLayout({ children }: { children: ReactNode }) {
    const { demo, cabinet } = usePage<SharedProps & { cabinet?: CabinetProps }>().props;
    const items = visibleItems(ITEMS, cabinet?.abilities, demo?.sections);

    return (
        <DashboardShell items={items} brandSuffix="для клиник" mobileBrandSuffix="Клиника" mobileLabel="Кабинет клиники" aside={<BranchSwitcher />}>
            {children}
        </DashboardShell>
    );
}
