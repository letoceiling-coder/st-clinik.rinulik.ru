import { Link, usePage } from '@inertiajs/react';
import BrandMark, { BrandMarkStatic } from '@/components/brand/BrandMark';
import type { SharedProps } from '@/lib/types';

export function LogoMark({ size = 40 }: { size?: number }) {
    return <BrandMarkStatic size={size} />;
}

export default function Logo({
    to = '/',
    suffix,
    mobileSuffix,
    animated = true,
}: {
    to?: string;
    suffix?: string;
    mobileSuffix?: string;
    /** Вращающийся 3D-знак (в шапке); в подвале — плоский. */
    animated?: boolean;
}) {
    const appName = usePage<SharedProps>().props.app?.name ?? 'МирКлиник';
    const shortSuffix = mobileSuffix ?? suffix;

    return (
        <Link href={to} className={animated ? 'logo logo--brand' : 'logo'} aria-label={`${appName} — на главную`}>
            {animated ? <BrandMark size={40} /> : <LogoMark />}
            <span className="logo__text">{appName}</span>
            {suffix ? <span className="logo__suffix hide-mobile">{suffix}</span> : null}
            {shortSuffix ? <span className="logo__suffix show-mobile">{shortSuffix}</span> : null}
        </Link>
    );
}
