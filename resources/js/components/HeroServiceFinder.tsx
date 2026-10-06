import { router } from '@inertiajs/react';
import { useState } from 'react';
import { clinicsWord, cx } from '@/lib/format';
import { useCity } from '@/lib/city';
import Icon from './Icon';
import ServicePickerModal, { type PickerService } from './ServicePickerModal';
import { Button } from './ui/Button';

export interface HeroChip {
    label: string;
    services?: string[];
    specialty?: string;
    flag?: string;
}

interface Props {
    services: PickerService[];
    chips: HeroChip[];
    stats: { clinics: number; same_day: number };
}

export default function HeroServiceFinder({ services, chips, stats }: Props) {
    const city = useCity();
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<string[]>([]);

    const go = (slugs: string[], sameDay = false) => {
        const query: Record<string, string> = {};
        if (slugs.length === 1) query.service = slugs[0];
        else if (slugs.length > 1) query.services = slugs.join(',');
        if (sameDay) query.same_day = '1';
        router.get(city.path('clinics', query));
    };

    const onChip = (chip: HeroChip) => {
        if (chip.services?.length) {
            go(chip.services);
            return;
        }
        const query: Record<string, string> = {};
        if (chip.specialty) query.specialty = chip.specialty;
        if (chip.flag) query[chip.flag] = '1';
        router.get(city.path('clinics', query));
    };

    return (
        <>
            <div className="hero-finder card">
                <button type="button" className="hero-finder__search" onClick={() => setOpen(true)} aria-label="Выбрать услуги">
                    <Icon name="search" size={22} />
                    <span>Что беспокоит или какая услуга?</span>
                </button>

                <div className="hero-finder__chips" aria-label="Популярные запросы">
                    {chips.map((chip) => (
                        <button type="button" key={chip.label} className="chip chip--soft" onClick={() => onChip(chip)}>
                            {chip.label}
                        </button>
                    ))}
                </div>

                <Button type="button" block size="lg" className="hero-finder__cta" onClick={() => go(selected.length ? selected : [], true)}>
                    Найти время на сегодня
                </Button>

                <p className="hero-finder__meta">
                    {clinicsWord(stats.clinics)}
                    {stats.same_day > 0 ? (
                        <>
                            {' '}
                            · свободное время уже сегодня в <b>{stats.same_day}</b> из них
                        </>
                    ) : null}
                </p>
            </div>

            <ServicePickerModal
                open={open}
                onClose={() => setOpen(false)}
                services={services}
                initialSelected={selected}
                onApply={(slugs) => {
                    setSelected(slugs);
                    go(slugs);
                }}
            />
        </>
    );
}

export function ServiceFinderButton({
    services,
    initialSelected = [],
    label = 'Выбрать услуги',
    className,
    sameDay = false,
}: {
    services: PickerService[];
    initialSelected?: string[];
    label?: string;
    className?: string;
    sameDay?: boolean;
}) {
    const city = useCity();
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button type="button" variant="outline" className={cx(className)} onClick={() => setOpen(true)}>
                {label}
            </Button>
            <ServicePickerModal
                open={open}
                onClose={() => setOpen(false)}
                services={services}
                initialSelected={initialSelected}
                onApply={(slugs) => {
                    const query: Record<string, string> = {};
                    if (slugs.length === 1) query.service = slugs[0];
                    else if (slugs.length > 1) query.services = slugs.join(',');
                    if (sameDay) query.same_day = '1';
                    router.get(city.path('clinics', query));
                }}
            />
        </>
    );
}
