import { Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { FilterBar, PageHead, PagerSafe, Table } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check, SearchInput, SelectField, TextArea, TextField } from '@/components/ui/Fields';
import type { Paginated } from '@/lib/types';

interface Field { name: string; label: string; type: string; required?: boolean; help?: string; options?: { value: string | number; label: string }[]; rows?: number }
interface Col { name: string; label: string; type: string }

export default function Dictionary({
    resource, title, columns, fields, lookups, rows, tabs, filters,
}: {
    resource: string;
    title: string;
    columns: Col[];
    fields: Field[];
    lookups: Record<string, Record<string, string>>;
    rows: Paginated<Record<string, unknown>>;
    tabs: { key: string; title: string }[];
    filters: { q?: string };
}) {
    const [edit, setEdit] = useState<Record<string, unknown> | null>(null);
    return (
        <div className="stack-lg">
            <PageHead title={title} />
            <nav className="dict-tabs" aria-label="Справочники">
                {tabs.map((t) => (
                    <Link key={t.key} href={`/admin/dictionaries/${t.key}`} className={t.key === resource ? 'chip is-active' : 'chip'}>{t.title}</Link>
                ))}
            </nav>
            <FilterBar>
                <SearchInput name="q" defaultValue={filters.q} placeholder="Поиск" />
            </FilterBar>
            <DictForm fields={fields} onDone={() => setEdit(null)} resource={resource} initial={edit} />
            <Table headers={[...columns.map((c) => c.label), '']}>
                {rows.data.map((row) => (
                    <tr key={String(row.id)}>
                        {columns.map((c) => (
                            <td key={c.name}>{formatCell(row[c.name], lookups[c.name])}</td>
                        ))}
                        <td className="actions">
                            <Button size="sm" variant="ghost" onClick={() => setEdit(row)}>Изменить</Button>
                            <Button size="sm" variant="ghost" onClick={() => confirm('Удалить запись?') && router.delete(`/admin/dictionaries/${resource}/${row.id}`)}>Удалить</Button>
                        </td>
                    </tr>
                ))}
            </Table>
            <PagerSafe page={rows} />
        </div>
    );
}

function formatCell(value: unknown, lookup?: Record<string, string>) {
    if (typeof value === 'boolean') return value ? 'да' : 'нет';
    if (Array.isArray(value)) return value.join(', ');
    if (lookup && value !== null && value !== undefined) return lookup[String(value)] ?? String(value);
    return value === null || value === undefined ? '—' : String(value);
}

function DictForm({ fields, resource, initial, onDone }: { fields: Field[]; resource: string; initial: Record<string, unknown> | null; onDone: () => void }) {
    const empty = Object.fromEntries(fields.map((f) => [f.name, f.type === 'checkbox' ? false : f.type === 'multiselect' ? [] : '']));
    const form = useForm<Record<string, any>>({ ...empty, ...(initial ?? {}) });
    const submit = () => {
        if (initial?.id) form.put(`/admin/dictionaries/${resource}/${initial.id}`, { onSuccess: onDone });
        else form.post(`/admin/dictionaries/${resource}`, { onSuccess: () => form.reset() });
    };
    return (
        <form className="card form-grid" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            <h2 className="card-title span-2">{initial ? 'Редактирование' : 'Новая запись'}</h2>
            {fields.map((f) => {
                const err = form.errors[f.name];
                if (f.type === 'textarea') return <TextArea key={f.name} className="span-2" label={f.label} hint={f.help} rows={f.rows} required={f.required} value={String(form.data[f.name] ?? '')} onChange={(e) => form.setData(f.name, e.target.value)} error={err} />;
                if (f.type === 'checkbox') return <Check key={f.name} label={f.label} checked={Boolean(form.data[f.name])} onChange={(e) => form.setData(f.name, e.target.checked)} />;
                if (f.type === 'select') return (
                    <SelectField key={f.name} label={f.label} required={f.required} value={String(form.data[f.name] ?? '')} onChange={(e) => form.setData(f.name, e.target.value)} error={err}>
                        <option value="">—</option>
                        {(f.options ?? []).map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
                    </SelectField>
                );
                if (f.type === 'multiselect') {
                    const selected = (form.data[f.name] as Array<string | number>) ?? [];
                    return (
                        <div key={f.name} className="span-2 check-grid">
                            {(f.options ?? []).map((o) => (
                                <Check key={String(o.value)} label={o.label} checked={selected.map(String).includes(String(o.value))} onChange={() => {
                                    const next = selected.map(String).includes(String(o.value)) ? selected.filter((v) => String(v) !== String(o.value)) : [...selected, o.value];
                                    form.setData(f.name, next);
                                }} />
                            ))}
                        </div>
                    );
                }
                return <TextField key={f.name} label={f.label} type={f.type === 'number' ? 'number' : 'text'} required={f.required} hint={f.help} value={String(form.data[f.name] ?? '')} onChange={(e) => form.setData(f.name, e.target.value)} error={err} />;
            })}
            <Button type="submit" loading={form.processing}>{initial ? 'Сохранить' : 'Добавить'}</Button>
            {initial ? <Button type="button" variant="ghost" onClick={onDone}>Отмена</Button> : null}
        </form>
    );
}
