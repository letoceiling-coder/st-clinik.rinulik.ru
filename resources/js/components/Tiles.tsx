import { Link } from '@inertiajs/react';
import { useCity } from '@/lib/city';
import { clinicsWord, money } from '@/lib/format';
import type { ConcernData, SpecialtyData } from '@/lib/types';
import { clinicPhoto, type PhotoKind } from '@/lib/demo-images';
import Carousel from './Carousel';
import Icon from './Icon';

function specialtySeed(slug: string, index: number): number {
    return slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + index;
}

export function ConcernChips({ concerns, scroll = true }: { concerns: ConcernData[]; scroll?: boolean }) {
    const city = useCity();
    const chips = concerns.map((c) => (
        <Link key={c.slug} href={city.concern(c.slug)} className="chip chip--soft chip--lg" title={c.hint ?? undefined}>
            <span className="chip-icon">
                <Icon name={c.icon ?? 'tooth'} size={16} />
            </span>
            {c.name}
        </Link>
    ));

    if (!scroll) {
        return <div className="chip-row">{chips}</div>;
    }

    return (
        <Carousel ariaLabel="С чем чаще обращаются" staticClassName="chip-scroll" slideClassName="carousel__slide--chip" gap={10}>
            {chips}
        </Carousel>
    );
}

const SPECIALTY_PHOTO_KINDS: PhotoKind[] = ['interior', 'exterior', 'office', 'equipment', 'team'];

export function SpecialtyCircles({ specialties }: { specialties: SpecialtyData[] }) {
    const city = useCity();
    const items = specialties.map((s, index) => {
        const kind = SPECIALTY_PHOTO_KINDS[index % SPECIALTY_PHOTO_KINDS.length] ?? 'interior';
        const meta =
            s.short ??
            (s.price_from ? `от ${money(s.price_from)}` : s.clinics != null ? clinicsWord(s.clinics) : null);

        return (
            <Link key={s.slug} href={city.direction(s.slug)} className="dir-card card card--link" role="listitem">
                <span className="dir-card__media" aria-hidden="true">
                    <img
                        src={s.cover_url ?? clinicPhoto(specialtySeed(s.slug, index), kind)}
                        alt=""
                        loading="lazy"
                        width={168}
                        height={224}
                    />
                </span>
                <span className="dir-card__caption">
                    <b className="dir-card__title">{s.name}</b>
                    {meta ? <span className="dir-card__meta">{meta}</span> : null}
                </span>
            </Link>
        );
    });

    return (
        <Carousel ariaLabel="Направления стоматологии" staticClassName="dir-scroll" slideClassName="carousel__slide--dir" gap={12}>
            {items}
        </Carousel>
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
                        {s.clinics != null ? clinicsWord(s.clinics) : null}
                        {s.price_from ? ` · от ${money(s.price_from)}` : null}
                    </span>
                ) : null}
            </span>
        </Link>
    );
}
