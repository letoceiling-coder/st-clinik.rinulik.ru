import { useState } from 'react';
import { clinicPhoto, doctorPhoto, type PhotoKind } from '@/lib/demo-images';
import { cx } from '@/lib/format';

const ASPECT_DIMS: Record<string, { width: number; height: number }> = {
    '4/3': { width: 960, height: 720 },
    '1/1': { width: 640, height: 640 },
    '16/10': { width: 960, height: 600 },
};

export function DemoImg({
    src,
    alt,
    className,
    loading,
    aspect = '4/3',
    width,
    height,
    fetchPriority,
}: {
    src: string;
    alt?: string;
    className?: string;
    loading?: 'lazy' | 'eager';
    aspect?: string | 'unset';
    width?: number;
    height?: number;
    fetchPriority?: 'high' | 'low' | 'auto';
}) {
    const fallbackDims = aspect !== 'unset' ? ASPECT_DIMS[aspect] : ASPECT_DIMS['4/3'];
    const imgWidth = width ?? fallbackDims?.width ?? 960;
    const imgHeight = height ?? fallbackDims?.height ?? 720;
    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);

    return (
        <span
            className={cx('demo-photo', !ready && 'demo-photo--loading', className)}
            style={aspect === 'unset' ? undefined : { aspectRatio: aspect }}
        >
            {!ready && !failed ? <span className="demo-photo__skeleton skeleton" aria-hidden="true" /> : null}
            <img
                src={src}
                alt={alt ?? ''}
                width={imgWidth}
                height={imgHeight}
                loading={loading ?? 'lazy'}
                decoding="async"
                fetchPriority={fetchPriority}
                onLoad={() => setReady(true)}
                onError={() => setFailed(true)}
                className={cx('demo-photo__img', ready && 'is-ready')}
            />
        </span>
    );
}

export function PhotoArt({
    seed = 1,
    kind = 'interior',
    label,
    className,
    priority,
}: {
    seed?: number;
    kind?: PhotoKind;
    label?: string;
    className?: string;
    priority?: boolean;
}) {
    const src = clinicPhoto(seed, kind);
    return (
        <DemoImg
            src={src}
            alt={label ?? 'Фото клиники'}
            className={className}
            loading={priority ? 'eager' : 'lazy'}
            aspect="4/3"
        />
    );
}

export function DoctorArt({
    seed = 1,
    photoUrl,
    className,
    name,
}: {
    seed?: number;
    photoUrl?: string | null;
    className?: string;
    name?: string;
}) {
    const src = photoUrl ?? doctorPhoto(seed);
    return <DemoImg src={src} alt={name ?? 'Фото врача'} className={className} aspect="1/1" />;
}
