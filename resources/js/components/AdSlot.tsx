import { Link } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { cx } from '@/lib/format';
import { BANNER_SLOT_CAPACITY, bannerSpecForSlot, type BannerSlot } from '@/lib/banner-specs';

export interface AdBanner {
    id: number;
    title: string | null;
    clinic_name: string | null;
    image_url: string | null;
    click_url: string;
    impression_url: string;
}

interface Props {
    banners: AdBanner[];
    label?: string;
    slot?: BannerSlot;
    /** Показывать демо-блоки, если активных баннеров нет. */
    demoWhenEmpty?: boolean;
}

function DemoBanner({ slot }: { slot: BannerSlot }) {
    const spec = bannerSpecForSlot(slot);
    const ratioLabel = slot === 'home' ? '21:9' : '5:2';

    return (
        <Link href="/for-clinics" className="ad-slot__banner ad-slot__banner--demo">
            <div className="ad-slot__media">
                <div className="ad-slot__demo">
                    <span className="ad-slot__demo-badge">Демо</span>
                    <strong className="ad-slot__demo-title">Рекламное место для клиники</strong>
                    <span className="ad-slot__demo-text">{spec.placementLabel}</span>
                    <span className="ad-slot__demo-size">Формат {ratioLabel}</span>
                </div>
            </div>
            <span className="ad-slot__meta">
                Разместите баннер в личном кабинете
                <span className="ad-slot__mark">Реклама</span>
            </span>
        </Link>
    );
}

export default function AdSlot({ banners, label = 'Реклама', slot = 'home', demoWhenEmpty = true }: Props) {
    const tracked = useRef<Set<number>>(new Set());
    const hasBanners = banners.length > 0;
    const demoCount = BANNER_SLOT_CAPACITY[slot];

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

    if (!hasBanners && !demoWhenEmpty) {
        return null;
    }

    return (
        <section className={cx('ad-slot', `ad-slot--${slot}`, !hasBanners && 'ad-slot--demo-mode')} aria-label={label}>
            <p className="ad-slot__label">{label}</p>
            <div className="ad-slot__grid">
                {hasBanners
                    ? banners.map((b) => (
                          <a key={b.id} href={b.click_url} className="ad-slot__banner" target="_blank" rel="noopener sponsored">
                              <div className="ad-slot__media">
                                  {b.image_url ? <img src={b.image_url} alt={b.title ?? b.clinic_name ?? 'Рекламный баннер'} loading="lazy" decoding="async" /> : null}
                              </div>
                              <span className="ad-slot__meta">
                                  {b.title ?? b.clinic_name}
                                  <span className="ad-slot__mark">Реклама</span>
                              </span>
                          </a>
                      ))
                    : Array.from({ length: demoCount }).map((_, i) => <DemoBanner key={`demo-${slot}-${i}`} slot={slot} />)}
            </div>
        </section>
    );
}
