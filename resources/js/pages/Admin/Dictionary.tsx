import { Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { FilterBar, PageHead, PagerSafe, Table } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import FileDropzone from '@/components/ui/FileDropzone';
import { Check, SearchInput, SelectField, TextArea, TextField } from '@/components/ui/Fields';
import { Modal } from '@/components/ui/Overlay';
import type { Paginated } from '@/lib/types';

interface Field { name: string; label: string; type: string; required?: boolean; help?: string; options?: { value: string | number; label: string }[]; rows?: number }
interface Col { name: string; label: string; type: string }

type Draft = { mode: 'create' } | { mode: 'edit'; row: Record<string, unknown> };

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
    const [draft, setDraft] = useState<Draft | null>(null);
    const modalOpen = draft !== null;
    const editing = draft?.mode === 'edit' ? draft.row : null;

    return (
        <div className="stack-lg dict-admin">
            <PageHead
                title={title}
                action={
                    <Button size="sm" icon="plus" onClick={() => setDraft({ mode: 'create' })}>
                        Добавить
                    </Button>
                }
            />
            <nav className="dict-tabs" aria-label="Справочники">
                {tabs.map((t) => (
                    <Link key={t.key} href={`/admin/dictionaries/${t.key}`} className={t.key === resource ? 'chip is-active' : 'chip'}>
                        {t.title}
                    </Link>
                ))}
            </nav>
            <FilterBar>
                <SearchInput name="q" defaultValue={filters.q} placeholder="Поиск" />
            </FilterBar>
            <div className="dict-table-wrap">
                <Table headers={[...columns.map((c) => c.label), '']}>
                    {rows.data.map((row) => (
                        <tr key={String(row.id)}>
                            {columns.map((c) => (
                                <td key={c.name} data-label={c.label}>
                                    {formatCell(row[c.name], c.type, lookups[c.name])}
                                </td>
                            ))}
                            <td className="actions">
                                <Button size="sm" variant="ghost" onClick={() => setDraft({ mode: 'edit', row })}>
                                    Изменить
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => confirm('Удалить запись?') && router.delete(`/admin/dictionaries/${resource}/${row.id}`)}
                                >
                                    Удалить
                                </Button>
                            </td>
                        </tr>
                    ))}
                </Table>
            </div>
            <PagerSafe page={rows} />

            <Modal
                open={modalOpen}
                onClose={() => setDraft(null)}
                wide
                title={editing ? 'Редактирование' : 'Новая запись'}
                footer={
                    editing ? (
                        <p className="text-xs text-muted dict-modal__hint">Изменения сохраняются сразу после нажатия «Сохранить».</p>
                    ) : (
                        <p className="text-xs text-muted dict-modal__hint">URL (slug) создаётся автоматически из названия.</p>
                    )
                }
            >
                <DictForm
                    key={editing ? String(editing.id) : 'create'}
                    fields={fields}
                    resource={resource}
                    initial={editing}
                    onDone={() => setDraft(null)}
                />
            </Modal>
        </div>
    );
}

function formatCell(value: unknown, type: string, lookup?: Record<string, string>) {
    if (type === 'image') {
        const url = typeof value === 'string' ? value : null;
        return url ? <img src={url} alt="" className="dict-table__thumb" loading="lazy" /> : <span className="text-muted">—</span>;
    }
    if (typeof value === 'boolean') {
        return (
            <span className={value ? 'dict-badge dict-badge--ok' : 'dict-badge'}>{value ? 'да' : 'нет'}</span>
        );
    }
    if (Array.isArray(value)) return value.join(', ');
    if (lookup && value !== null && value !== undefined) return lookup[String(value)] ?? String(value);
    return value === null || value === undefined ? '—' : String(value);
}

