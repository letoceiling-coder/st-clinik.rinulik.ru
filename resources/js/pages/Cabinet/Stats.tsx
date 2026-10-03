import { Kpis, PageHead } from '@/components/Dash';

export default function Stats({
    series,
    statuses,
    conversion,
    top_services,
    views,
    rating,
    reviews,
}: {
    series: { date: string; value: number }[];
    statuses: { key: string; label: string; count: number }[];
    conversion: { total: number; confirmed: number; percent: number };
    top_services: { name: string; count: number }[];
    views: number;
    rating: number;
    reviews: number;
}) {
    const max = Math.max(1, ...series.map((s) => s.value));
    return (
        <div className="stack-lg">
            <PageHead title="Статистика" text="Заявки за 30 дней, конверсия и популярные услуги." />
            <Kpis
                items={[
                    { label: 'Заявки', value: conversion.total },
                    { label: 'Подтверждено', value: conversion.confirmed },
                    { label: 'Конверсия', value: `${conversion.percent}%` },
                    { label: 'Просмотры', value: views },
                    { label: 'Рейтинг', value: rating.toFixed(1).replace('.', ',') },
                    { label: 'Отзывы', value: reviews },
                ]}
            />
            <section className="card stack">
                <h2 className="card-title">Заявки по дням</h2>
                <div className="chart" aria-hidden="true">
                    {series.map((s) => (
                        <span key={s.date} title={`${s.date}: ${s.value}`} style={{ height: `${(s.value / max) * 100}%` }} />
                    ))}
                </div>
            </section>
            <div className="two-col two-col--even">
                <section className="card stack">
                    <h2 className="card-title">Статусы</h2>
                    {statuses.map((s) => (
                        <div key={s.key} className="row row--between"><span>{s.label}</span><b>{s.count}</b></div>
                    ))}
                </section>
                <section className="card stack">
                    <h2 className="card-title">Топ услуг в заявках</h2>
                    {top_services.length === 0 ? <p className="text-muted">Пока нет данных.</p> : top_services.map((s) => (
                        <div key={s.name} className="row row--between"><span>{s.name}</span><b>{s.count}</b></div>
                    ))}
                </section>
            </div>
        </div>
    );
}
