import { usePage } from '@inertiajs/react';
import { ConcernChips, SpecialtyTile } from '@/components/Tiles';
import { Breadcrumbs, SectionHead } from '@/components/ui/Misc';
import { useCity } from '@/lib/city';
import type { ConcernData, Crumb, SharedProps, SpecialtyData } from '@/lib/types';

export default function DirectionsIndex({ specialties, concerns, breadcrumbs }: { specialties: SpecialtyData[]; concerns: ConcernData[]; breadcrumbs: Crumb[] }) {
    const city = useCity();
    const { seo } = usePage<SharedProps>().props;

    return (
        <>
            <Breadcrumbs items={breadcrumbs} />
            <header className="container page-head">
                <h1>{seo?.h1 ?? `Направления стоматологии ${city.nameIn}`}</h1>
                <p className="text-muted">Выберите направление, чтобы увидеть услуги, цены и клиники, которые ими занимаются.</p>
            </header>

            <section className="section section--tight" aria-labelledby="c-h">
                <div className="container">
                    <SectionHead title={<span id="c-h">С чем чаще обращаются</span>} />
                    <ConcernChips concerns={concerns} />
                </div>
            </section>

            <section className="section" aria-label="Все направления">
                <div className="container">
                    <div className="grid grid--tiles">
                        {specialties.map((s) => (
                            <SpecialtyTile key={s.slug} s={s} />
                        ))}
                    </div>
                </div>
            </section>
        </>
    );
}
