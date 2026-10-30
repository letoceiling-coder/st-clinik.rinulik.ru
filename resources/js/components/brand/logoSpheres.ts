/**
 * Композиция логотипа «МирКлиник»: 21 сфера, снятая с исходного изображения 1254×1254.
 * x, y, r — в пикселях исходника; depth — положение сферы по глубине (-1 сзади … 1 спереди),
 * оно задаёт объём шара при вращении и не влияет на вид спереди.
 */
export type LogoFamily = 'teal' | 'petrol' | 'emerald' | 'lime' | 'fresh';

export type LogoSphere = { x: number; y: number; r: number; family: LogoFamily; depth: number };

export const LOGO_FAMILIES: LogoFamily[] = ['teal', 'petrol', 'emerald', 'lime', 'fresh'];

/** Значения токенов --color-logo-* из tokens.css: запасной вариант для SSR, файлов иконок и старых браузеров. */
export const LOGO_TOKEN_FALLBACK: Record<LogoFamily, { light: string; deep: string }> = {
    teal: { light: '#12d8d3', deep: '#0393a0' },
    petrol: { light: '#0396a3', deep: '#034a64' },
    emerald: { light: '#30d384', deep: '#04926f' },
    lime: { light: '#c6f242', deep: '#7dd630' },
    fresh: { light: '#cff659', deep: '#36c462' },
};

export const LOGO_SPHERES: LogoSphere[] = [
    { x: 696.6, y: 206.1, r: 29.3, family: 'teal', depth: -1 },
    { x: 576.8, y: 306.5, r: 108.5, family: 'teal', depth: 1 },
    { x: 793.9, y: 274.4, r: 70.5, family: 'emerald', depth: -0.6 },
    { x: 384.7, y: 328.1, r: 73.5, family: 'lime', depth: 0.8 },
    { x: 917.2, y: 436.8, r: 117.8, family: 'teal', depth: 0.7 },
    { x: 270, y: 462.1, r: 52, family: 'petrol', depth: -1 },
    { x: 696.1, y: 523.9, r: 111.3, family: 'fresh', depth: 1 },
    { x: 449, y: 532.7, r: 119, family: 'petrol', depth: -0.55 },
    { x: 1031.3, y: 611.4, r: 77.8, family: 'lime', depth: -0.8 },
    { x: 250.7, y: 631.5, r: 90.5, family: 'teal', depth: 0.6 },
    { x: 849, y: 706, r: 111.5, family: 'teal', depth: 0.9 },
    { x: 535.2, y: 751.4, r: 107.5, family: 'fresh', depth: 0.9 },
    { x: 360.5, y: 722.8, r: 37, family: 'teal', depth: -1 },
    { x: 1028.5, y: 749.5, r: 41, family: 'teal', depth: 1 },
    { x: 235.4, y: 768.8, r: 32, family: 'lime', depth: -1 },
    { x: 339.6, y: 881.1, r: 106.8, family: 'teal', depth: 0.7 },
    { x: 712.6, y: 913.9, r: 116.5, family: 'petrol', depth: -0.6 },
    { x: 949.6, y: 896.1, r: 94.3, family: 'emerald', depth: 0.6 },
    { x: 501.5, y: 1000, r: 85.8, family: 'teal', depth: -0.7 },
    { x: 851.8, y: 1014.5, r: 38.8, family: 'lime', depth: 1 },
    { x: 626.2, y: 1064.6, r: 36, family: 'teal', depth: -1 },
];

/** Центр и полуразмер композиции в пикселях исходника (по крайним точкам кругов). */
export const LOGO_CENTER = { x: 634.65, y: 638.7 };
export const LOGO_HALF_EXTENT = 474.4;

/** Квадратный viewBox для плоской версии: композиция по центру, края вплотную. */
export const LOGO_VIEWBOX = `${LOGO_CENTER.x - LOGO_HALF_EXTENT} ${LOGO_CENTER.y - LOGO_HALF_EXTENT} ${LOGO_HALF_EXTENT * 2} ${LOGO_HALF_EXTENT * 2}`;
