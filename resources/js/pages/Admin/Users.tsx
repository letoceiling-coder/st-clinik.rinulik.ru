import { useForm } from '@inertiajs/react';
import { FilterBar, PageHead, PagerSafe, StatusBadge, Table } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { SearchInput, SelectField } from '@/components/ui/Fields';
import type { Paginated } from '@/lib/types';

interface User { id: number; name: string; email: string; role: string; status: string; last_login_at: string | null; created_at: string | null }

export default function Users({ users, roles, filters }: { users: Paginated<User>; roles: { slug: string; name: string }[]; filters: { q?: string; role?: string; status?: string } }) {
    return (
        <div className="stack-lg">
            <PageHead title="Пользователи" />
            <FilterBar>
                <SearchInput name="q" defaultValue={filters.q} placeholder="Имя или e-mail" />
                <SelectField name="role" label="Роль" defaultValue={filters.role ?? ''}>
                    <option value="">Все роли</option>
                    {roles.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
                </SelectField>
                <SelectField name="status" label="Статус" defaultValue={filters.status ?? ''}>
                    <option value="">Все</option>
                    <option value="active">Активен</option>
                    <option value="blocked">Заблокирован</option>
                </SelectField>
            </FilterBar>
            <Table headers={['Пользователь', 'Роль / статус', 'Вход', '']}>
                {users.data.map((u) => (
                    <UserRow key={u.id} user={u} roles={roles} />
                ))}
            </Table>
            <PagerSafe page={users} />
        </div>
    );
}

function UserRow({ user, roles }: { user: User; roles: { slug: string; name: string }[] }) {
    const form = useForm({ role: user.role, status: user.status });
    return (
        <tr>
            <td><b>{user.name}</b><div className="text-xs text-muted">{user.email}</div></td>
            <td>
                <form className="row row--wrap" onSubmit={(e) => { e.preventDefault(); form.put(`/admin/users/${user.id}`); }}>
                    <select className="select select--sm" value={form.data.role} onChange={(e) => form.setData('role', e.target.value)}>
                        {roles.map((r) => <option key={r.slug} value={r.slug}>{r.name}</option>)}
                    </select>
                    <select className="select select--sm" value={form.data.status} onChange={(e) => form.setData('status', e.target.value)}>
                        <option value="active">Активен</option>
                        <option value="blocked">Заблокирован</option>
                    </select>
                    <Button type="submit" size="sm" loading={form.processing}>OK</Button>
                </form>
            </td>
            <td>{user.last_login_at ?? '—'}</td>
            <td><StatusBadge status={user.status} /></td>
        </tr>
    );
}
