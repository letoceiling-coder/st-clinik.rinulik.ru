import { usePage } from '@inertiajs/react';
import { CatalogLayout, useCatalog } from '@/components/Catalog';
import DoctorCard from '@/components/DoctorCard';
import { Button } from '@/components/ui/Button';
import { Breadcrumbs, EmptyState, Pagination, Skeleton } from '@/components/ui/Misc';
import { useCity } from '@/lib/city';
import { doctorsWord } from '@/lib/format';
import type { Crumb, DoctorData, Flat, FilterOptions, Paginated, SharedProps } from '@/lib/types';

interface Props {
    doctors: Paginated<DoctorData>;
    filters: Flat;
    options: FilterOptions;
    breadcrumbs: Crumb[];
}

export default function DoctorsIndex({ doctors, filters, options, breadcrumbs }: Props) {
    const city = useCity();
    const { seo } = usePage<SharedProps>().props;
    const cat = useCatalog(filters);

    return (
        <>
            <Breadcrumbs items={breadcrumbs} />
            <header className="container page-head">
                <h1>{seo?.h1 ?? `Стоматологи ${city.nameIn}`}</h1>
                <p className="text-muted">Стаж, рейтинг и отзывы пациентов. Стоимость приёма — «от», точную цену называет клиника.</p>
            </header>

            <CatalogLayout {...cat} options={options} mode="doctors" total={<b>{doctors.total > 0 ? `Найдено: ${doctorsWord(doctors.total)}` : 'Ничего не найдено'}</b>}>
                {cat.loading ? (
                    <div className="grid grid--doctors grid--2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} h={220} r={20} />
                        ))}
                    </div>
                ) : doctors.data.length === 0 ? (
                    <EmptyState
                        title="Врачей по таким условиям нет"
                        text="Измените направление или уберите часть фильтров."
                        action={
                            <Button variant="outline" onClick={() => cat.apply({})}>
                                Сбросить фильтры
                            </Button>
                        }
                    />
                ) : (
                    <>
                        <div className="grid grid--doctors grid--2">
                            {doctors.data.map((d) => (
                                <DoctorCard key={d.id} doctor={d} />
                            ))}
                        </div>
                        <Pagination page={doctors} />
                    </>
                )}
            </CatalogLayout>
        </>
    );
}
