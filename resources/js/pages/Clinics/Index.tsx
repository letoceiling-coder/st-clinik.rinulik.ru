import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import AdSlot, { type AdBanner } from '@/components/AdSlot';
import ClinicCard, { ClinicCardSkeleton } from '@/components/ClinicCard';
import { CatalogLayout, useCatalog } from '@/components/Catalog';
import { EmptyState, Breadcrumbs, Pagination } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { useCity } from '@/lib/city';
import { clinicsWord, cx } from '@/lib/format';
import YandexMap from '@/components/YandexMap';
import type { ClinicCardData, Crumb, Flat, FilterOptions, MapClinicPoint, Paginated, SharedProps } from '@/lib/types';

interface Props {
    clinics: Paginated<ClinicCardData>;
    recommended_clinics: ClinicCardData[];
    banner_catalog: AdBanner[];
    map_clinics: MapClinicPoint[];
    filters: Flat;
    options: FilterOptions;
    service_name: string | null;
    breadcrumbs: Crumb[];
}

export default function ClinicsIndex({ clinics, recommended_clinics, banner_catalog, map_clinics, filters, options, service_name, breadcrumbs }: Props) {
    const city = useCity();
    const { seo } = usePage<SharedProps>().props;
    const cat = useCatalog(filters);
    const [mapOpen, setMapOpen] = useState(false);
    const title = seo?.h1 ?? `Стоматологии ${city.nameIn}`;

    return (
        <>
            <Breadcrumbs items={breadcrumbs} />
            <header className="container page-head">
                <h1>{service_name ? `${service_name} ${city.nameIn}` : title}</h1>
                <p className="text-muted">
                    Цены указаны «от». Окончательную стоимость лечения называет врач после осмотра.
                </p>
            </header>

            <CatalogLayout
                {...cat}
                options={options}
                mode="clinics"
                total={<b>{clinics.total > 0 ? `Найдено: ${clinicsWord(clinics.total)}` : 'Ничего не найдено'}</b>}
            >
                {recommended_clinics.length > 0 && !cat.loading ? (
                    <section className="recommended-block stack" aria-labelledby="recommended-h">
                        <div className="recommended-block__head">
                            <h2 id="recommended-h">Рекомендуем</h2>
                            <span className="text-xs text-muted">Продвижение</span>
                        </div>
                        <div className="stack-lg">
                            {recommended_clinics.map((c, i) => (
                                <ClinicCard key={c.id} clinic={c} priority={i < 2} />
                            ))}
                        </div>
                    </section>
                ) : null}

                <AdSlot banners={banner_catalog} slot="catalog" />

                {map_clinics.length > 0 ? (
                    <section className={cx('catalog__map card', mapOpen && 'catalog__map--open')} aria-labelledby="catalog-map-h">
                        <div className="catalog__map-head">
                            <h2 id="catalog-map-h" className="catalog__map-title">
                                На карте
                            </h2>
                            <Button type="button" variant="outline" size="sm" className="catalog__map-toggle" onClick={() => setMapOpen((open) => !open)} aria-expanded={mapOpen} aria-controls="catalog-map-body">
                                {mapOpen ? 'Скрыть карту' : 'Показать карту'}
                            </Button>
                        </div>
                        <div id="catalog-map-body" className={cx('catalog__map-body', !mapOpen && 'catalog__map-body--collapsed')}>
                            <div className="catalog__map-viewport">
                                <YandexMap points={map_clinics} className="catalog__map-frame" />
                            </div>
                        </div>
                    </section>
                ) : null}

                {cat.loading ? (
                    <div className="stack-lg">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <ClinicCardSkeleton key={i} />
                        ))}
                    </div>
                ) : clinics.data.length === 0 ? (
                    <EmptyState
                        title="По вашим условиям клиник не нашлось"
                        text="Попробуйте убрать часть фильтров или изменить район и услугу."
                        action={
                            <Button variant="outline" onClick={() => cat.apply({})}>
                                Сбросить фильтры
                            </Button>
                        }
                    />
                ) : (
                    <>
                        <div className="stack-lg">
                            {clinics.data.map((c, i) => (
                                <ClinicCard key={c.id} clinic={c} priority={i < 2} />
                            ))}
                        </div>
                        <Pagination page={clinics} />
                    </>
                )}
            </CatalogLayout>
        </>
    );
}
