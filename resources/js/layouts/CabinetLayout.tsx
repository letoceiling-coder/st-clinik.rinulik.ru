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
}

export const STATUS_LABEL: Record<string, string> = {
    draft: 'Черновик',
    pending: 'На модерации',
    published: 'Опубликована',
    rejected: 'Отклонена',
    hidden: 'Скрыта',
};
export const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'info' | undefined> = {
    draft: undefined,
    pending: 'warning',
    published: 'success',
    rejected: 'danger',
    hidden: 'info',
};

const ITEMS: NavItem[] = [
    { href: '/clinic-cabinet', label: 'Обзор', icon: 'home', exact: true, group: 'Работа' },
    { href: '/clinic-cabinet/leads', label: 'Заявки', icon: 'calendar', group: 'Работа' },
    { href: '/clinic-cabinet/reviews', label: 'Отзывы', icon: 'thumb', group: 'Работа' },
    { href: '/clinic-cabinet/stats', label: 'Статистика', icon: 'chart', group: 'Работа' },
    { href: '/clinic-cabinet/branches', label: 'Филиалы', icon: 'building', group: 'Профиль' },
    { href: '/clinic-cabinet/doctors', label: 'Врачи', icon: 'users', group: 'Профиль' },
    { href: '/clinic-cabinet/prices', label: 'Услуги и цены', icon: 'ruble', group: 'Профиль' },
    { href: '/clinic-cabinet/schedule', label: 'График работы', icon: 'clock', group: 'Профиль' },
    { href: '/clinic-cabinet/photos', label: 'Фото', icon: 'image', group: 'Профиль' },
    { href: '/clinic-cabinet/documents', label: 'Документы', icon: 'file', group: 'Профиль' },
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

export default function CabinetLayout({ children }: { children: ReactNode }) {
    return (
        <DashboardShell items={ITEMS} brandSuffix="для клиник" mobileLabel="Кабинет клиники" aside={<BranchSwitcher />}>
            {children}
        </DashboardShell>
    );
}
