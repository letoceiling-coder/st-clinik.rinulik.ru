import { router, useForm } from '@inertiajs/react';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Fields';
import { Alert } from '@/components/ui/Misc';
import { cx } from '@/lib/format';

interface Role {
    slug: string;
    name: string;
    description: string | null;
    permissions: string[];
    is_system: boolean;
    is_site: boolean;
    users: number;
    editable: boolean;
    is_own: boolean;
}

interface Permission {
    key: string;
    label: string;
    group: string;
    hint: string | null;
    sensitive: string | null;
    grantable: boolean;
}

interface Props {
    roles: Role[];
    catalog: Permission[];
    groups: Record<string, string>;
    sensitiveLabels: Record<string, string>;
    isSuperadmin: boolean;
}

export default function Roles({ roles, catalog, groups, sensitiveLabels, isSuperadmin }: Props) {
    const create = useForm({ slug: '', name: '', description: '', permissions: [] as string[] });
    const staffRoles = roles.filter((r) => !r.is_site);
    const siteRoles = roles.filter((r) => r.is_site);

    return (
        <div className="stack-lg">
            <PageHead
                title="Роли и права"
                text="Роль определяет, какие разделы админ-панели видит сотрудник. Права проверяются и в меню, и на сервере."
            />
            {!isSuperadmin ? (
                <Alert tone="muted">Вы можете выдавать только те права, что есть у вас самих, и не можете менять свою роль. Роли с большими правами меняет суперадмин.</Alert>
            ) : null}

            <section className="stack">
                <h2 style={{ margin: 0 }}>Сотрудники админ-панели</h2>
                {staffRoles.map((r) => (
                    <RoleCard key={r.slug} role={r} catalog={catalog} groups={groups} sensitiveLabels={sensitiveLabels} />
                ))}
            </section>

            <section className="stack">
                <h2 style={{ margin: 0 }}>Роли сайта</h2>
                <p className="text-sm text-muted" style={{ margin: 0 }}>
                    Эти роли не дают доступа в админ-панель. Права сотрудников клиники (администратор, врач и т. д.) настраивает сама клиника в своём кабинете.
                </p>
                <div className="roles-site">
                    {siteRoles.map((r) => (
                        <div key={r.slug} className="card roles-site__item">
                            <b>{r.name}</b>
                            <span className="text-sm text-muted">{r.description}</span>
                            <span className="text-xs text-muted">
                                {r.slug} · пользователей: {r.users}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            <form
                className="card stack"
                onSubmit={(e) => {
                    e.preventDefault();
                    create.post('/admin/roles', { preserveScroll: true, onSuccess: () => create.reset() });
                }}
            >
                <h2 className="card-title">Новая роль</h2>
                <div className="form-grid">
                    <TextField label="Ключ" hint="Латиница, например: call_center" required value={create.data.slug} onChange={(e) => create.setData('slug', e.target.value)} error={create.errors.slug} />
                    <TextField label="Название" required value={create.data.name} onChange={(e) => create.setData('name', e.target.value)} error={create.errors.name} />
                    <TextField className="span-2" label="Описание — чем занимается сотрудник" value={create.data.description} onChange={(e) => create.setData('description', e.target.value)} />
                </div>
                <Perms catalog={catalog} groups={groups} sensitiveLabels={sensitiveLabels} value={create.data.permissions} onChange={(permissions) => create.setData('permissions', permissions)} />
                {create.errors.permissions ? <Alert tone="danger">{create.errors.permissions}</Alert> : null}
                <div>
                    <Button type="submit" loading={create.processing}>
                        Создать роль
                    </Button>
                </div>
            </form>
        </div>
    );
}

function RoleCard({ role, catalog, groups, sensitiveLabels }: { role: Role; catalog: Permission[]; groups: Record<string, string>; sensitiveLabels: Record<string, string> }) {
    const form = useForm({ name: role.name, description: role.description ?? '', permissions: role.permissions ?? [] });
    const isSuper = role.permissions.includes('*');
    const granted = isSuper ? catalog : catalog.filter((p) => role.permissions.includes(p.key));
    const sensitive = [...new Set(granted.map((p) => p.sensitive).filter((s): s is string => Boolean(s)))];

    return (
        <details className="card roles-card">
            <summary className="roles-card__head">
                <span className="roles-card__title">
                    <b>{role.name}</b>
                    <span className="text-sm text-muted">{role.description}</span>
                </span>
                <span className="roles-card__meta">
                    <span className="text-xs text-muted">
                        {isSuper ? 'все права' : `${granted.length} из ${catalog.length} прав`} · пользователей: {role.users}
                        {role.is_own ? ' · ваша роль' : ''}
                    </span>
                    <span className="roles-card__tags">
                        {sensitive.map((s) => (
                            <span key={s} className={cx('roles-tag', `roles-tag--${s}`)}>
                                {sensitiveLabels[s] ?? s}
                            </span>
                        ))}
                    </span>
                </span>
            </summary>

            <form
                className="stack roles-card__body"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.put(`/admin/roles/${role.slug}`, { preserveScroll: true });
                }}
            >
                {!role.editable ? (
                    <Alert tone="muted">
                        {isSuper ? 'Суперадмин имеет все права, они не редактируются.' : role.is_own ? 'Свою роль менять нельзя.' : 'У этой роли больше прав, чем у вас: изменить её может суперадмин.'}
                    </Alert>
                ) : null}
                <div className="form-grid">
                    <TextField label="Название" disabled={!role.editable} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                    <TextField label="Описание" disabled={!role.editable} value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
                </div>
                <Perms
                    catalog={catalog}
                    groups={groups}
                    sensitiveLabels={sensitiveLabels}
                    value={isSuper ? catalog.map((p) => p.key) : form.data.permissions}
                    onChange={(permissions) => form.setData('permissions', permissions)}
                    disabled={!role.editable}
                />
                {form.errors.permissions ? <Alert tone="danger">{form.errors.permissions}</Alert> : null}
                {role.editable ? (
                    <div className="row row--wrap" style={{ gap: 8 }}>
                        <Button type="submit" size="sm" loading={form.processing}>
                            Сохранить права
                        </Button>
                        {!role.is_system ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => confirm(`Удалить роль «${role.name}»?`) && router.delete(`/admin/roles/${role.slug}`, { preserveScroll: true })}
                            >
                                Удалить роль
                            </Button>
                        ) : null}
                    </div>
                ) : null}
            </form>
        </details>
    );
}

