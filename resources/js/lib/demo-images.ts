/** Локальные демо-фото (Unsplash License). Без hotlink. */

export type PhotoKind = 'exterior' | 'interior' | 'office' | 'equipment' | 'team' | string;

const CLINIC: Record<string, string[]> = {
    exterior: ['/images/demo/clinic-exterior-01.jpg', '/images/demo/clinic-exterior-02.jpg'],
    interior: ['/images/demo/clinic-interior-01.jpg', '/images/demo/clinic-interior-02.jpg', '/images/demo/clinic-interior-03.jpg'],
    office: ['/images/demo/clinic-interior-02.jpg', '/images/demo/clinic-interior-03.jpg'],
    equipment: ['/images/demo/clinic-equipment-01.jpg', '/images/demo/clinic-equipment-02.jpg'],
    team: ['/images/demo/clinic-team-01.jpg', '/images/demo/procedure-01.jpg'],
};

const DOCTORS = [
    '/images/demo/doctor-01.jpg',
    '/images/demo/doctor-02.jpg',
    '/images/demo/doctor-03.jpg',
    '/images/demo/doctor-04.jpg',
    '/images/demo/doctor-05.jpg',
    '/images/demo/doctor-06.jpg',
    '/images/demo/doctor-07.jpg',
    '/images/demo/doctor-08.jpg',
];

const DEFAULT_CLINIC = [
    ...CLINIC.interior,
    ...CLINIC.exterior,
    '/images/demo/procedure-01.jpg',
    '/images/demo/procedure-02.jpg',
];

export function clinicPhoto(seed: number, kind: PhotoKind = 'interior'): string {
    const pool = CLINIC[kind] ?? DEFAULT_CLINIC;
    return pool[Math.abs(seed) % pool.length]!;
}

export function doctorPhoto(seed: number): string {
    return DOCTORS[Math.abs(seed) % DOCTORS.length]!;
}

export const HERO_PHOTOS = ['/images/demo/hero-01.jpg', '/images/demo/hero-02.jpg', '/images/demo/hero-03.jpg'] as const;
