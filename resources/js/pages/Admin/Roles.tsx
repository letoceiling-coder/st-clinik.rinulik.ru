import { router, useForm } from '@inertiajs/react';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check, TextField } from '@/components/ui/Fields';

interface Role { slug: string; name: string; description: string | null; permissions: string[]; is_system: boolean; users: number }

export default function Roles({ roles, catalog }: { roles: Role[]; catalog: { key: string; label: string }[] }) {
    const create = useForm({ slug: '', name: '', description: '', permissions: [] as string[] });
    return (
        <div className="stack-lg">
            <PageHead title="Роли и права" />
            {roles.map((r) => <RoleCard key={r.slug} role={r} catalog={catalog} />)}
            <form className="card stack" onSubmit={(e) => { e.preventDefault(); create.post('/admin/roles', { onSuccess: () => create.reset() }); }}>
                <h2 className="card-title">Новая роль</h2>
                <TextField label="Ключ" required value={create.data.slug} onChange={(e) => create.setData('slug', e.target.value)} error={create.errors.slug} />
                <TextField label="Название" required value={create.data.name} onChange={(e) => create.setData('name', e.target.value)} />
                <TextField label="Описание" value={create.data.description} onChange={(e) => create.setData('description', e.target.value)} />
                <Perms catalog={catalog} value={create.data.permissions} onChange={(permissions) => create.setData('permissions', permissions)} />
                <Button type="submit" loading={create.processing}>Создать</Button>
            </form>
        </div>
    );
}

function RoleCard({ role, catalog }: { role: Role; catalog: { key: string; label: string }[] }) {
    const form = useForm({ name: role.name, description: role.description ?? '', permissions: role.permissions ?? [] });
    return (
        <form className="card stack" onSubmit={(e) => { e.preventDefault(); form.put(`/admin/roles/${role.slug}`); }}>
            <div className="row row--between">
                <div>
                    <h2>{role.name}</h2>
                    <p className="text-sm text-muted">{role.slug} · пользователей: {role.users}</p>
                </div>
                {!role.is_system ? <Button type="button" variant="ghost" size="sm" onClick={() => confirm('Удалить роль?') && router.delete(`/admin/roles/${role.slug}`)}>Удалить</Button> : null}
            </div>
            <TextField label="Название" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
            <TextField label="Описание" value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
            <Perms catalog={catalog} value={form.data.permissions} onChange={(permissions) => form.setData('permissions', permissions)} disabled={role.slug === 'superadmin'} />
            {role.slug !== 'superadmin' ? <Button type="submit" size="sm" loading={form.processing}>Сохранить права</Button> : <p className="text-sm text-muted">Права суперадмина не редактируются.</p>}
        </form>
    );
}

function Perms({ catalog, value, onChange, disabled }: { catalog: { key: string; label: string }[]; value: string[]; onChange: (v: string[]) => void; disabled?: boolean }) {
    return (
        <div className="check-grid">
            {catalog.map((p) => (
                <Check key={p.key} label={p.label} disabled={disabled} checked={value.includes(p.key)} onChange={() => onChange(value.includes(p.key) ? value.filter((k) => k !== p.key) : [...value, p.key])} />
            ))}
        </div>
    );
}
