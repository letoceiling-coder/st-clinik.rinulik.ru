import { router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { PageHead, Table } from '@/components/Dash';
import { AnchorButton, Button } from '@/components/ui/Button';
import { Check, SelectField, TextField } from '@/components/ui/Fields';
import { Alert, EmptyState } from '@/components/ui/Misc';
import FileDropzone from '@/components/ui/FileDropzone';
import { money } from '@/lib/format';
import type { SharedProps } from '@/lib/types';

interface Price {
    id: number;
    service_id: number;
    name: string;
    specialty: string | null;
    price_from: number;
    price_to: number | null;
    is_promo: boolean;
    note: string | null;
}

export default function Prices({ prices, services }: { prices: Price[]; services: { id: number; name: string; specialty: string | null }[] }) {
    const { flash } = usePage<SharedProps>().props;
    const form = useForm({ service_id: '', price_from: '', price_to: '', is_promo: false, note: '' });
    const importForm = useForm<{ file: File | null }>({ file: null });

    const add = (e: FormEvent) => {
        e.preventDefault();
        form.post('/clinic-cabinet/prices', { onSuccess: () => form.reset() });
    };

    const importFile = (e: FormEvent) => {
        e.preventDefault();
        if (!importForm.data.file) {
            return;
        }
        importForm.post('/clinic-cabinet/prices/import', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => importForm.reset('file'),
        });
    };

    const report = flash.import_report;

    return (
        <div className="stack-lg">
            <PageHead
                title="Услуги и прайс"
                text="Публикуем цену «от». Пациенту объясняем, что итог — после осмотра."
                action={
                    <div className="row row--wrap" style={{ gap: 8 }}>
                        <AnchorButton href="/clinic-cabinet/prices/template" variant="outline" size="sm" download="price-list-template.xlsx">
                            Образец Excel
                        </AnchorButton>
                        <AnchorButton href="/clinic-cabinet/prices/export" variant="outline" size="sm">
                            Выгрузить Excel
                        </AnchorButton>
                    </div>
                }
            />

            <section className="card stack">
                <div>
                    <h2 className="text-lg">Импорт из Excel</h2>
                    <p className="text-sm text-muted">
                        Заполните лист «Прайс»: код услуги, цены и пометки. Справочник специализаций и услуг — на листе «Справочник услуг» в том же файле.
                        Существующие позиции обновятся, новые добавятся. Строки с ошибками будут пропущены.
                    </p>
                </div>
                <form className="stack" onSubmit={importFile}>
                    <FileDropzone
                        label="Excel-файл"
                        hint="Только .xlsx, до 5 МБ"
                        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        value={importForm.data.file}
                        onChange={(file) => importForm.setData('file', file)}
                        error={importForm.errors.file}
                    />
                    <div className="row row--wrap" style={{ gap: 8 }}>
                        <Button type="submit" loading={importForm.processing} disabled={!importForm.data.file}>
                            Загрузить прайс
                        </Button>
                    </div>
                </form>
            </section>

            {report ? (
                <div className="stack">
                    <Alert tone={report.errors.length ? 'warning' : 'success'} icon={report.errors.length ? 'alert' : 'check-circle'}>
                        Добавлено: {report.created} · обновлено: {report.updated} · пропущено: {report.skipped}
                    </Alert>
                    {report.errors.length > 0 ? (
                        <div className="card stack">
                            <h3 className="text-sm">Ошибки по строкам</h3>
                            <ul className="import-errors">
                                {report.errors.map((item) => (
                                    <li key={`${item.row}-${item.message}`}>
                                        <b>Строка {item.row}:</b> {item.message}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </div>
            ) : null}

            <form className="card form-grid" onSubmit={add}>
                <SelectField label="Услуга" required value={form.data.service_id} onChange={(e) => form.setData('service_id', e.target.value)} error={form.errors.service_id}>
                    <option value="">Выберите</option>
                    {services.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.specialty ? `${s.specialty} · ` : ''}
                            {s.name}
                        </option>
                    ))}
                </SelectField>
                <TextField label="Цена от, ₽" type="number" required value={form.data.price_from} onChange={(e) => form.setData('price_from', e.target.value)} error={form.errors.price_from} />
                <TextField label="До, ₽" type="number" value={form.data.price_to} onChange={(e) => form.setData('price_to', e.target.value)} />
                <TextField label="Пометка" value={form.data.note} onChange={(e) => form.setData('note', e.target.value)} />
                <Check label="Акция" checked={form.data.is_promo} onChange={(e) => form.setData('is_promo', e.target.checked)} />
                <Button type="submit" loading={form.processing}>
                    Добавить
                </Button>
            </form>

            {prices.length === 0 ? (
                <EmptyState title="Прайс пуст" />
            ) : (
                <Table headers={['Услуга', 'От', 'До', '']}>
                    {prices.map((p) => (
                        <tr key={p.id}>
                            <td>
                                {p.specialty ? (
                                    <span className="text-xs text-muted">
                                        {p.specialty}
                                        <br />
                                    </span>
                                ) : null}
                                {p.name}
                                {p.is_promo ? ' · акция' : ''}
                                {p.note ? <div className="text-xs text-muted">{p.note}</div> : null}
                            </td>
                            <td>{money(p.price_from)}</td>
                            <td>{p.price_to ? money(p.price_to) : '—'}</td>
                            <td className="actions">
                                <Button size="sm" variant="ghost" onClick={() => router.delete(`/clinic-cabinet/prices/${p.id}`)}>
                                    Удалить
                                </Button>
                            </td>
                        </tr>
                    ))}
                </Table>
            )}
        </div>
    );
}
