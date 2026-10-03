import { Link } from '@inertiajs/react';
import ClinicCard from '@/components/ClinicCard';
import DoctorCard from '@/components/DoctorCard';
import Icon from '@/components/Icon';
import SearchBox from '@/components/SearchBox';
import { ConcernChips } from '@/components/Tiles';
import { EmptyState, SectionHead } from '@/components/ui/Misc';
import { useCity } from '@/lib/city';
import type { ClinicCardData, ConcernData, DoctorData } from '@/lib/types';

interface Hit {
    name: string;
    hint?: string | null;
    url: string;
}
interface Results {
    query: string;
    cities: Hit[];
    services: Hit[];
    concerns: Hit[];
    specialties: Hit[];
    clinic_cards?: ClinicCardData[];
    clinic_total?: number;
    doctor_cards?: DoctorData[];
}

export default function SearchIndex({ q, results, concerns }: { q: string; results: Results | null; concerns: ConcernData[] }) {
    const city = useCity();
    const quick = results ? [...results.concerns, ...results.services, ...results.specialties, ...results.cities] : [];
    const nothing = results && !quick.length && !(results.clinic_cards?.length) && !(results.doctor_cards?.length);

    return (
        <div className="container page-head">
            <h1>{q ? `Результаты поиска: «${q}»` : 'Поиск'}</h1>
            <div style={{ maxWidth: 720, margin: '20px 0 32px' }}>
                <SearchBox variant="hero" />
            </div>

            {!results ? (
                <section>
                    <SectionHead title="С чем чаще обращаются" />
                    <ConcernChips concerns={concerns} />
                </section>
            ) : nothing ? (
                <EmptyState
                    title="Ничего не найдено"
                    text={
                        <>
                            Проверьте написание или выберите готовый запрос. Мы ищем в {city.nameIn} по клиникам, врачам, услугам и симптомам.
                        </>
                    }
                    action={<ConcernChips concerns={concerns} scroll={false} />}
                />
            ) : (
                <div className="stack-lg" style={{ paddingBottom: 'var(--space-12)' }}>
                    {quick.length > 0 ? (
                        <section aria-label="Быстрые переходы">
                            <ul className="hit-list">
                                {quick.map((h) => (
                                    <li key={h.url}>
                                        <Link href={h.url} className="hit card card--link">
                                            <b>{h.name}</b>
                                            {h.hint ? <span className="text-sm text-muted">{h.hint}</span> : null}
                                            <Icon name="arrow-right" size={18} />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ) : null}

                    {results.clinic_cards?.length ? (
                        <section aria-labelledby="s-clinics">
                            <SectionHead title={<span id="s-clinics">Клиники</span>} text={results.clinic_total ? `Найдено: ${results.clinic_total}` : undefined} />
                            <div className="stack-lg">
                                {results.clinic_cards.map((c) => (
                                    <ClinicCard key={c.id} clinic={c} />
                                ))}
                            </div>
                            {results.clinic_total && results.clinic_total > results.clinic_cards.length ? (
                                <p style={{ marginTop: 16 }}>
                                    <Link href={city.path('clinics', { q })} className="link-arrow">
                                        Показать все клиники <Icon name="arrow-right" size={18} />
                                    </Link>
                                </p>
                            ) : null}
                        </section>
                    ) : null}

                    {results.doctor_cards?.length ? (
                        <section aria-labelledby="s-doctors">
                            <SectionHead title={<span id="s-doctors">Врачи</span>} />
                            <div className="grid grid--doctors">
                                {results.doctor_cards.map((d) => (
                                    <DoctorCard key={d.id} doctor={d} />
                                ))}
                            </div>
                        </section>
                    ) : null}
                </div>
            )}
        </div>
    );
}
