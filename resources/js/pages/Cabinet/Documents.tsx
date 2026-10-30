import { router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { PageHead, StatusBadge, Table } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import FileDropzone from '@/components/ui/FileDropzone';
import { SelectField, TextField } from '@/components/ui/Fields';
import { Alert, EmptyState } from '@/components/ui/Misc';

interface Doc { id: number; type: string; title: string; number: string | null; issued_at: string | null; expires_at: string | null; status: string; reviewer_note: string | null; has_file: boolean }

export default function Documents({ documents, types }: { documents: Doc[]; types: Record<string, string> }) {
    const form = useForm({ type: 'license', title: '', number: '', issued_at: '', expires_at: '', file: null as File | null });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/clinic-cabinet/documents', { forceFormData: true, onSuccess: () => form.reset() });
    };
    return (
        <div className="stack-lg">
            <PageHead title="Документы" />
            <Alert tone="muted">В каталоге публикуются только номер и статус проверки. Файлы видит модератор, не посетители.</Alert>
            <form className="card form-grid" onSubmit={submit}>
                <SelectField label="Тип" value={form.data.type} onChange={(e) => form.setData('type', e.target.value)}>
                    {Object.entries(types).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </SelectField>
                <TextField label="Название" required value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} />
                <TextField label="Номер" value={form.data.number} onChange={(e) => form.setData('number', e.target.value)} />
                <TextField label="Выдан" type="date" value={form.data.issued_at} onChange={(e) => form.setData('issued_at', e.target.value)} />
                <TextField label="Действует до" type="date" value={form.data.expires_at} onChange={(e) => form.setData('expires_at', e.target.value)} />
                <FileDropzone
                    className="span-2"
                    label="Скан или фото документа"
                    title="Перетащите файл сюда"
                    hint="PDF, JPG или PNG, до 8 МБ"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    value={form.data.file}
                    onChange={(file) => form.setData('file', file)}
                    error={form.errors.file}
                    compact
                />
                <Button type="submit" loading={form.processing}>Загрузить</Button>
            </form>
            {documents.length === 0 ? <EmptyState title="Документов нет" /> : (
                <Table headers={['Документ', 'Номер', 'Статус', '']}>
                    {documents.map((d) => (
                        <tr key={d.id}>
                            <td>{d.title}<div className="text-xs text-muted">{types[d.type]}</div></td>
                            <td>{d.number ?? '—'}</td>
                            <td>
                                <StatusBadge status={d.status} />
                                {d.reviewer_note ? <div className="text-xs text-muted">{d.reviewer_note}</div> : null}
                            </td>
                            <td className="actions">
                                {d.has_file ? <a className="link" href={`/clinic-cabinet/documents/${d.id}/file`}>Скачать</a> : null}
                                <Button size="sm" variant="ghost" onClick={() => router.delete(`/clinic-cabinet/documents/${d.id}`)}>Удалить</Button>
                            </td>
                        </tr>
                    ))}
                </Table>
            )}
        </div>
    );
}
