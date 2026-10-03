import { Link, usePage } from '@inertiajs/react';
import ClinicCard from '@/components/ClinicCard';
import Icon from '@/components/Icon';
import { ConcernChips } from '@/components/Tiles';
import { Alert, Breadcrumbs, EmptyState, SectionHead } from '@/components/ui/Misc';
import { LinkButton } from '@/components/ui/Button';
import { useCity } from '@/lib/city';
import { clinicsWord, priceFrom } from '@/lib/format';
import type { ClinicCardData, ConcernData, Crumb, SharedProps } from '@/lib/types';

interface Props {
    concern: { slug: string; name: string; hint: string | null; advice: string | null; icon: string | null };
    specialty: { slug: string; name: string; restrictions: string | null } | null;
    services: { slug: string; name: string; price_from: number | null; clinics: number }[];
    clinics: ClinicCardData[];
    clinics_total: number;
    other_concerns: ConcernData[];
    breadcrumbs: Crumb[];
}

export default function ConcernShow({ concern, specialty, services, clinics, clinics_total, other_concerns, breadcrumbs }: Props) {
    const city = useCity();
    const { seo } = usePage<SharedProps>().props;

    return (
        <>
            <Breadcrumbs items={breadcrumbs} />
            <header className="container page-head page-head--icon">
                <span className="tile__icon tile__icon--lg">
                    <Icon name={concern.icon ?? 'tooth'} size={36} />
                </span>
                <div>
                    <h1>{seo?.h1 ?? `${concern.name}: куда обратиться в ${city.nameIn}`}</h1>
                    {concern.hint ? <p className="text-muted page-head__lead">{concern.hint}</p> : null}
                </div>
            </header>

            <div className="container two-col">
                <div className="stack-lg">
                    <Alert tone="warning" icon="alert">
                        <b>Это справочная информация, а не диагноз.</b> Причину проблемы определяет только врач после осмотра. При сильной боли, отёке лица, температуре или затруднённом дыхании обратитесь в неотложную помощь.
                    </Alert>

                    {concern.advice ? (
                        <section className="card" aria-labelledby="advice">
                            <h2 id="advice" className="card-title">
                                Что делать
                            </h2>
                            <p>{concern.advice}</p>
                        </section>
                    ) : null}

                    {services.length > 0 ? (
                        <section aria-labelledby="c-services">
                            <h2 id="c-services" className="card-title">
                                Чем это лечат и сколько стоит
                            </h2>
                            <ul className="price-list">
                                {services.map((s) => (
                                    <li key={s.slug}>
                                        <Link href={city.path('clinics', { service: s.slug })} className="price-row">
                                            <span className="price-row__name">
                                                <b>{s.name}</b>
                                            </span>
                                            <span className="price-row__meta text-sm text-muted">{s.clinics > 0 ? clinicsWord(s.clinics) : '—'}</span>
                                            <b className="price-row__price">{priceFrom(s.price_from)}</b>
                                            <Icon name="chevron-right" size={18} />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-xs text-muted" style={{ marginTop: 12 }}>
                                Цена «от». Окончательная стоимость определяется после осмотра.
                            </p>
                        </section>
                    ) : null}
                </div>

                <aside className="stack">
                    {specialty ? (
                        <div className="card card--muted">
                            <p className="text-sm text-muted">Подходящее направление</p>
                            <h2 style={{ fontSize: 'var(--fs-lg)', margin: '4px 0 12px' }}>{specialty.name}</h2>
                            <LinkButton href={city.direction(specialty.slug)} variant="dark" size="sm">
                                Открыть направление
                            </LinkButton>
                            {specialty.restrictions ? <p className="text-sm text-muted" style={{ marginTop: 12 }}>{specialty.restrictions}</p> : null}
                        </div>
                    ) : null}
                    {other_concerns.length > 0 ? (
                        <div className="card">
                            <h2 className="card-title" style={{ fontSize: 'var(--fs-lg)' }}>
                                Другие запросы
                            </h2>
                            <ConcernChips concerns={other_concerns} scroll={false} />
                        </div>
                    ) : null}
                </aside>
            </div>

            <section className="section" aria-labelledby="c-clinics">
                <div className="container">
                    <SectionHead
                        title={<span id="c-clinics">Клиники, куда можно обратиться</span>}
                        text={clinics_total > 0 ? `Найдено: ${clinicsWord(clinics_total)}` : undefined}
                        action={
                            specialty ? (
                                <LinkButton href={city.path('clinics', { specialty: specialty.slug })} variant="dark" size="sm">
                                    Все клиники
                                </LinkButton>
                            ) : undefined
                        }
                    />
                    {clinics.length === 0 ? (
                        <EmptyState title="Пока нет подходящих клиник" />
                    ) : (
                        <div className="grid grid--cards">
                            {clinics.map((c) => (
                                <ClinicCard key={c.id} clinic={c} layout="tile" />
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </>
    );
}
