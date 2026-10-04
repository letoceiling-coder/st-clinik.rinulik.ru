import { Link, usePage } from '@inertiajs/react';
import type { SharedProps } from '@/lib/types';

export function LogoMark({ size = 36 }: { size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
            <rect width="40" height="40" rx="12" fill="var(--color-primary)" />
            <path
                d="M13.2 10.5c-3 0-4.8 2.3-4.8 5.3 0 2.4.9 4 1.5 6.2.7 2.7.8 8.5 2.8 8.5 1.6 0 1.8-4.700 2.700-6.600.5-.9 1.300-1.400 2.300-1.400s1.800.5 2.300 1.400c.9 1.900 1.100 6.600 2.700 6.600 2 0 2.100-5.800 2.800-8.500.6-2.200 1.500-3.800 1.500-6.200 0-3-1.800-5.300-4.800-5.300-2 0-3.100 1.200-5.300 1.200S15.200 10.500 13.200 10.500Z"
                fill="#fff"
            />
        </svg>
    );
}

export default function Logo({ to = '/', suffix, mobileSuffix }: { to?: string; suffix?: string; mobileSuffix?: string }) {
    const appName = usePage<SharedProps>().props.app?.name ?? 'СтомКлиник';
    const shortSuffix = mobileSuffix ?? suffix;

    return (
        <Link href={to} className="logo" aria-label={`${appName} — на главную`}>
            <LogoMark />
            <span className="logo__text">{appName}</span>
            {suffix ? <span className="logo__suffix hide-mobile">{suffix}</span> : null}
            {shortSuffix ? <span className="logo__suffix show-mobile">{shortSuffix}</span> : null}
        </Link>
    );
}
