import { router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import { Modal } from '@/components/ui/Overlay';
import { SearchInput } from '@/components/ui/Fields';
import { useCity } from '@/lib/city';
import { usePage } from '@inertiajs/react';
import type { SharedProps } from '@/lib/types';

export default function CityPicker() {
    const { name, slug } = useCity();
    const { cities } = usePage<SharedProps>().props;
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');

    const list = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return (cities ?? []).filter((c) => !needle || c.name.toLowerCase().includes(needle) || (c.region ?? '').toLowerCase().includes(needle));
    }, [cities, q]);

    const pick = (citySlug: string) => {
        setOpen(false);
        if (citySlug === slug) return;
        router.post(`/city/${citySlug}`, {}, { preserveScroll: false });
    };

    return (
        <>
            <button type="button" className="city-btn" onClick={() => setOpen(true)} aria-haspopup="dialog">
                <Icon name="pin" size={18} />
                <span>{name}</span>
                <Icon name="chevron-down" size={16} />
            </button>
            <Modal open={open} onClose={() => setOpen(false)} title="Выберите город">
                <div className="stack">
                    <SearchInput label="Поиск города" placeholder="Начните вводить название" value={q} onChange={(e) => setQ(e.target.value)} data-autofocus />
                    <ul className="city-list">
                        {list.map((c) => (
                            <li key={c.slug}>
                                <button type="button" className={c.slug === slug ? 'is-active' : ''} onClick={() => pick(c.slug)} aria-current={c.slug === slug ? 'true' : undefined}>
                                    <b>{c.name}</b>
                                    {c.region ? <span className="text-muted text-sm">{c.region}</span> : null}
                                    {c.slug === slug ? <Icon name="check" size={18} /> : null}
                                </button>
                            </li>
                        ))}
                    </ul>
                    {list.length === 0 ? <p className="text-muted">Город не найден. Мы постоянно расширяем покрытие.</p> : null}
                </div>
            </Modal>
        </>
    );
}
