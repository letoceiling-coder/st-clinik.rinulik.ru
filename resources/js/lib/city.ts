import { usePage } from '@inertiajs/react';
import type { SharedProps } from './types';

export type CitySection = 'clinics' | 'doctors' | 'directions' | 'prices' | 'reviews';

export function useCity() {
    const { city, cities } = usePage<SharedProps>().props;
    const slug = city?.slug ?? cities?.[0]?.slug ?? 'moskva';
    return {
        city,
        slug,
        name: city?.name ?? 'Москва',
        nameIn: city?.name_in ?? city?.name ?? 'Москве',
        path: (section: CitySection, query?: Record<string, string | number>) => {
            const qs = query ? '?' + new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)])).toString() : '';
            return `/${slug}/${section}${qs}`;
        },
        direction: (specialty: string) => `/${slug}/directions/${specialty}`,
        concern: (concern: string) => `/${slug}/concerns/${concern}`,
    };
}
