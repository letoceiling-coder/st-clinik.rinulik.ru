const nbsp = '\u00A0';

export function money(value: number | null | undefined): string {
    if (value === null || value === undefined) return '';
    return new Intl.NumberFormat('ru-RU').format(value).replace(/\s/g, nbsp) + nbsp + '₽';
}

export function priceFrom(value: number | null | undefined, fallback = 'по запросу'): string {
    if (!value) return fallback;
    return 'от' + nbsp + money(value);
}

export function plural(n: number, forms: [string, string, string]): string {
    const abs = Math.abs(n) % 100;
    const last = abs % 10;
    if (abs > 10 && abs < 20) return forms[2];
    if (last > 1 && last < 5) return forms[1];
    if (last === 1) return forms[0];
    return forms[2];
}

export const reviewsWord = (n: number) => `${n}${nbsp}${plural(n, ['отзыв', 'отзыва', 'отзывов'])}`;
export const doctorsWord = (n: number) => `${n}${nbsp}${plural(n, ['врач', 'врача', 'врачей'])}`;
export const clinicsWord = (n: number) => `${n}${nbsp}${plural(n, ['клиника', 'клиники', 'клиник'])}`;
export const yearsWord = (n: number) => `${n}${nbsp}${plural(n, ['год', 'года', 'лет'])}`;

export function ratingText(rating: number, count: number): string {
    return count > 0 ? rating.toFixed(1).replace('.', ',') : '—';
}

const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export function dateRu(iso: string | null | undefined, withYear = true): string {
    if (!iso) return '';
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    if (!y || !m || !d) return iso;
    return `${d} ${months[m - 1]}${withYear ? ' ' + y : ''}`;
}

export function dateTimeRu(value: string | null | undefined): string {
    if (!value) return '';
    const date = value.slice(0, 10);
    const time = value.slice(11, 16);
    return dateRu(date) + (time ? ', ' + time : '');
}

export function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('');
}

export function cx(...parts: (string | false | null | undefined)[]): string {
    return parts.filter(Boolean).join(' ');
}

export function phoneHref(phone: string | null | undefined): string {
    return 'tel:' + (phone ?? '').replace(/[^\d+]/g, '');
}

export function toQuery(params: Record<string, unknown>): string {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '' || v === false) return;
        if (Array.isArray(v)) v.forEach((i) => q.append(`${k}[]`, String(i)));
        else q.set(k, v === true ? '1' : String(v));
    });
    const s = q.toString();
    return s ? '?' + s : '';
}
