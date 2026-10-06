import { router, usePage } from '@inertiajs/react';
import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { cx } from '@/lib/format';
import type { Flat, FilterOptions } from '@/lib/types';
import FilterPanel, { activeCount, allFilterKeys, toValues, type FilterValues } from './FilterPanel';
import Icon from './Icon';
import { Button } from './ui/Button';
import { Drawer } from './ui/Overlay';

export const SORTS: Record<string, string> = {
    relevance: 'По умолчанию',
    rating: 'По рейтингу',
    reviews: 'По числу отзывов',
    price_asc: 'Сначала дешевле',
    price_desc: 'Сначала дороже',
    experience: 'По стажу',
};

const STATIC_LABELS: Record<string, string> = {
    children: 'Дети',
};

export function useCatalog(filters: Flat) {
    const { url } = usePage();
    const values = useMemo(() => toValues(filters), [filters]);
    const [loading, setLoading] = useState(false);
    const path = url.split('?')[0];

    const apply = useCallback(
        (next: FilterValues) => {
            router.get(path, next, {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                onStart: () => setLoading(true),
                onFinish: () => setLoading(false),
            });
        },
        [path],
    );

    const patch = (changes: FilterValues) => {
        const next: FilterValues = { ...values, ...changes };
        Object.keys(next).forEach((k) => next[k] === '' && delete next[k]);
        apply(next);
    };

    const remove = (key: string) => {
        const next = { ...values };
        delete next[key];
        if (key === 'children') delete next.child_age;
        apply(next);
    };

    return { values, apply, patch, remove, loading };
}

export function activeChips(values: FilterValues, options: FilterOptions): { key: string; label: string }[] {
    const propertyLabels = Object.fromEntries((options.properties ?? []).map((p) => [p.slug, p.name]));
    const keys = [
        'district',
        'specialty',
        'service',
        'services',
        'price_max',
        'rating_min',
        'reviews_min',
        'children',
        'child_age',
        'experience_min',
        ...(options.properties ?? []).map((p) => p.slug),
    ];
    const out: { key: string; label: string }[] = [];
    keys.forEach((k) => {
        const v = values[k];
        if (v === undefined) return;
        let label = propertyLabels[k] ?? STATIC_LABELS[k];
        if (k === 'district') label = options.districts.find((d) => d.slug === v)?.name ?? v;
        if (k === 'specialty') label = options.specialties.find((d) => d.slug === v)?.name ?? v;
        if (k === 'service') label = options.services.find((d) => d.slug === v)?.name ?? v;
        if (k === 'services') {
            const names = String(v).split(',').map((slug) => options.services.find((d) => d.slug === slug)?.name ?? slug);
            label = names.join(', ');
        }
        if (k === 'price_max') label = `до ${new Intl.NumberFormat('ru-RU').format(Number(v))} ₽`;
        if (k === 'rating_min') label = `Рейтинг ${v.replace('.', ',')}+`;
        if (k === 'reviews_min') label = `Отзывов от ${v}`;
        if (k === 'experience_min') label = `Стаж от ${v} лет`;
        if (k === 'child_age') label = `Ребёнок ${v} лет`;
        if (label) out.push({ key: k, label });
    });
    return out;
}

export function CatalogLayout({
    values,
    options,
    mode,
    apply,
    patch,
    remove,
    loading,
    total,
    children,
}: {
    values: FilterValues;
    options: FilterOptions;
    mode: 'clinics' | 'doctors';
    apply: (v: FilterValues) => void;
    patch: (v: FilterValues) => void;
    remove: (key: string) => void;
    loading: boolean;
    total: ReactNode;
    children: ReactNode;
}) {
    const [drawer, setDrawer] = useState(false);
    const chips = activeChips(values, options);
    const count = activeCount(values, options);
    const filterKeys = allFilterKeys(options);
    const sorts = mode === 'doctors' ? ['relevance', 'rating', 'reviews', 'experience', 'price_asc'] : ['relevance', 'rating', 'reviews', 'price_asc', 'price_desc'];

    return (
        <div className="container catalog">
            <aside className="catalog__filters catalog__filters--sidebar" aria-label="Фильтры">
                <div className="card">
                    <h2 className="card-title">Фильтры</h2>
                    <FilterPanel values={values} options={options} onApply={apply} mode={mode} auto idPrefix="d" />
                </div>
            </aside>

            <div className="catalog__main" aria-busy={loading}>
                <div className="catalog__bar">
                    <div className="catalog__total" aria-live="polite">
                        {total}
                    </div>
                    <div className="catalog__tools">
                        <Button variant="outline" size="sm" icon="filter" onClick={() => setDrawer(true)} className="catalog__filters-open">
                            Фильтры{count ? ` · ${count}` : ''}
                        </Button>
                        <label className="sort">
                            <span className="visually-hidden">Сортировка</span>
                            <Icon name="sort" size={18} />
                            <select className="select select--sm" value={values.sort ?? 'relevance'} onChange={(e) => patch({ sort: e.target.value === 'relevance' ? '' : e.target.value })}>
                                {sorts.map((k) => (
                                    <option key={k} value={k}>
                                        {SORTS[k]}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>

                {chips.length > 0 ? (
                    <ul className="active-chips" aria-label="Выбранные фильтры">
                        {chips.map((c) => (
                            <li key={c.key}>
                                <button type="button" className="chip chip--sm is-active" onClick={() => remove(c.key)} aria-label={`Убрать фильтр: ${c.label}`}>
                                    {c.label}
                                    <Icon name="x" size={14} />
                                </button>
                            </li>
                        ))}
                        <li>
                            <button
                                type="button"
                                className="btn btn--ghost btn--sm chip-reset"
                                onClick={() => apply(Object.fromEntries(Object.entries(values).filter(([k]) => !filterKeys.includes(k))))}
                            >
                                Сбросить все
                            </button>
                        </li>
                    </ul>
                ) : null}

                <div className={cx('catalog__list', loading && 'is-loading')}>{children}</div>
            </div>

            <Drawer open={drawer} onClose={() => setDrawer(false)} title="Фильтры" side="right">
                <FilterPanel
                    values={values}
                    options={options}
                    mode={mode}
                    idPrefix="m"
                    onApply={(v) => {
                        setDrawer(false);
                        apply(v);
                    }}
                />
            </Drawer>
        </div>
    );
}
