import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
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

const VIEW_KEY = 'stk.catalog.view';

export default function ClinicsIndex({ clinics, recommended_clinics, banner_catalog, map_clinics, filters, options, service_name, breadcrumbs }: Props) {
    const city = useCity();
    const { seo } = usePage<SharedProps>().props;
    const cat = useCatalog(filters);
    /** null — по умолчанию: карта открыта на компьютере и свёрнута на телефоне (решает CSS, без скачка вёрстки). */
    const [mapPref, setMapPref] = useState<boolean | null>(null);
    const [isWide, setIsWide] = useState(false);
    useEffect(() => {
        const query = window.matchMedia('(min-width: 769px)');
        const sync = (): void => setIsWide(query.matches);
        sync();
        query.addEventListener('change', sync);

        return () => query.removeEventListener('change', sync);
    }, []);
    const mapOpen = mapPref ?? isWide;

    /** Вид карточек запоминается в браузере; сетка доступна только на широком экране. */
    const [view, setView] = useState<'list' | 'grid'>('list');
    const [isDesktop, setIsDesktop] = useState(false);
    useEffect(() => {
        try {
            if (window.localStorage.getItem(VIEW_KEY) === 'grid') {
                setView('grid');
            }
        } catch {
            /* без хранилища — список */
        }
        const query = window.matchMedia('(min-width: 961px)');
        const sync = (): void => setIsDesktop(query.matches);
        sync();
        query.addEventListener('change', sync);

        return () => query.removeEventListener('change', sync);
    }, []);
    const changeView = (next: 'list' | 'grid'): void => {
        setView(next);
        try {
            window.localStorage.setItem(VIEW_KEY, next);
        } catch {
            /* ignore */
        }
    };
    const grid = view === 'grid' && isDesktop;
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
                mapToggle={map_clinics.length > 0 ? { open: mapOpen, onToggle: () => setMapPref(!mapOpen) } : undefined}
                view={{ value: view, onChange: changeView }}
            >
                {recommended_clinics.length > 0 && !cat.loading ? (
                    <section className="recommended-block stack" aria-labelledby="recommended-h">
                        <div className="recommended-block__head">
                            <h2 id="recommended-h">Рекомендуем</h2>
                            <span className="text-xs text-muted">Реклама</span>
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
                    <section
                        className={cx('catalog__map', mapPref === null ? 'catalog__map--auto' : mapPref ? 'catalog__map--open' : 'catalog__map--closed')}
                        aria-label="Клиники на карте"
                    >
                        <div id="catalog-map-body" className="catalog__map-body">
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
                        <div className={cx('catalog__cards', grid && 'catalog__cards--grid')}>
                            {clinics.data.map((c, i) => (
                                <ClinicCard key={c.id} clinic={c} priority={i < 2} layout={grid ? 'tile' : 'row'} />
                            ))}
                        </div>
                        <Pagination page={clinics} />
                    </>
                )}
            </CatalogLayout>
        </>
    );
}
