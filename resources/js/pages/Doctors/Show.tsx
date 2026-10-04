import ClinicCard from '@/components/ClinicCard';
import { RatingSummary } from '@/components/ClinicParts';
import { CompareButton, FavoriteButton } from '@/components/CollectionButtons';
import DoctorCard from '@/components/DoctorCard';
import Icon from '@/components/Icon';
import { useLead } from '@/components/LeadContext';
import { DoctorArt } from '@/components/PhotoArt';
import ReviewCard from '@/components/ReviewCard';
import { Pagination, Alert, Badge, Breadcrumbs, EmptyState } from '@/components/ui/Misc';
import { Button } from '@/components/ui/Button';
import { money, priceFrom, reviewsWord, yearsWord } from '@/lib/format';
import type { ClinicCardData, Crumb, DoctorData, Paginated, ReviewData } from '@/lib/types';

interface Props {
    doctor: DoctorData;
    clinic: ClinicCardData | null;
    prices: { name: string; slug: string; price_from: number; price_to: number | null }[];
    reviews: Paginated<ReviewData>;
    distribution: Record<string, number>;
    colleagues: DoctorData[];
    breadcrumbs: Crumb[];
}

export default function DoctorShow({ doctor, clinic, prices, reviews, distribution, colleagues, breadcrumbs }: Props) {
    const lead = useLead();
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);

    const open = () =>
        clinic &&
        lead.open({
            slug: clinic.slug,
            name: clinic.name,
            phone: clinic.phone,
            doctorId: doctor.id,
            doctors: [{ id: doctor.id, name: doctor.name }],
            source: 'doctor_page',
        });

    return (
        <>
            <Breadcrumbs items={breadcrumbs} />

            <div className="container doctor-top">
                <div className="doctor-top__photo">
                    <DoctorArt seed={doctor.art_seed} photoUrl={doctor.photo_url} name={doctor.name} />
                </div>
                <div className="doctor-top__info">
                    <div className="clinic-head__badges">
                        {doctor.is_verified ? (
                            <Badge tone="success" icon="shield">
                                Врач проверен
                            </Badge>
                        ) : null}
                        {doctor.accepts_children ? <Badge tone="primary">{doctor.children_age_from ? `Принимает детей с ${doctor.children_age_from} лет` : 'Принимает детей'}</Badge> : null}
                    </div>
                    <h1>{doctor.name}</h1>
                    <p className="clinic-head__tagline">{doctor.position}</p>
                    <div className="clinic-head__meta">
                        {doctor.reviews_count > 0 ? (
                            <a href="#reviews" className="rating">
                                <Icon name="star" size={22} />
                                {doctor.rating.toFixed(1).replace('.', ',')}
                                <span className="rating__count">{reviewsWord(doctor.reviews_count)}</span>
                            </a>
                        ) : (
                            <span className="rating__count">Пока нет отзывов</span>
                        )}
                        <span className="meta-item">
                            <Icon name="award" size={18} />
                            Стаж {yearsWord(doctor.experience_years)}
                        </span>
                    </div>
                    {doctor.specialties.length > 0 ? (
                        <ul className="tags" aria-label="Специализация">
                            {doctor.specialties.map((s) => (
                                <li key={s.slug}>
                                    <span className="chip chip--soft">{s.name}</span>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                    {doctor.schedule_days && doctor.schedule_days.length > 0 ? (
                        <p className="meta-item">
                            <Icon name="calendar" size={18} />
                            Принимает: {doctor.schedule_days.join(', ')}
                        </p>
                    ) : null}
                </div>

                <aside className="booking card card--shadow" aria-label="Запись к врачу">
                    <div className="booking__price">
                        <span className="text-sm text-muted">Первичный приём</span>
                        <b>{priceFrom(doctor.consult_price, 'по запросу')}</b>
                        <span className="text-xs text-muted">Окончательную стоимость называет клиника.</span>
                    </div>
                    {clinic ? (
                        <>
                            <Button size="lg" block onClick={open}>
                                Записаться к врачу
                            </Button>
                            <div className="booking__row">
                                <CompareButton type="doctor" id={doctor.id} name={doctor.name} />
                                <FavoriteButton type="doctor" id={doctor.id} name={doctor.name} floating={false} />
                            </div>
                        </>
                    ) : null}
                </aside>
            </div>

            <div className="container clinic-body">
                {doctor.bio ? (
                    <section className="block" aria-labelledby="bio-h">
                        <h2 id="bio-h">О враче</h2>
                        <p className="lead-text">{doctor.bio}</p>
                    </section>
                ) : null}

                {(doctor.education?.length ?? 0) > 0 || doctor.achievements.length > 0 ? (
                    <section className="block two-col two-col--even" aria-label="Образование и достижения">
                        {doctor.education && doctor.education.length > 0 ? (
                            <div className="card">
                                <h2 className="card-title">Образование</h2>
                                <ul className="check-list">
                                    {doctor.education.map((e) => (
                                        <li key={e}>
                                            <Icon name="file" size={18} />
                                            {e}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                        {doctor.achievements.length > 0 ? (
                            <div className="card">
                                <h2 className="card-title">Достижения</h2>
                                <ul className="check-list">
                                    {doctor.achievements.map((e) => (
                                        <li key={e}>
                                            <Icon name="award" size={18} />
                                            {e}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ) : null}
                    </section>
                ) : null}

                {clinic ? (
                    <section className="block" aria-labelledby="clinic-h">
                        <h2 id="clinic-h">Где принимает</h2>
                        <ClinicCard clinic={clinic} />
                    </section>
                ) : null}

                {prices.length > 0 ? (
                    <section className="block" aria-labelledby="dp-h">
                        <h2 id="dp-h">Услуги врача и цены клиники</h2>
                        <ul className="price-list">
                            {prices.map((p) => (
                                <li key={p.slug} className="price-row price-row--static">
                                    <span className="price-row__name">
                                        <b>{p.name}</b>
                                    </span>
                                    <span className="price-row__meta" />
                                    <b className="price-row__price">{p.price_to && p.price_to > p.price_from ? `${money(p.price_from)} – ${money(p.price_to)}` : priceFrom(p.price_from)}</b>
                                </li>
                            ))}
                        </ul>
                        <Alert tone="muted" icon="info">
                            Цены «от». Итоговую стоимость определяет врач после осмотра.
                        </Alert>
                    </section>
                ) : null}

                <section id="reviews" className="block" aria-labelledby="reviews-h">
                    <h2 id="reviews-h">Отзывы о враче</h2>
                    <RatingSummary rating={doctor.rating} count={total || doctor.reviews_count} distribution={distribution} />
                    {reviews.data.length === 0 ? (
                        <EmptyState icon="thumb" title="Отзывов пока нет" text="Оставить отзыв можно на странице клиники, указав этого врача." />
                    ) : (
                        <>
                            <div className="stack-lg">
                                {reviews.data.map((r) => (
                                    <ReviewCard key={r.id} review={r} showClinic />
                                ))}
                            </div>
                            <Pagination page={reviews} only={['reviews']} param="reviews_page" scrollTo="#reviews" />
                        </>
                    )}
                </section>

                {colleagues.length > 0 ? (
                    <section className="block" aria-labelledby="col-h">
                        <h2 id="col-h">Другие врачи клиники</h2>
                        <div className="grid grid--doctors">
                            {colleagues.map((d) => (
                                <DoctorCard key={d.id} doctor={d} />
                            ))}
                        </div>
                    </section>
                ) : null}
            </div>
        </>
    );
}
