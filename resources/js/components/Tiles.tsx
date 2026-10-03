import { Link } from '@inertiajs/react';
import { useCity } from '@/lib/city';
import { clinicsWord, money } from '@/lib/format';
import type { ConcernData, SpecialtyData } from '@/lib/types';
import { clinicPhoto } from '@/lib/demo-images';
import Icon from './Icon';

function specialtySeed(slug: string, index: number): number {
    return slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + index;
}

export function ConcernChips({ concerns, scroll = true }: { concerns: ConcernData[]; scroll?: boolean }) {
    const city = useCity();
    return (
        <div className={scroll ? 'chip-scroll' : 'chip-row'}>
            {concerns.map((c) => (
                <Link key={c.slug} href={city.concern(c.slug)} className="chip chip--soft chip--lg" title={c.hint ?? undefined}>
                    <span className="chip-icon">
                        <Icon name={c.icon ?? 'tooth'} size={16} />
                    </span>
                    {c.name}
                </Link>
            ))}
        </div>
    );
}

export function SpecialtyCircles({ specialties }: { specialties: SpecialtyData[] }) {
    const city = useCity();
    return (
        <div className="cat-scroll" role="list" aria-label="Направления">
            {specialties.map((s, index) => (
                <Link key={s.slug} href={city.direction(s.slug)} className="cat" role="listitem">
                    <span className="cat__circle cat__circle--photo" aria-hidden="true">
                        <img src={clinicPhoto(specialtySeed(s.slug, index), 'interior')} alt="" loading="lazy" width={100} height={100} />
                        <span className="cat__shade" />
                        <Icon name={s.icon ?? 'tooth'} size={32} />
                    </span>
                    <span className="cat__name">{s.name}</span>
                </Link>
            ))}
        </div>
    );
}

export function SpecialtyTile({ s }: { s: SpecialtyData }) {
    const city = useCity();
    return (
        <Link href={city.direction(s.slug)} className="tile card card--link">
            <span className="tile__icon">
                <Icon name={s.icon ?? 'tooth'} size={28} />
            </span>
            <span className="tile__body">
                <b className="tile__title">{s.name}</b>
                {s.short ? <span className="tile__text">{s.short}</span> : null}
                {s.clinics !== undefined || s.price_from ? (
                    <span className="tile__meta">
                        {s.clinics !== undefined ? clinicsWord(s.clinics) : null}
                        {s.price_from ? ` · от ${money(s.price_from)}` : null}
                    </span>
                ) : null}
            </span>
        </Link>
    );
}