function DictForm({ fields, resource, initial, onDone }: { fields: Field[]; resource: string; initial: Record<string, unknown> | null; onDone: () => void }) {
    const isEdit = Boolean(initial?.id);
    const empty = Object.fromEntries(
        fields.map((f) => [f.name, f.type === 'checkbox' ? false : f.type === 'multiselect' ? [] : f.type === 'image' ? null : '']),
    );
    const form = useForm<Record<string, any>>({ ...empty, remove_cover: false, ...(initial ?? {}) });

    useEffect(() => {
        form.setData({ ...empty, remove_cover: false, ...(initial ?? {}) });
        form.clearErrors();
    }, [initial]);

    const submit = () => {
        if (!isEdit) {
            form.setData('slug', '');
        }
        const opts = {
            forceFormData: fields.some((f) => f.type === 'image' && form.data[f.name] instanceof File),
            onSuccess: () => {
                if (isEdit) {
                    onDone();
                } else {
                    form.reset();
                    onDone();
                }
            },
            preserveScroll: true,
        };
        if (isEdit) {
            form.post(`/admin/dictionaries/${resource}/${initial!.id}`, { ...opts, _method: 'put' });
        } else {
            form.post(`/admin/dictionaries/${resource}`, opts);
        }
    };

    return (
        <form className="form-grid dict-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
            {fields.map((f) => {
                const err = form.errors[f.name];
                if (f.type === 'slug' && !isEdit) {
                    return null;
                }
                if (f.type === 'textarea') {
                    return (
                        <TextArea
                            key={f.name}
                            className="span-2"
                            label={f.label}
                            hint={f.help}
                            rows={f.rows ?? 4}
                            required={f.required}
                            value={String(form.data[f.name] ?? '')}
                            onChange={(e) => form.setData(f.name, e.target.value)}
                            error={err}
                        />
                    );
                }
                if (f.type === 'checkbox') {
                    return <Check key={f.name} label={f.label} checked={Boolean(form.data[f.name])} onChange={(e) => form.setData(f.name, e.target.checked)} />;
                }
                if (f.type === 'select') {
                    return (
                        <SelectField key={f.name} label={f.label} required={f.required} value={String(form.data[f.name] ?? '')} onChange={(e) => form.setData(f.name, e.target.value)} error={err}>
                            <option value="">—</option>
                            {(f.options ?? []).map((o) => (
                                <option key={String(o.value)} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </SelectField>
                    );
                }
                if (f.type === 'image') {
                    const preview = f.name === 'cover' ? (initial?.cover_url as string | undefined) : undefined;
                    return (
                        <div key={f.name} className="span-2 stack">
                            <FileDropzone
                                label={f.label}
                                hint={f.help}
                                error={err}
                                value={(form.data[f.name] as File | null) ?? null}
                                previewUrl={form.data.remove_cover ? null : preview ?? null}
                                onChange={(file) => {
                                    form.setData(f.name, file);
                                    if (file) {
                                        form.setData('remove_cover', false);
                                    }
                                }}
                            />
                            {preview && !form.data[f.name] ? (
                                <Check
                                    label="Удалить текущее фото"
                                    checked={Boolean(form.data.remove_cover)}
                                    onChange={(e) => form.setData('remove_cover', e.target.checked)}
                                />
                            ) : null}
                        </div>
                    );
                }
                if (f.type === 'multiselect') {
                    const selected = (form.data[f.name] as Array<string | number>) ?? [];
                    return (
                        <div key={f.name} className="span-2 check-grid">
                            {(f.options ?? []).map((o) => (
                                <Check
                                    key={String(o.value)}
                                    label={o.label}
                                    checked={selected.map(String).includes(String(o.value))}
                                    onChange={() => {
                                        const next = selected.map(String).includes(String(o.value))
                                            ? selected.filter((v) => String(v) !== String(o.value))
                                            : [...selected, o.value];
                                        form.setData(f.name, next);
                                    }}
                                />
                            ))}
                        </div>
                    );
                }
                if (f.type === 'slug') {
                    return (
                        <TextField
                            key={f.name}
                            label={f.label}
                            required={false}
                            hint={f.help}
                            value={String(form.data[f.name] ?? '')}
                            onChange={(e) => form.setData(f.name, e.target.value)}
                            error={err}
                        />
                    );
                }
                return (
                    <TextField
                        key={f.name}
                        label={f.label}
                        type={f.type === 'number' ? 'number' : 'text'}
                        required={f.required}
                        hint={f.type === 'text' && f.name === 'name' && !isEdit ? 'После сохранения URL создастся автоматически.' : f.help}
                        value={String(form.data[f.name] ?? '')}
                        onChange={(e) => form.setData(f.name, e.target.value)}
                        error={err}
                        className={f.name === 'name' ? 'span-2' : undefined}
                    />
                );
            })}
            <div className="span-2 dict-form__actions">
                <Button type="submit" loading={form.processing}>
                    {isEdit ? 'Сохранить' : 'Добавить'}
                </Button>
                <Button type="button" variant="ghost" onClick={onDone}>
                    Отмена
                </Button>
            </div>
        </form>
    );
}
