import { useForm } from '@inertiajs/react';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import FileDropzone from '@/components/ui/FileDropzone';

type Stats = { regions: number; cities: number; cities_active: number };

export default function Geography({ stats, csv_help }: { stats: Stats; csv_help: string }) {
    const form = useForm<{ file: File | null }>({ file: null });

    return (
        <div className="stack-lg">
            <PageHead
                title="География"
                text="Регионы — в справочнике «Регионы». Массовый импорт городов и районов из CSV."
            />
            <section className="card row row--wrap">
                <div>
                    <div className="text-muted text-sm">Регионов</div>
                    <div className="text-xl font-semibold">{stats.regions}</div>
                </div>
                <div>
                    <div className="text-muted text-sm">Городов</div>
                    <div className="text-xl font-semibold">
                        {stats.cities} <span className="text-sm text-muted">({stats.cities_active} активных)</span>
                    </div>
                </div>
                <a className="link text-sm" href="/admin/dictionaries/regions">
                    Справочник регионов
                </a>
            </section>

            <p className="text-sm text-muted">
                Карта и реклама на сайте — в{' '}
                <a href="/admin/site-display" className="link">
                    «Сайт: карта и реклама»
                </a>
                .
            </p>

            <form
                className="card stack"
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!form.data.file) {
                        return;
                    }
                    form.post('/admin/geography/import', { forceFormData: true });
                }}
            >
                <h2 className="card-title">Импорт городов (CSV)</h2>
                <p className="text-sm text-muted">{csv_help}</p>
                <FileDropzone
                    label="Файл CSV"
                    title="Перетащите CSV-файл сюда"
                    hint="Только .csv в кодировке UTF-8"
                    accept=".csv,text/csv"
                    value={form.data.file}
                    onChange={(file) => form.setData('file', file)}
                    error={form.errors.file}
                    compact
                />
                <div>
                    <Button type="submit" loading={form.processing} disabled={!form.data.file}>
                        Загрузить
                    </Button>
                </div>
            </form>
        </div>
    );
}
