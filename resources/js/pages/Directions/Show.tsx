import { Link, usePage } from '@inertiajs/react';
import ClinicCard from '@/components/ClinicCard';
import DoctorCard from '@/components/DoctorCard';
import Icon from '@/components/Icon';
import { ConcernChips } from '@/components/Tiles';
import { Alert, Breadcrumbs, EmptyState, SectionHead } from '@/components/ui/Misc';
import { LinkButton } from '@/components/ui/Button';
import { useCity } from '@/lib/city';
import { clinicsWord, priceFrom } from '@/lib/format';
import type { ClinicCardData, ConcernData, Crumb, DoctorData, SharedProps } from '@/lib/types';

interface Props {
    specialty: { slug: string; name: string; description: string | null; when_to_apply: string | null; restrictions: string | null; icon: string | null };
    services: { slug: string; name: string; description: string | null; duration_min: number | null; price_from: number | null; clinics: number }[];
    clinics: ClinicCardData[];
    clinics_total: number;
    doctors: DoctorData[];
    concerns: ConcernData[];
    breadcrumbs: Crumb[];
}

export default function DirectionShow({ specialty, services, clinics, clinics_total, doctors, concerns, breadcrumbs }: Props) {
    const city = useCity();
    const { seo } = usePage<SharedProps>().props;

    return (
        <>
            <Breadcrumbs items={breadcrumbs} />
            <header className="container page-head page-head--icon">
                <span className="tile__icon tile__icon--lg">
                    <Icon name={specialty.icon ?? 'tooth'} size={36} />
                </span>
                <div>
                    <h1>{seo?.h1 ?? `${specialty.name} ${city.nameIn}`}</h1>
                    {specialty.description ? <p className="text-muted page-head__lead">{specialty.description}</p> : null}
                </div>
            </header>

            <div className="container two-col">
                <div className="stack-lg">
                    {specialty.when_to_apply ? (
                        <section className="card" aria-labelledby="when">
                            <h2 id="when" className="card-title">
                                Когда обращаться
                            </h2>
                            <p>{specialty.when_to_apply}</p>
                        </section>
                    ) : null}

                    <section aria-labelledby="svc">
                        <h2 id="svc" className="card-title">
                            Услуги и цены
                        </h2>
                        {services.length === 0 ? (
                            <EmptyState icon="list" title="Услуги скоро появятся" />
                        ) : (
                            <ul className="price-list">
                                {services.map((s) => (
                                    <li key={s.slug}>
                                        <Link href={city.path('clinics', { service: s.slug })} className="price-row">
                                            <span className="price-row__name">
                                                <b>{s.name}</b>
                                                {s.description ? <span className="text-sm text-muted">{s.description}</span> : null}
                                            </span>
                                            <span className="price-row__meta text-sm text-muted">{s.clinics > 0 ? clinicsWord(s.clinics) : '—'}</span>
                                            <b className="price-row__price">{priceFrom(s.price_from)}</b>
                                            <Icon name="chevron-right" size={18} />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <p className="text-xs text-muted" style={{ marginTop: 12 }}>
                            Цена «от». Окончательная стоимость определяется после осмотра и составления плана лечения.
                        </p>
                    </section>
                </div>

                <aside className="stack">
                    {specialty.restrictions ? (
                        <Alert tone="warning" icon="alert">
                            <b>Ограничения приёма.</b> {specialty.restrictions}
                        </Alert>
                    ) : null}
                    {concerns.length > 0 ? (
                        <div className="card">
                            <h2 className="card-title" style={{ fontSize: 'var(--fs-lg)' }}>
                                С чем обращаются
                            </h2>
                            <ConcernChips concerns={concerns} scroll={false} />
                        </div>
                    ) : null}
                </aside>
            </div>

            <section className="section" aria-labelledby="dir-clinics">
                <div className="container">
                    <SectionHead
                        title={<span id="dir-clinics">Клиники по направлению</span>}
                        text={clinics_total > 0 ? `Найдено: ${clinicsWord(clinics_total)}` : undefined}
                        action={
                            <LinkButton href={city.path('clinics', { specialty: specialty.slug })} variant="dark" size="sm">
                                Все клиники
                            </LinkButton>
                        }
                    />
                    {clinics.length === 0 ? (
                        <EmptyState title="Пока нет клиник по этому направлению" />
                    ) : (
                        <div className="grid grid--cards">
                            {clinics.map((c) => (
                                <ClinicCard key={c.id} clinic={c} layout="tile" />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {doctors.length > 0 ? (
                <section className="section section--muted" aria-labelledby="dir-doctors">
                    <div className="container">
                        <SectionHead
                            title={<span id="dir-doctors">Врачи</span>}
                            action={
                                <Link href={city.path('doctors', { specialty: specialty.slug })} className="link-arrow">
                                    Все врачи <Icon name="arrow-right" size={18} />
                                </Link>
                            }
                        />
                        <div className="grid grid--doctors">
                            {doctors.map((d) => (
                                <DoctorCard key={d.id} doctor={d} />
                            ))}
                        </div>
                    </div>
                </section>
            ) : null}
        </>
    );
}
