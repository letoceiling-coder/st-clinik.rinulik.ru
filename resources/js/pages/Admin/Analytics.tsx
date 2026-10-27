import { Link } from '@inertiajs/react';
import { PageHead, Table } from '@/components/Dash';

type FunnelRow = { event: string; label: string; count: number; rate: number };
type TotalRow = { event: string; label: string; count: number };
type CityRow = { city: string; count: number };

export default function Analytics({
    days,
    funnel,
    totals,
    by_city,
    metrika_configured,
    metrika_goals,
}: {
    days: number;
    funnel: FunnelRow[];
    totals: TotalRow[];
    by_city: CityRow[];
    metrika_configured: boolean;
    metrika_goals: { id: string; label: string }[];
}) {
    return (
        <div className="stack-lg">
            <PageHead
                title="Аналитика"
                text={
                    metrika_configured
                        ? 'Воронка по событиям на сайте и цели Метрики (счётчик из интеграций).'
                        : 'Счётчик Яндекс.Метрики не настроен — события пишутся только в базу.'
                }
            />
            <div className="row row--wrap">
                {[7, 30, 90].map((d) => (
                    <Link
                        key={d}
                        href={`/admin/analytics?days=${d}`}
                        className={d === days ? 'btn btn--primary btn--sm' : 'btn btn--ghost btn--sm'}
                    >
                        {d} дн.
                    </Link>
                ))}
            </div>
            <section className="card stack">
                <h2 className="card-title">Воронка записи</h2>
                <Table headers={['Этап', 'События', '% от визитов']}>
                    {funnel.map((row) => (
                        <tr key={row.event}>
                            <td>{row.label}</td>
                            <td>{row.count}</td>
                            <td>{row.rate}%</td>
                        </tr>
                    ))}
                </Table>
            </section>
            <section className="card stack">
                <h2 className="card-title">Все события</h2>
                <Table headers={['Событие', 'Количество']}>
                    {totals.map((row) => (
                        <tr key={row.event}>
                            <td>{row.label}</td>
                            <td>{row.count}</td>
                        </tr>
                    ))}
                </Table>
            </section>
            {metrika_configured && metrika_goals.length > 0 ? (
                <section className="card stack">
                    <h2 className="card-title">Цели Яндекс.Метрики</h2>
                    <p className="text-sm text-muted">Создайте в Метрике JavaScript-цели с идентификаторами как в таблице — сайт шлёт reachGoal при тех же событиях.</p>
                    <Table headers={['ID цели', 'Описание']}>
                        {metrika_goals.map((g) => (
                            <tr key={g.id}>
                                <td>
                                    <code>{g.id}</code>
                                </td>
                                <td>{g.label}</td>
                            </tr>
                        ))}
                    </Table>
                </section>
            ) : null}
            {by_city.length > 0 ? (
                <section className="card stack">
                    <h2 className="card-title">По городам (топ)</h2>
                    <Table headers={['Город', 'События']}>
                        {by_city.map((row) => (
                            <tr key={row.city}>
                                <td>{row.city}</td>
                                <td>{row.count}</td>
                            </tr>
                        ))}
                    </Table>
                </section>
            ) : null}
        </div>
    );
}
