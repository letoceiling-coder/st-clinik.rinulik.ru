import { router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import CitySelectModal from '@/components/CitySelectModal';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';
import { AnalyticsEvents, trackAnalyticsEvent } from '@/lib/analytics';
import { useCity } from '@/lib/city';
import type { SharedProps } from '@/lib/types';

type CityPromptProps = {
    suggested: { slug: string; name: string; name_in: string | null };
    source: 'ip' | 'default' | string;
};

function xsrfToken(): string {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

export default function CityPrompt() {
    const { city_prompt, cities, max_app } = usePage<SharedProps>().props;
    const current = useCity();
    const [open, setOpen] = useState(false);
    const [listOpen, setListOpen] = useState(false);
    const [geoLoading, setGeoLoading] = useState(false);
    const [geoError, setGeoError] = useState<string | null>(null);

    const prompt = city_prompt as CityPromptProps | null | undefined;

    useEffect(() => {
        if (prompt && !max_app) {
            setOpen(true);
        }
    }, [prompt, max_app]);

    const confirmCity = useCallback(
        (slug: string) => {
            trackAnalyticsEvent(AnalyticsEvents.cityPick, { city_slug: slug, source: 'prompt' });
            router.post(`/city/${slug}/confirm`, {}, { preserveScroll: false });
        },
        [],
    );

    const switchCity = useCallback(
        (slug: string) => {
            if (slug === current.slug) {
                confirmCity(slug);
                return;
            }
            trackAnalyticsEvent(AnalyticsEvents.cityPick, { city_slug: slug, source: 'prompt_list' });
            router.post(`/city/${slug}`, {}, { preserveScroll: false });
        },
        [confirmCity, current.slug],
    );

    const detectByDevice = () => {
        if (!('geolocation' in navigator)) {
            setGeoError('Браузер не поддерживает геолокацию.');
            return;
        }

        setGeoLoading(true);
        setGeoError(null);
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const response = await fetch('/api/v1/city/locate', {
                        method: 'POST',
                        credentials: 'same-origin',
                        headers: {
                            Accept: 'application/json',
                            'Content-Type': 'application/json',
                            'X-XSRF-TOKEN': xsrfToken(),
                        },
                        body: JSON.stringify({
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                        }),
                    });
                    const json = (await response.json()) as { ok?: boolean; city?: { slug: string }; message?: string };
                    if (!response.ok || !json.city?.slug) {
                        setGeoError(json.message ?? 'Не удалось определить город.');
                        return;
                    }
                    switchCity(json.city.slug);
                } catch {
                    setGeoError('Не удалось определить город. Выберите из списка.');
                } finally {
                    setGeoLoading(false);
                }
            },
            () => {
                setGeoLoading(false);
                setGeoError('Нет доступа к геолокации. Выберите город вручную.');
            },
            { enableHighAccuracy: false, timeout: 12_000, maximumAge: 300_000 },
        );
    };

    if (!prompt || max_app) {
        return null;
    }

    const suggested = prompt.suggested;
    const hint =
        prompt.source === 'ip'
            ? 'Определили по вашему IP-адресу. Можно изменить или уточнить по GPS.'
            : 'Выберите город, чтобы видеть актуальные клиники и цены.';

    return (
        <>
            <Modal
                open={open}
                onClose={() => confirmCity(current.slug)}
                title="Ваш город"
                footer={
                    <div className="city-prompt__actions">
                        <Button type="button" variant="dark" className="city-prompt__yes" onClick={() => switchCity(suggested.slug)}>
                            Да, {suggested.name}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setListOpen(true)}>
                            Выбрать другой
                        </Button>
                    </div>
                }
            >
                <div className="city-prompt stack">
                    <p className="city-prompt__lead">
                        Похоже, вы в <strong>{suggested.name_in ?? suggested.name}</strong>. Показывать клиники и цены для этого города?
                    </p>
                    <p className="text-sm text-muted">{hint}</p>
                    <Button type="button" variant="secondary" size="sm" loading={geoLoading} onClick={detectByDevice} className="city-prompt__geo">
                        Определить по GPS
                    </Button>
                    {geoError ? <p className="text-sm city-prompt__error">{geoError}</p> : null}
                </div>
            </Modal>

            <CitySelectModal
                open={listOpen}
                onClose={() => setListOpen(false)}
                cities={cities ?? []}
                currentSlug={current.slug}
                onPick={switchCity}
                title="Выберите город"
            />
        </>
    );
}
