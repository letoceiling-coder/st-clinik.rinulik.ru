import { Link, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import { SearchInput } from '@/components/ui/Fields';
import { Alert, Breadcrumbs, EmptyState } from '@/components/ui/Misc';
import { useCity } from '@/lib/city';
import { clinicsWord, priceFrom } from '@/lib/format';
import type { Crumb, SharedProps } from '@/lib/types';

interface Group {
    group: string | null;
    items: { slug: string; name: string; duration_min: number | null; price_from: number | null; clinics: number }[];
}

export default function PricesIndex({ groups, breadcrumbs }: { groups: Group[]; breadcrumbs: Crumb[] }) {
    const city = useCity();
    const { seo } = usePage<SharedProps>().props;
    const [q, setQ] = useState('');

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase();
        if (!needle) return groups;
        return groups.map((g) => ({ ...g, items: g.items.filter((i) => i.name.toLowerCase().includes(needle)) })).filter((g) => g.items.length > 0);
    }, [groups, q]);

    return (
        <>
            <Breadcrumbs items={breadcrumbs} />
            <header className="container page-head">
                <h1>{seo?.h1 ?? `Цены на стоматологические услуги в ${city.nameIn}`}</h1>
                <p className="text-muted">Минимальные цены среди клиник города. Выберите услугу, чтобы сравнить предложения.</p>
            </header>

            <div className="container stack-lg" style={{ paddingBottom: 'var(--space-12)' }}>
                <Alert tone="warning" icon="info">
                    Цены указаны «от» и приведены для ознакомления. Окончательная стоимость лечения определяется врачом после осмотра и согласования плана лечения.
                </Alert>

                <div className="prices-tools">
                    <div className="grow">
                        <SearchInput label="Найти услугу" placeholder="Например, пломба или имплант" value={q} onChange={(e) => setQ(e.target.value)} />
                    </div>
                    <div className="chip-scroll prices-tools__groups">
                        {groups.map((g) => (
                            <a key={g.group} href={`#g-${groups.indexOf(g)}`} className="chip chip--soft">
                                {g.group ?? 'Прочее'}
                            </a>
                        ))}
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <EmptyState title="Услуга не найдена" text="Попробуйте изменить запрос." />
                ) : (
                    filtered.map((g) => (
                        <section key={g.group} id={`g-${groups.findIndex((x) => x.group === g.group)}`} aria-label={g.group ?? 'Прочее'}>
                            <h2 className="card-title">{g.group ?? 'Прочее'}</h2>
                            <ul className="price-list">
                                {g.items.map((s) => (
                                    <li key={s.slug}>
                                        <Link href={city.path('clinics', { service: s.slug })} className="price-row">
                                            <span className="price-row__name">
                                                <b>{s.name}</b>
                                                {s.duration_min ? <span className="text-sm text-muted">около {s.duration_min} мин</span> : null}
                                            </span>
                                            <span className="price-row__meta text-sm text-muted">{s.clinics > 0 ? clinicsWord(s.clinics) : '—'}</span>
                                            <b className="price-row__price">{priceFrom(s.price_from)}</b>
                                            <Icon name="chevron-right" size={18} />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))
                )}
            </div>
        </>
    );
}
