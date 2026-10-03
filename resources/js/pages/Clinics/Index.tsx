import { usePage } from '@inertiajs/react';
import ClinicCard, { ClinicCardSkeleton } from '@/components/ClinicCard';
import { CatalogLayout, useCatalog } from '@/components/Catalog';
import { EmptyState, Breadcrumbs, Pagination } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { useCity } from '@/lib/city';
import { clinicsWord } from '@/lib/format';
import type { ClinicCardData, Crumb, Flat, FilterOptions, Paginated, SharedProps } from '@/lib/types';

interface Props {
    clinics: Paginated<ClinicCardData>;
    filters: Flat;
    options: FilterOptions;
    service_name: string | null;
    breadcrumbs: Crumb[];
}

export default function ClinicsIndex({ clinics, filters, options, service_name, breadcrumbs }: Props) {
    const city = useCity();
    const { seo } = usePage<SharedProps>().props;
    const cat = useCatalog(filters);
    const title = seo?.h1 ?? `Стоматологии в ${city.nameIn}`;

    return (
        <>
            <Breadcrumbs items={breadcrumbs} />
            <header className="container page-head">
                <h1>{service_name ? `${service_name} в ${city.nameIn}` : title}</h1>
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
