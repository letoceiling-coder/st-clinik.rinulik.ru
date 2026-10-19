import { useMemo } from 'react';
import { A11y, Keyboard, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import { clinicPhoto } from '@/lib/demo-images';
import { cx } from '@/lib/format';
import type { ClinicCardData } from '@/lib/types';
import { DemoImg, PhotoArt } from './PhotoArt';

type Slide = ClinicCardData['photos'][number];

function ClinicCardSlide({
    slide,
    clinic,
    priority,
    eager,
}: {
    slide: Slide;
    clinic: ClinicCardData;
    priority?: boolean;
    eager?: boolean;
}) {
    if (slide.url) {
        return (
            <DemoImg
                src={slide.url}
                alt={slide.caption ?? clinic.name}
                loading={priority || eager ? 'eager' : 'lazy'}
                className="clinic-card__photo"
                aspect="unset"
            />
        );
    }

    const fallbackSrc = clinicPhoto(slide.art_seed, slide.kind);
    return (
        <DemoImg
            src={fallbackSrc}
            alt={slide.caption ?? clinic.name}
            loading={priority || eager ? 'eager' : 'lazy'}
            className="clinic-card__photo"
            aspect="unset"
        />
    );
}

export default function ClinicCardGallery({
    clinic,
    priority,
}: {
    clinic: ClinicCardData;
    priority?: boolean;
}) {
    const slides = useMemo(() => {
        if (clinic.photos.length > 0) {
            return clinic.photos;
        }

        return [{ kind: 'interior', caption: null, art_seed: clinic.art_seed, url: null }];
    }, [clinic.art_seed, clinic.photos]);

    const multi = slides.length > 1;

    if (!multi) {
        const slide = slides[0]!;
        return (
            <div className="clinic-card__gallery clinic-card__gallery--single">
                {slide.url ? (
                    <ClinicCardSlide slide={slide} clinic={clinic} priority={priority} eager />
                ) : (
                    <PhotoArt
                        seed={slide.art_seed}
                        kind={slide.kind}
                        priority={priority}
                        className="clinic-card__photo"
                    />
                )}
            </div>
        );
    }

    return (
        <div
            className={cx('clinic-card__gallery', 'clinic-card__gallery--swiper')}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
        >
            <Swiper
                modules={[Pagination, A11y, Keyboard]}
                slidesPerView={1}
                spaceBetween={0}
                pagination={{ clickable: true, dynamicBullets: false, bulletElement: 'button' }}
                keyboard={{ enabled: true }}
                a11y={{
                    enabled: true,
                    paginationBulletMessage: 'Фото {{index}}',
                    prevSlideMessage: 'Предыдущее фото',
                    nextSlideMessage: 'Следующее фото',
                }}
                className="clinic-card__swiper"
            >
                {slides.map((slide, index) => (
                    <SwiperSlide key={`${slide.kind}-${slide.art_seed}-${index}`}>
                        <ClinicCardSlide slide={slide} clinic={clinic} priority={priority && index === 0} eager={index === 0} />
                    </SwiperSlide>
                ))}
            </Swiper>
        </div>
    );
}
