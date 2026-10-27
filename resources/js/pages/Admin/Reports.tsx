import { useForm } from '@inertiajs/react';
import { PageHead, StatusBadge } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Fields';

type ExportRow = {
    id: number;
    label: string;
    status: string;
    created_at: string | null;
    ready_at: string | null;
    error: string | null;
    download_url: string | null;
};

export default function Reports({
    types,
    formats,
    exports,
}: {
    types: Record<string, string>;
    formats: Record<string, string>;
    exports: ExportRow[];
}) {
    const form = useForm({
        report_type: Object.keys(types)[0] ?? 'clinics',
        format: 'csv',
        from: '',
        to: '',
        status: '',
    });

    return (
        <div className="stack-lg">
            <PageHead title="Отчёты" text="CSV или XLSX. Файл формируется в фоне — пришлём уведомление на сайте." />
            <form
                className="card stack"
                onSubmit={(e) => {
                    e.preventDefault();
                    form.post('/admin/reports');
                }}
            >
                <h2 className="card-title">Новый отчёт</h2>
                <SelectField label="Тип" value={form.data.report_type} onChange={(e) => form.setData('report_type', e.target.value)}>
                    {Object.entries(types).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </SelectField>
                <SelectField label="Формат" value={form.data.format} onChange={(e) => form.setData('format', e.target.value)}>
                    {Object.entries(formats).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </SelectField>
                {form.data.report_type === 'appointments' ? (
                    <>
                        <TextField label="С даты" type="date" value={form.data.from} onChange={(e) => form.setData('from', e.target.value)} />
                        <TextField label="По дату" type="date" value={form.data.to} onChange={(e) => form.setData('to', e.target.value)} />
                        <TextField label="Статус (необяз.)" value={form.data.status} onChange={(e) => form.setData('status', e.target.value)} />
                    </>
                ) : null}
                <Button type="submit" loading={form.processing}>
                    Сформировать
                </Button>
            </form>
            <section className="card stack">
                <h2 className="card-title">Ваши выгрузки</h2>
                {exports.length === 0 ? <p className="text-muted">Пока нет отчётов.</p> : null}
                {exports.map((e) => (
                    <div key={e.id} className="row row--between row--wrap">
                        <span>
                            {e.label} · {e.created_at}
                        </span>
                        <span className="row row--wrap">
                            <StatusBadge status={e.status === 'ready' ? 'published' : e.status === 'failed' ? 'rejected' : 'pending'} label={e.status} />
                            {e.download_url ? (
                                <a className="link text-sm" href={e.download_url}>
                                    Скачать
                                </a>
                            ) : null}
                            {e.error ? <span className="text-xs text-danger">{e.error}</span> : null}
                        </span>
                    </div>
                ))}
            </section>
        </div>
    );
}
