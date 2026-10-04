import { useState } from 'react';
import { cx } from '@/lib/format';
import type { BannerSlot } from '@/lib/banner-specs';

interface Props {
    slot: BannerSlot;
    imageUrl: string | null;
    title: string;
    placementLabel: string;
}

export default function BannerPreview({ slot, imageUrl, title, placementLabel }: Props) {
    const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

    return (
        <div className="banner-preview">
            <div className="banner-preview__head">
                <p className="banner-preview__label">Предпросмотр · {placementLabel}</p>
                <div className="banner-preview__devices" role="tablist" aria-label="Устройство предпросмотра">
                    <button type="button" role="tab" aria-selected={device === 'desktop'} className={cx('banner-preview__device-btn', device === 'desktop' && 'is-active')} onClick={() => setDevice('desktop')}>
                        Desktop
                    </button>
                    <button type="button" role="tab" aria-selected={device === 'mobile'} className={cx('banner-preview__device-btn', device === 'mobile' && 'is-active')} onClick={() => setDevice('mobile')}>
                        Mobile
                    </button>
                </div>
            </div>
            <div className={cx('banner-preview__frame', `banner-preview__frame--${device}`)}>
                <section className={cx('ad-slot', `ad-slot--${slot}`)} aria-label="Предпросмотр баннера">
                    <p className="ad-slot__label">Реклама</p>
                    <div className="ad-slot__grid">
                        <div className="ad-slot__banner ad-slot__banner--static">
                            <div className="ad-slot__media">
                                {imageUrl ? (
                                    <img src={imageUrl} alt={title || 'Баннер'} />
                                ) : (
                                    <div className="ad-slot__placeholder">Загрузите и обрежьте изображение</div>
                                )}
                            </div>
                            <span className="ad-slot__meta">
                                {title || 'Заголовок баннера'}
                                <span className="ad-slot__mark">Реклама</span>
                            </span>
                        </div>
                    </div>
                </section>
            </div>
            <p className="text-xs text-muted">Так баннер будет выглядеть {slot === 'home' ? 'на главной' : 'в каталоге'} на {device === 'desktop' ? 'компьютере' : 'телефоне'}.</p>
        </div>
    );
}
