import type { SharedUser } from './types';

export const can = (user: SharedUser | null | undefined, permission: string): boolean =>
    !!user && (user.permissions.includes('*') || user.permissions.includes(permission));

export const isStaff = (user: SharedUser | null | undefined): boolean => !!user && user.permissions.length > 0;

export const isOwner = (user: SharedUser | null | undefined): boolean => !!user && user.role === 'clinic_owner';

export function accountHome(user: SharedUser): string {
    if (isStaff(user)) return '/admin';
    if (isOwner(user)) return '/clinic-cabinet';
    return '/account';
}

export function accountLabel(user: SharedUser): string {
    if (isStaff(user)) return 'Админ-панель';
    if (isOwner(user)) return 'Кабинет клиники';
    return 'Личный кабинет';
}
