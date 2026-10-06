import { useEffect, useMemo, useState } from 'react';
import { cx, money } from '@/lib/format';
import Icon from './Icon';
import { Button } from './ui/Button';
import { Check } from './ui/Fields';
import { Modal } from './ui/Overlay';

export interface PickerService {
    slug: string;
    name: string;
    group: string;
    price_from?: number | null;
}

interface Props {
    open: boolean;
    onClose: () => void;
    services: PickerService[];
    initialSelected?: string[];
    onApply: (slugs: string[]) => void;
    title?: string;
}

export default function ServicePickerModal({ open, onClose, services, initialSelected = [], onApply, title = 'Выберите услуги' }: Props) {
    const [selected, setSelected] = useState<string[]>(initialSelected);
    const [q, setQ] = useState('');

    useEffect(() => {
        if (open) {
            setSelected(initialSelected);
            setQ('');
        }
    }, [open, initialSelected.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

    const groups = useMemo(() => {
        const needle = q.trim().toLowerCase();
        const filtered = needle
            ? services.filter((s) => s.name.toLowerCase().includes(needle) || s.group.toLowerCase().includes(needle))
            : services;
        const map = new Map<string, PickerService[]>();
        filtered.forEach((s) => {
            const list = map.get(s.group) ?? [];
            list.push(s);
            map.set(s.group, list);
        });
        return [...map.entries()];
    }, [services, q]);

    const toggle = (slug: string) =>
        setSelected((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

    const submit = () => {
        onApply(selected);
        onClose();
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            wide
            footer={
                <div className="service-picker__footer">
                    <span className="text-sm text-muted">{selected.length ? `Выбрано: ${selected.length}` : 'Можно выбрать несколько услуг'}</span>
                    <div className="service-picker__footer-actions">
                        <Button type="button" variant="ghost" onClick={() => setSelected([])} disabled={selected.length === 0}>
                            Сбросить
                        </Button>
                        <Button type="button" onClick={submit} disabled={selected.length === 0}>
                            Показать клиники
                        </Button>
                    </div>
                </div>
            }
        >
            <div className="service-picker">
                <div className="service-picker__search">
                    <Icon name="search" size={20} />
                    <input
                        type="search"
                        className="service-picker__input"
                        placeholder="Поиск услуги…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="service-picker__groups">
                    {groups.length === 0 ? <p className="text-muted">Ничего не найдено.</p> : null}
                    {groups.map(([group, items]) => (
                        <section key={group} className="service-picker__group">
                            <h3>{group}</h3>
                            <div className="service-picker__list">
                                {items.map((s) => (
                                    <label key={s.slug} className={cx('service-picker__item', selected.includes(s.slug) && 'is-active')}>
                                        <Check checked={selected.includes(s.slug)} onChange={() => toggle(s.slug)} label={s.name} />
                                        {s.price_from ? <span className="service-picker__price">{money(s.price_from)}</span> : null}
                                    </label>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </Modal>
    );
}
