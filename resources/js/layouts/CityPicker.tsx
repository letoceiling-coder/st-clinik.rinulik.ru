import { router } from '@inertiajs/react';
import { useState } from 'react';
import CitySelectModal from '@/components/CitySelectModal';
import Icon from '@/components/Icon';
import { AnalyticsEvents, trackAnalyticsEvent } from '@/lib/analytics';
import { useCity } from '@/lib/city';
import { usePage } from '@inertiajs/react';
import type { SharedProps } from '@/lib/types';

export default function CityPicker() {
    const { name, slug } = useCity();
    const { cities } = usePage<SharedProps>().props;
    const [open, setOpen] = useState(false);

    const pick = (citySlug: string) => {
        if (citySlug === slug) {
            return;
        }
        trackAnalyticsEvent(AnalyticsEvents.cityPick, { city_slug: citySlug, source: 'header' });
        router.post(`/city/${citySlug}`, {}, { preserveScroll: false });
    };

    return (
        <>
            <button type="button" className="city-btn" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={`Город: ${name}. Нажмите, чтобы сменить`}>
                <Icon name="pin" size={18} />
                <span className="city-btn__label">{name}</span>
                <Icon name="chevron-down" size={16} />
            </button>
            <CitySelectModal open={open} onClose={() => setOpen(false)} cities={cities ?? []} currentSlug={slug} onPick={pick} />
        </>
    );
}
