import { useEffect, useRef, useState } from 'react';
import { cx, money } from '@/lib/format';
import type { Flat, FilterOptions } from '@/lib/types';
import { Button } from './ui/Button';
import { Check, SelectField } from './ui/Fields';

export type FilterValues = Record<string, string>;

const FLAGS: [string, string][] = [
    ['verified', 'Клиника проверена'],
    ['is_24_7', 'Круглосуточно'],
    ['same_day', 'Запись на сегодня'],
    ['installment', 'Рассрочка'],
    ['dms', 'Принимает ДМС'],
    ['sedation', 'Седация'],
    ['anesthesia', 'Наркоз'],
    ['microscope', 'Лечение под микроскопом'],
    ['ct', 'КТ в клинике'],
    ['achievements', 'Есть награды и достижения'],
];

const PRICES = [5000, 15000, 50000, 100000];
const RATINGS = [4, 4.5, 4.8];

export function toValues(filters: Flat): FilterValues {
    const out: FilterValues = {};
    Object.entries(filters).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '' && v !== false) out[k] = String(v);
    });
    return out;
}

export const FILTER_KEYS = [
    'district',
    'specialty',
    'service',
    'price_max',
    'rating_min',
    'reviews_min',
    'children',
    'child_age',
    'experience_min',
    'achievements',
    ...FLAGS.map(([k]) => k),
];

export function activeCount(values: FilterValues): number {
    return FILTER_KEYS.filter((k) => values[k] !== undefined).length;
}

interface Props {
    values: FilterValues;
    options: FilterOptions;
    onApply: (values: FilterValues) => void;
    mode: 'clinics' | 'doctors';
    auto?: boolean;
    idPrefix?: string;
}

export default function FilterPanel({ values, options, onApply, mode, auto = false, idPrefix = 'f' }: Props) {
    const [draft, setDraft] = useState<FilterValues>(values);
    const first = useRef(true);

    useEffect(() => setDraft(values), [JSON.stringify(values)]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!auto) return;
        if (first.current) {
            first.current = false;
            return;
        }
        if (JSON.stringify(draft) === JSON.stringify(values)) return;
        const t = window.setTimeout(() => onApply(draft), 350);
        return () => window.clearTimeout(t);
    }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps

    const set = (k: string, v: string | boolean | null) =>
        setDraft((d) => {
            const next = { ...d };
            if (v === null || v === '' || v === false) delete next[k];
            else next[k] = v === true ? '1' : String(v);
            if (k === 'children' && !v) delete next.child_age;
            if (k === 'child_age' && v !== null && v !== '') next.children = '1';
            return next;
        });

    const reset = () => {
        const cleared: FilterValues = {};
        Object.entries(draft).forEach(([k, v]) => {
            if (!FILTER_KEYS.includes(k)) cleared[k] = v;
        });
        setDraft(cleared);
        if (!auto) onApply(cleared);
        else onApply(cleared);
    };

    const count = activeCount(draft);

    return (
        <form
            className="filters"
            onSubmit={(e) => {
                e.preventDefault();
                onApply(draft);
            }}
            aria-label="Фильтры"
        >
            {mode === 'clinics' && options.districts.length > 0 ? (
                <SelectField label="Район" value={draft.district ?? ''} onChange={(e) => set('district', e.target.value)}>
                    <option value="">Любой район</option>
                    {options.districts.map((d) => (
                        <option key={d.slug} value={d.slug}>
                            {d.name}
                        </option>
                    ))}
                </SelectField>
            ) : null}

            <SelectField label="Направление" value={draft.specialty ?? ''} onChange={(e) => set('specialty', e.target.value)}>
                <option value="">Все направления</option>
                {options.specialties.map((s) => (
                    <option key={s.slug} value={s.slug}>
                        {s.name}
                    </option>
                ))}
            </SelectField>

            {mode === 'clinics' ? (
                <SelectField label="Услуга" value={draft.service ?? ''} onChange={(e) => set('service', e.target.value)}>
                    <option value="">Любая услуга</option>
                    {Object.entries(
                        options.services.reduce<Record<string, FilterOptions['services']>>((acc, s) => {
                            (acc[s.group ?? 'Прочее'] ||= []).push(s);
                            return acc;
                        }, {}),
                    ).map(([group, items]) => (
                        <optgroup key={group} label={group}>
                            {items.map((s) => (
                                <option key={s.slug} value={s.slug}>
                                    {s.name}
                                </option>
                            ))}
                        </optgroup>
                    ))}
                </SelectField>
            ) : null}

            <fieldset className="filters__group">
                <legend>Цена услуг</legend>
                <div className="chip-row">
                    {PRICES.map((p) => (
                        <button type="button" key={p} className={cx('chip', draft.price_max === String(p) && 'is-active')} aria-pressed={draft.price_max === String(p)} onClick={() => set('price_max', draft.price_max === String(p) ? null : String(p))}>
                            до {money(p)}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-muted">Цена «от». Окончательную стоимость называет врач после осмотра.</p>
            </fieldset>

            <fieldset className="filters__group">
                <legend>Рейтинг</legend>
                <div className="chip-row">
                    {RATINGS.map((r) => (
                        <button type="button" key={r} className={cx('chip', draft.rating_min === String(r) && 'is-active')} aria-pressed={draft.rating_min === String(r)} onClick={() => set('rating_min', draft.rating_min === String(r) ? null : String(r))}>
                            {String(r).replace('.', ',')}+
                        </button>
                    ))}
                </div>
            </fieldset>

            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <SelectField label="Отзывов от" value={draft.reviews_min ?? ''} onChange={(e) => set('reviews_min', e.target.value)}>
                    <option value="">Любое</option>
                    <option value="10">10+</option>
                    <option value="30">30+</option>
                    <option value="100">100+</option>
                </SelectField>
                <SelectField label="Стаж врача" value={draft.experience_min ?? ''} onChange={(e) => set('experience_min', e.target.value)}>
                    <option value="">Любой</option>
                    <option value="5">от 5 лет</option>
                    <option value="10">от 10 лет</option>
                    <option value="15">от 15 лет</option>
                    <option value="20">от 20 лет</option>
                </SelectField>
            </div>

            <fieldset className="filters__group">
                <legend>Детский приём</legend>
                <Check id={`${idPrefix}-children`} label="Принимают детей" checked={draft.children === '1'} onChange={(e) => set('children', e.target.checked)} />
                {draft.children === '1' ? (
                    <SelectField label="Возраст ребёнка" value={draft.child_age ?? ''} onChange={(e) => set('child_age', e.target.value)}>
                        <option value="">Любой</option>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 10, 14, 17].map((a) => (
                            <option key={a} value={a}>
                                {a === 0 ? 'С рождения' : `${a} ${a === 1 ? 'год' : a < 5 ? 'года' : 'лет'}`}
                            </option>
                        ))}
                    </SelectField>
                ) : null}
            </fieldset>

            <fieldset className="filters__group">
                <legend>Возможности</legend>
                <div className="stack" style={{ ['--gap' as string]: '10px' }}>
                    {FLAGS.map(([k, label]) => (
                        <Check key={k} id={`${idPrefix}-${k}`} label={label} checked={draft[k] === '1'} onChange={(e) => set(k, e.target.checked)} />
                    ))}
                </div>
            </fieldset>

            <div className="filters__actions">
                {!auto ? (
                    <Button type="submit" block>
                        Показать результаты
                    </Button>
                ) : null}
                <Button type="button" variant="ghost" block onClick={reset} disabled={count === 0}>
                    Сбросить{count ? ` (${count})` : ''}
                </Button>
            </div>
        </form>
    );
}
