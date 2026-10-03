import { router, usePage } from '@inertiajs/react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { cx } from '@/lib/format';
import type { SharedProps } from '@/lib/types';
import Icon, { type IconName } from './Icon';

interface Item {
    name: string;
    hint?: string | null;
    url: string;
    rating?: number;
}
type Suggest = Partial<Record<'cities' | 'clinics' | 'doctors' | 'services' | 'concerns' | 'specialties', Item[]>>;

const GROUPS: { key: keyof Suggest; title: string; icon: IconName }[] = [
    { key: 'concerns', title: 'Что беспокоит', icon: 'pain' },
    { key: 'services', title: 'Услуги', icon: 'tooth' },
    { key: 'specialties', title: 'Направления', icon: 'sparkle' },
    { key: 'clinics', title: 'Клиники', icon: 'building' },
    { key: 'doctors', title: 'Врачи', icon: 'user' },
    { key: 'cities', title: 'Города', icon: 'pin' },
];

export default function SearchBox({
    variant = 'header',
    placeholder = 'Клиника, врач, услуга или что беспокоит',
    autoFocus,
    onDone,
}: {
    variant?: 'header' | 'hero';
    placeholder?: string;
    autoFocus?: boolean;
    onDone?: () => void;
}) {
    const { city } = usePage<SharedProps>().props;
    const [q, setQ] = useState('');
    const [data, setData] = useState<Suggest>({});
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(-1);
    const wrap = useRef<HTMLDivElement>(null);
    const listId = useId();

    const flat = useMemo(() => GROUPS.flatMap((g) => (data[g.key] ?? []).map((item) => ({ ...item, group: g }))), [data]);

    useEffect(() => {
        const query = q.trim();
        if (query.length < 2) {
            setData({});
            setLoading(false);
            return;
        }
        setLoading(true);
        const ctrl = new AbortController();
        const t = window.setTimeout(() => {
            const params = new URLSearchParams({ q: query });
            if (city?.slug) params.set('city', city.slug);
            fetch(`/api/v1/search/suggest?${params}`, { signal: ctrl.signal, headers: { Accept: 'application/json' } })
                .then((r) => (r.ok ? r.json() : Promise.reject(r)))
                .then((j) => {
                    setData(j.data ?? {});
                    setActive(-1);
                    setLoading(false);
                })
                .catch((e) => {
                    if (e?.name !== 'AbortError') setLoading(false);
                });
        }, 200);
        return () => {
            window.clearTimeout(t);
            ctrl.abort();
        };
    }, [q, city?.slug]);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (!wrap.current?.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    const go = (url: string) => {
        setOpen(false);
        onDone?.();
        router.visit(url);
    };

    const submit = () => {
        const query = q.trim();
        if (!query) return;
        setOpen(false);
        onDone?.();
        router.get('/search', { q: query });
    };

    const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(flat.length - 1, a + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(-1, a - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (active >= 0 && flat[active]) go(flat[active].url);
            else submit();
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    };

    const showList = open && q.trim().length >= 2;
    let index = -1;

    return (
        <div className={cx('searchbox', `searchbox--${variant}`)} ref={wrap}>
            <form
                role="search"
                className="searchbox__form"
                onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                }}
            >
                <Icon name="search" size={22} className="searchbox__icon" />
                <input
                    type="search"
                    className="searchbox__input"
                    placeholder={placeholder}
                    aria-label="Поиск по клиникам, врачам, услугам"
                    role="combobox"
                    aria-expanded={showList}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                    autoComplete="off"
                    autoFocus={autoFocus}
                    value={q}
                    onFocus={() => setOpen(true)}
                    onChange={(e) => {
                        setQ(e.target.value);
                        setOpen(true);
                    }}
                    onKeyDown={onKey}
                />
                {variant === 'hero' ? (
                    <button type="submit" className="btn btn--primary searchbox__submit">
                        Найти
                    </button>
                ) : null}
            </form>

            {showList ? (
                <div className="searchbox__popover" id={listId} role="listbox" aria-label="Подсказки">
                    {flat.length === 0 && !loading ? (
                        <p className="searchbox__empty">
                            Ничего не найдено по запросу «{q.trim()}». Попробуйте иначе: «пломба», «брекеты», «болит зуб».
                        </p>
                    ) : null}
                    {loading && flat.length === 0 ? <p className="searchbox__empty">Ищем…</p> : null}
                    {GROUPS.map((g) => {
                        const items = data[g.key] ?? [];
                        if (!items.length) return null;
                        return (
                            <div key={g.key} role="group" aria-label={g.title}>
                                <div className="searchbox__group">{g.title}</div>
                                {items.map((item) => {
                                    index += 1;
                                    const i = index;
                                    return (
                                        <a
                                            key={item.url + item.name}
                                            id={`${listId}-${i}`}
                                            role="option"
                                            aria-selected={active === i}
                                            href={item.url}
                                            className={cx('searchbox__item', active === i && 'is-active')}
                                            onMouseEnter={() => setActive(i)}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                go(item.url);
                                            }}
                                        >
                                            <span className="searchbox__item-icon">
                                                <Icon name={g.icon} size={18} />
                                            </span>
                                            <span className="grow">
                                                <b>{item.name}</b>
                                                {item.hint ? <span className="searchbox__hint">{item.hint}</span> : null}
                                            </span>
                                            {item.rating ? (
                                                <span className="rating">
                                                    <Icon name="star" size={14} />
                                                    {item.rating.toFixed(1).replace('.', ',')}
                                                </span>
                                            ) : null}
                                        </a>
                                    );
                                })}
                            </div>
                        );
                    })}
                    {flat.length > 0 ? (
                        <button type="button" className="searchbox__all" onClick={submit}>
                            Все результаты по «{q.trim()}»
                            <Icon name="arrow-right" size={16} />
                        </button>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