function Perms({
    catalog,
    groups,
    sensitiveLabels,
    value,
    onChange,
    disabled,
}: {
    catalog: Permission[];
    groups: Record<string, string>;
    sensitiveLabels: Record<string, string>;
    value: string[];
    onChange: (v: string[]) => void;
    disabled?: boolean;
}) {
    const toggle = (key: string) => onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);

    return (
        <div className="roles-perms">
            {Object.entries(groups).map(([group, title]) => {
                const items = catalog.filter((p) => p.group === group);
                if (items.length === 0) return null;

                return (
                    <fieldset key={group} className="roles-perms__group">
                        <legend>{title}</legend>
                        {items.map((p) => {
                            const locked = disabled || !p.grantable;

                            return (
                                <label key={p.key} className={cx('roles-perm', value.includes(p.key) && 'is-on', locked && 'is-locked')}>
                                    <input type="checkbox" checked={value.includes(p.key)} disabled={locked} onChange={() => toggle(p.key)} />
                                    <span className="roles-perm__text">
                                        <span className="roles-perm__label">
                                            {p.label}
                                            {p.sensitive ? <span className={cx('roles-tag', `roles-tag--${p.sensitive}`)}>{sensitiveLabels[p.sensitive] ?? p.sensitive}</span> : null}
                                        </span>
                                        {p.hint ? <span className="roles-perm__hint">{p.hint}</span> : null}
                                    </span>
                                </label>
                            );
                        })}
                    </fieldset>
                );
            })}
        </div>
    );
}
