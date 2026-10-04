import { useEffect, useRef } from 'react';

export interface AdBanner {
    id: number;
    title: string | null;
    clinic_name: string | null;
    image_url: string | null;
    click_url: string;
    impression_url: string;
}

export default function AdSlot({ banners, label = 'Реклама' }: { banners: AdBanner[]; label?: string }) {
    const tracked = useRef<Set<number>>(new Set());

    useEffect(() => {
        banners.forEach((b) => {
            if (tracked.current.has(b.id)) {
                return;
            }
            tracked.current.add(b.id);
            const img = new Image();
            img.src = b.impression_url;
        });
    }, [banners]);

    if (banners.length === 0) {
        return null;
    }

    return (
        <section className="ad-slot" aria-label={label}>
            <p className="ad-slot__label">{label}</p>
            <div className="ad-slot__grid">
                {banners.map((b) => (
                    <a key={b.id} href={b.click_url} className="ad-slot__banner" target="_blank" rel="noopener sponsored">
                        {b.image_url ? <img src={b.image_url} alt={b.title ?? b.clinic_name ?? 'Рекламный баннер'} loading="lazy" /> : null}
                        <span className="ad-slot__meta">
                            {b.title ?? b.clinic_name}
                            <span className="ad-slot__mark">Реклама</span>
                        </span>
                    </a>
                ))}
            </div>
        </section>
    );
}
