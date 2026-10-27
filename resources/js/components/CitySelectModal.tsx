import { useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import { Modal } from '@/components/ui/Overlay';
import { SearchInput } from '@/components/ui/Fields';

export type CityListItem = { slug: string; name: string; region: string | null };

interface Props {
    open: boolean;
    onClose: () => void;
    cities: CityListItem[];
    currentSlug: string;
    onPick: (slug: string) => void;
    title?: string;
}

export default function CitySelectModal({ open, onClose, cities, currentSlug, onPick, title = 'Выберите город' }: Props) {
    const [q, setQ] = useState('');

    const list = useMemo(() => {
        const needle = q.trim().toLowerCase();
        return cities.filter((c) => !needle || c.name.toLowerCase().includes(needle) || (c.region ?? '').toLowerCase().includes(needle));
    }, [cities, q]);

    const choose = (slug: string) => {
        onClose();
        onPick(slug);
    };

    return (
        <Modal open={open} onClose={onClose} title={title} wide>
            <div className="stack city-select">
                <SearchInput
                    label="Поиск города"
                    placeholder="Начните вводить название или регион"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    data-autofocus
                />
                <ul className="city-list city-list--modal" role="listbox" aria-label="Города">
                    {list.map((c) => (
                        <li key={c.slug}>
                            <button
                                type="button"
                                role="option"
                                aria-selected={c.slug === currentSlug}
                                className={c.slug === currentSlug ? 'is-active' : ''}
                                onClick={() => choose(c.slug)}
                            >
                                <b>{c.name}</b>
                                {c.region ? <span className="text-muted text-sm">{c.region}</span> : null}
                                {c.slug === currentSlug ? <Icon name="check" size={18} /> : null}
                            </button>
                        </li>
                    ))}
                </ul>
                {list.length === 0 ? <p className="text-muted text-sm">Город не найден. Мы постоянно расширяем покрытие.</p> : null}
            </div>
        </Modal>
    );
}
