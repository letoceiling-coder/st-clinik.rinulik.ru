import { router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import ClinicCard, { ClinicFeatures } from '@/components/ClinicCard';
import { Gallery, PriceTable, RatingSummary, ScheduleView, documentTitle } from '@/components/ClinicParts';
import { CompareButton, FavoriteButton } from '@/components/CollectionButtons';
import DoctorCard from '@/components/DoctorCard';
import Icon from '@/components/Icon';
import { useLead } from '@/components/LeadContext';
import ReviewCard from '@/components/ReviewCard';
import ReviewForm from '@/components/ReviewForm';
import { ConcernChips } from '@/components/Tiles';
import { AnchorButton, Button } from '@/components/ui/Button';
import { Alert, Badge, Breadcrumbs, EmptyState, Pagination } from '@/components/ui/Misc';
import { cx, doctorsWord, phoneHref, priceFrom, reviewsWord } from '@/lib/format';
import type { ClinicCardData, ClinicDetailData, ConcernData, Crumb, Paginated, ReviewData } from '@/lib/types';

interface Props {
    clinic: ClinicDetailData;
    reviews: Paginated<ReviewData>;
    review_filters: { rating?: number };
    distribution: Record<string, number>;
    similar: ClinicCardData[];
    concerns: ConcernData[];
    review_options: { doctors: { id: number; name: string }[]; services: { id: number; name: string }[] };
    breadcrumbs: Crumb[];
}

const SECTIONS = [
    ['about', 'О клинике'],
    ['doctors', 'Врачи'],
    ['prices', 'Цены'],
    ['reviews', 'Отзывы'],
    ['contacts', 'Контакты'],
] as const;

export default function ClinicShow({ clinic, reviews, review_filters, distribution, similar, concerns, review_options, breadcrumbs }: Props) {
    const lead = useLead();
    const { url } = usePage();
    const [group, setGroup] = useState(0);
    const [section, setSection] = useState<string>('about');

    const open = (extra: Partial<Parameters<typeof lead.open>[0]> = {}) =>
        lead.open({
            slug: clinic.slug,
            name: clinic.name,
            phone: clinic.phone,
            doctors: review_options.doctors,
            services: review_options.services,
            source: 'clinic_page',
            ...extra,
        });

    useEffect(() => {
        const ids = SECTIONS.map(([id]) => id);
        const io = new IntersectionObserver(
            (entries) => {
                const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
                if (visible) setSection(visible.target.id);
            },
            { rootMargin: '-30% 0px -60% 0px', threshold: [0, 0.2, 0.6] },
        );
        ids.forEach((id) => {
            const el = document.getElementById(id);
            if (el) io.observe(el);
        });
        return () => io.disconnect();
    }, [url]);

    const filterReviews = (rating: number) =>
        router.get(`/clinics/${clinic.slug}`, rating ? { rating } : {}, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
            only: ['reviews', 'review_filters'],
        });

    const activeRating = review_filters.rating ?? 0;
    const ratingCount = Object.values(distribution).reduce((a, b) => a + b, 0);
    const hasPrices = clinic.prices.length > 0;
    const currentGroup = clinic.prices[group] ?? clinic.prices[0];

    return (
        <>
            <Breadcrumbs items={breadcrumbs} />

            <div className="container clinic-top">
                <div className="clinic-top__main">
                    <header className="clinic-head">
                        <div className="clinic-head__badges">
                            {clinic.is_verified ? (
                                <Badge tone="success" icon="shield">
                                    Клиника проверена
                                </Badge>
                            ) : null}
                            {clinic.license.confirmed ? <Badge tone="info">Лицензия подтверждена</Badge> : null}
                            {clinic.is_24_7 ? <Badge tone="dark">Круглосуточно</Badge> : null}
                            {clinic.accepts_children ? <Badge tone="primary">{clinic.children_age_from ? `Дети с ${clinic.children_age_from} лет` : 'Принимают детей'}</Badge> : null}
                        </div>
                        <h1>{clinic.name}</h1>
                        {clinic.tagline ? <p className="clinic-head__tagline">{clinic.tagline}</p> : null}
                        <div className="clinic-head__meta">
                            {clinic.reviews_count > 0 ? (
                                <a href="#reviews" className="rating">
                                    <Icon name="star" size={22} />
                                    {clinic.rating.toFixed(1).replace('.', ',')}
                                    <span className="rating__count">{reviewsWord(clinic.reviews_count)}</span>
                                </a>
                            ) : (
                                <span className="rating__count">Пока нет отзывов</span>
                            )}
                            <span className="meta-item">
                                <Icon name="pin" size={18} />
                                {clinic.address}
                                {clinic.district ? ` · ${clinic.district}` : ''}
                                {clinic.metro ? ` · м. ${clinic.metro}` : ''}
                            </span>
                            <span className="meta-item">
                                <Icon name="clock" size={18} />
                                {clinic.today}
                            </span>
                        </div>
                    </header>

                    <Gallery photos={clinic.photos} name={clinic.name} />
                </div>

                <aside className="booking card card--shadow" aria-label="Запись в клинику">
                    <div className="booking__price">
                        <span className="text-sm text-muted">Приём и диагностика</span>
                        <b>{priceFrom(clinic.min_price)}</b>
                        <span className="text-xs text-muted">Окончательную стоимость называет врач после осмотра.</span>
                    </div>
                    <Button size="lg" block onClick={() => open()}>
                        Записаться онлайн
                    </Button>
                    {clinic.phone ? (
                        <AnchorButton href={phoneHref(clinic.phone)} variant="outline" block icon="phone">
                            {clinic.phone}
                        </AnchorButton>
                    ) : null}
                    <div className="booking__row">
                        <CompareButton type="clinic" id={clinic.id} name={clinic.name} />
                        <FavoriteButton type="clinic" id={clinic.id} name={clinic.name} floating={false} />
                    </div>
                    <ClinicFeatures clinic={clinic} limit={8} />
                    {clinic.payment_methods.length > 0 ? <p className="text-sm text-muted">Оплата: {clinic.payment_methods.join(', ')}</p> : null}
                </aside>
            </div>

            <nav className="subnav" aria-label="Разделы страницы">
                <div className="container">
                    <ul>
                        {SECTIONS.map(([id, label]) => (
                            <li key={id}>
                                <a href={`#${id}`} className={cx(section === id && 'is-active')} aria-current={section === id ? 'true' : undefined}>
                                    {label}
                                    {id === 'doctors' ? <span className="text-muted"> {clinic.doctors.length}</span> : null}
                                    {id === 'reviews' ? <span className="text-muted"> {clinic.reviews_count}</span> : null}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </nav>

            <div className="container clinic-body">
                <section id="about" className="block" aria-labelledby="about-h">
                    <h2 id="about-h">О клинике</h2>
                    {clinic.description ? <p className="lead-text">{clinic.description}</p> : null}
                    <div className="facts">
                        {clinic.founded_year ? (
                            <div>
                                <b>{clinic.founded_year}</b>
                                <span>год основания</span>
                            </div>
                        ) : null}
                        <div>
                            <b>{doctorsWord(clinic.doctors_count)}</b>
                            <span>в клинике</span>
                        </div>
                        <div>
                            <b>{clinic.specialties.length}</b>
                            <span>направлений</span>
                        </div>
                    </div>
                    {clinic.specialties.length > 0 ? (
                        <ul className="tags" aria-label="Направления">
                            {clinic.specialties.map((s) => (
                                <li key={s.slug}>
                                    <span className="chip chip--soft">{s.name}</span>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                    {clinic.achievements.length > 0 ? (
                        <div>
                            <h3>Достижения и награды</h3>
                            <ul className="check-list">
                                {clinic.achievements.map((a) => (
                                    <li key={a}>
                                        <Icon name="award" size={20} />
                                        {a}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                    {clinic.restrictions ? (
                        <Alert tone="warning" icon="alert">
                            <b>Ограничения приёма.</b> {clinic.restrictions}
                        </Alert>
                    ) : null}
                    {concerns.length > 0 ? (
                        <div>
                            <h3>С чем обращаются в эту клинику</h3>
                            <ConcernChips concerns={concerns} scroll={false} />
                        </div>
                    ) : null}
                </section>

                <section id="doctors" className="block" aria-labelledby="doctors-h">
                    <h2 id="doctors-h">Врачи клиники</h2>
                    {clinic.doctors.length === 0 ? (
                        <EmptyState icon="users" title="Врачи пока не добавлены" />
                    ) : (
                        <div className="grid grid--doctors grid--2">
                            {clinic.doctors.map((d) => (
                                <DoctorCard key={d.id} doctor={{ ...d, clinic: d.clinic ?? { id: clinic.id, slug: clinic.slug, name: clinic.name, address: clinic.address, phone: clinic.phone, city: clinic.city, rating: clinic.rating, is_verified: clinic.is_verified, same_day: clinic.same_day } }} />
                            ))}
                        </div>
                    )}
                </section>

                <section id="prices" className="block" aria-labelledby="prices-h">
                    <h2 id="prices-h">Услуги и цены</h2>
                    {!hasPrices ? (
                        <EmptyState icon="ruble" title="Прайс пока не опубликован" text="Уточните стоимость по телефону или в заявке." />
                    ) : (
                        <>
                            <div className="chip-scroll" role="tablist" aria-label="Группы услуг">
                                {clinic.prices.map((g, i) => (
                                    <button key={g.group} role="tab" aria-selected={group === i} type="button" className={cx('chip', group === i && 'is-active')} onClick={() => setGroup(i)}>
                                        {g.group}
                                    </button>
                                ))}
                            </div>
                            <PriceTable items={currentGroup.items} />
                            <p className="text-xs text-muted">Цены указаны «от». Окончательная стоимость определяется врачом после осмотра и согласования плана лечения. Не является публичной офертой.</p>
                        </>
                    )}
                </section>

                <section id="reviews" className="block" aria-labelledby="reviews-h">
                    <h2 id="reviews-h">Отзывы пациентов</h2>
                    <RatingSummary rating={clinic.rating} count={ratingCount || clinic.reviews_count} distribution={distribution} active={activeRating} onPick={filterReviews} />
                    {reviews.data.length === 0 ? (
                        <EmptyState icon="thumb" title={activeRating ? 'Нет отзывов с такой оценкой' : 'Отзывов пока нет'} text="Поделитесь опытом после визита — отзыв появится после проверки модератором." />
                    ) : (
                        <>
                            <div className="stack-lg">
                                {reviews.data.map((r) => (
                                    <ReviewCard key={r.id} review={r} />
                                ))}
                            </div>
                            <Pagination page={reviews} only={['reviews', 'review_filters']} keepScroll />
                        </>
                    )}
                    <ReviewForm clinicSlug={clinic.slug} doctors={review_options.doctors} services={review_options.services} />
                </section>

                <section id="contacts" className="block" aria-labelledby="contacts-h">
                    <h2 id="contacts-h">Контакты и режим работы</h2>
                    <div className="two-col two-col--even">
                        <div className="card">
                            <ul className="contact-list">
                                <li>
                                    <Icon name="pin" size={20} />
                                    <span>
                                        {clinic.address}
                                        {clinic.metro ? <span className="text-muted"> · м. {clinic.metro}</span> : null}
                                    </span>
                                </li>
                                {clinic.phone ? (
                                    <li>
                                        <Icon name="phone" size={20} />
                                        <a href={phoneHref(clinic.phone)} className="link">
                                            {clinic.phone}
                                        </a>
                                    </li>
                                ) : null}
                                {clinic.email ? (
                                    <li>
                                        <Icon name="mail" size={20} />
                                        <a href={`mailto:${clinic.email}`} className="link">
                                            {clinic.email}
                                        </a>
                                    </li>
                                ) : null}
                                {clinic.website ? (
                                    <li>
                                        <Icon name="globe" size={20} />
                                        <a href={clinic.website} className="link" rel="nofollow noopener noreferrer" target="_blank">
                                            {clinic.website.replace(/^https?:\/\//, '')}
                                        </a>
                                    </li>
                                ) : null}
                            </ul>
                            {clinic.lat && clinic.lng ? (
                                <a
                                    className="map-link"
                                    href={`https://yandex.ru/maps/?pt=${clinic.lng},${clinic.lat}&z=16&l=map`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Icon name="pin" size={18} /> Показать на карте
                                </a>
                            ) : null}
                        </div>
                        <div className="card">
                            <ScheduleView week={clinic.week} />
                        </div>
                    </div>

                    <div className="card card--muted legal">
                        <h3>Юридическая информация</h3>
                        {clinic.organization ? <p>{clinic.organization.legal_name ?? clinic.organization.name}</p> : null}
                        {clinic.license.number ? (
                            <p>
                                Лицензия № {clinic.license.number}
                                {clinic.license.issuer ? `, выдана: ${clinic.license.issuer}` : ''}
                                {clinic.license.confirmed ? ' — документ проверен модератором.' : ' — документ ещё не проверен.'}
                            </p>
                        ) : (
                            <p>Номер лицензии не указан.</p>
                        )}
                        {clinic.documents.length > 0 ? (
                            <ul className="check-list">
                                {clinic.documents.map((d, i) => (
                                    <li key={i}>
                                        <Icon name="file" size={18} />
                                        {documentTitle(d)}
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                        <p className="text-xs text-muted">Имеются противопоказания. Необходима консультация специалиста.</p>
                    </div>
                </section>

                {similar.length > 0 ? (
                    <section className="block" aria-labelledby="similar-h">
                        <h2 id="similar-h">Похожие клиники</h2>
                        <div className="grid grid--cards">
                            {similar.map((c) => (
                                <ClinicCard key={c.id} clinic={c} layout="tile" />
                            ))}
                        </div>
                    </section>
                ) : null}
            </div>

            <div className="sticky-cta" role="region" aria-label="Быстрая запись">
                <div>
                    <b>{priceFrom(clinic.min_price)}</b>
                    <span className="text-xs text-muted">приём и диагностика</span>
                </div>
                {clinic.phone ? (
                    <a className="btn btn--outline btn--icon btn--round" href={phoneHref(clinic.phone)} aria-label="Позвонить">
                        <Icon name="phone" size={20} />
                    </a>
                ) : null}
                <Button onClick={() => open()}>Записаться</Button>
            </div>
        </>
    );
}
