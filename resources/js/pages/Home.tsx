import { Link } from '@inertiajs/react';
import ClinicCard from '@/components/ClinicCard';
import DoctorCard from '@/components/DoctorCard';
import Icon from '@/components/Icon';
import ReviewCard from '@/components/ReviewCard';
import SearchBox from '@/components/SearchBox';
import { ConcernChips, SpecialtyCircles, SpecialtyTile } from '@/components/Tiles';
import { LinkButton } from '@/components/ui/Button';
import { SectionHead } from '@/components/ui/Misc';
import { useCity } from '@/lib/city';
import { HERO_PHOTOS } from '@/lib/demo-images';
import { clinicsWord, doctorsWord, priceFrom, reviewsWord } from '@/lib/format';
import type { ClinicCardData, ConcernData, DoctorData, ReviewData, SpecialtyData } from '@/lib/types';

interface Props {
    stats: { clinics: number; clinics_total: number; doctors: number; reviews: number };
    concerns: ConcernData[];
    popular_services: { name: string; slug: string; specialty: string | null; price_from: number | null; clinics: number }[];
    specialties: SpecialtyData[];
    top_clinics: ClinicCardData[];
    top_doctors: DoctorData[];
    latest_reviews: ReviewData[];
}

const TRUST = [
    { icon: 'shield', title: 'Проверяем лицензии', text: 'Модераторы сверяют документы клиник и отмечают подтверждённые профили.' },
    { icon: 'thumb', title: 'Отзывы после модерации', text: 'Публикуем только личный опыт пациентов: без рекламы, диагнозов и персональных данных.' },
    { icon: 'ruble', title: 'Честные цены «от»', text: 'Показываем минимальные цены клиник. Итоговую стоимость называет врач после осмотра.' },
] as const;

export default function Home({ stats, concerns, popular_services, specialties, top_clinics, top_doctors, latest_reviews }: Props) {
    const city = useCity();

    return (
        <>
            <section className="hero">
                <div className="container hero__grid">
                    <div className="hero__copy">
                        <p className="eyebrow">Стоматологии по всей России</p>
                        <h1>
                            Найдите стоматолога
                            <br />в {city.nameIn}
                        </h1>
                        <p className="hero__lead">Сравнивайте клиники и врачей по цене, рейтингу и отзывам. Записывайтесь онлайн или по телефону.</p>
                        <SearchBox variant="hero" />
                        <div className="hero__quick">
                            <span className="text-muted text-sm">Часто ищут:</span>
                            <Link href={city.path('clinics', { same_day: 1 })} className="chip chip--soft">
                                Запись на сегодня
                            </Link>
                            <Link href={city.path('clinics', { is_24_7: 1 })} className="chip chip--soft">
                                Круглосуточно
                            </Link>
                            <Link href={city.path('clinics', { children: 1 })} className="chip chip--soft">
                                Детская стоматология
                            </Link>
                            <Link href={city.path('clinics', { installment: 1 })} className="chip chip--soft">
                                Рассрочка
                            </Link>
                        </div>
                        <dl className="hero__stats hero__stats--inline" aria-label="Сервис в цифрах">
                            <div>
                                <dt>Клиник</dt>
                                <dd>{stats.clinics}</dd>
                            </div>
                            <div>
                                <dt>Врачей</dt>
                                <dd>{stats.doctors}</dd>
                            </div>
                            <div>
                                <dt>Отзывов</dt>
                                <dd>{stats.reviews}</dd>
                            </div>
                        </dl>
                    </div>
                    <div className="hero__visual" aria-hidden="true">
                        <div className="hero__photo hero__photo--main">
                            <img src={HERO_PHOTOS[0]} alt="" width={640} height={400} loading="eager" decoding="async" />
                        </div>
                        <div className="hero__photo hero__photo--sub hero__photo--a">
                            <img src={HERO_PHOTOS[1]} alt="" width={320} height={200} loading="lazy" decoding="async" />
                        </div>
                        <div className="hero__photo hero__photo--sub hero__photo--b">
                            <img src={HERO_PHOTOS[2]} alt="" width={320} height={200} loading="lazy" decoding="async" />
                        </div>
                    </div>
                </div>
            </section>

            <section className="section section--tight" aria-labelledby="concerns-h">
                <div className="container">
                    <SectionHead
                        title={<span id="concerns-h">С чем чаще обращаются</span>}
                        text="Выберите, что беспокоит, — подскажем направление и подходящие клиники."
                    />
                    <ConcernChips concerns={concerns} />
                </div>
            </section>

            <section className="section" aria-labelledby="dir-h">
                <div className="container">
                    <SectionHead
                        title={<span id="dir-h">Направления стоматологии</span>}
                        action={
                            <Link href={city.path('directions')} className="link-arrow hide-mobile">
                                Все направления <Icon name="arrow-right" size={18} />
                            </Link>
                        }
                    />
                    <SpecialtyCircles specialties={specialties} />
                    <div className="grid grid--tiles hide-mobile" style={{ marginTop: 28 }}>
                        {specialties.map((s) => (
                            <SpecialtyTile key={s.slug} s={s} />
                        ))}
                    </div>
                </div>
            </section>

            <section className="section section--muted" aria-labelledby="clinics-h">
                <div className="container">
                    <SectionHead
                        title={<span id="clinics-h">Клиники с высоким рейтингом</span>}
                        text={`${clinicsWord(stats.clinics)} в ${city.nameIn}. Показываем лучшие по оценкам пациентов.`}
                        action={
                            <LinkButton href={city.path('clinics')} variant="dark" size="sm" className="hide-mobile">
                                Все клиники
                            </LinkButton>
                        }
                    />
                    <div className="grid grid--cards">
                        {top_clinics.map((c, i) => (
                            <ClinicCard key={c.id} clinic={c} layout="tile" priority={i < 3} />
                        ))}
                    </div>
                    <div className="show-mobile" style={{ marginTop: 20 }}>
                        <LinkButton href={city.path('clinics')} variant="dark" block>
                            Все клиники
                        </LinkButton>
                    </div>
                </div>
            </section>

            <section className="section" aria-labelledby="services-h">
                <div className="container">
                    <SectionHead
                        title={<span id="services-h">Популярные услуги и цены</span>}
                        text="Минимальные цены клиник города. Итоговая стоимость определяется после осмотра."
                        action={
                            <Link href={city.path('prices')} className="link-arrow hide-mobile">
                                Весь прайс <Icon name="arrow-right" size={18} />
                            </Link>
                        }
                    />
                    <div className="grid grid--services">
                        {popular_services.map((s) => (
                            <Link key={s.slug} href={city.path('clinics', { service: s.slug })} className="service-card card card--link">
                                <span className="text-xs text-muted">{s.specialty}</span>
                                <b>{s.name}</b>
                                <span className="service-card__price">{priceFrom(s.price_from)}</span>
                                <span className="text-xs text-muted">{s.clinics > 0 ? `в ${clinicsWord(s.clinics)}` : 'нет предложений'}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section section--muted" aria-labelledby="docs-h">
                <div className="container">
                    <SectionHead
                        title={<span id="docs-h">Врачи с лучшими отзывами</span>}
                        text={`${doctorsWord(stats.doctors)} принимают в ${city.nameIn}.`}
                        action={
                            <Link href={city.path('doctors')} className="link-arrow hide-mobile">
                                Все врачи <Icon name="arrow-right" size={18} />
                            </Link>
                        }
                    />
                    <div className="grid grid--doctors">
                        {top_doctors.map((d) => (
                            <DoctorCard key={d.id} doctor={d} />
                        ))}
                    </div>
                </div>
            </section>

            <section className="section" aria-labelledby="reviews-h">
                <div className="container">
                    <SectionHead
                        title={<span id="reviews-h">Свежие отзывы пациентов</span>}
                        text={`${reviewsWord(stats.reviews)} прошли модерацию.`}
                        action={
                            <Link href={city.path('reviews')} className="link-arrow hide-mobile">
                                Все отзывы <Icon name="arrow-right" size={18} />
                            </Link>
                        }
                    />
                    <div className="grid grid--reviews">
                        {latest_reviews.map((r) => (
                            <ReviewCard key={r.id} review={r} showClinic canReport={false} />
                        ))}
                    </div>
                </div>
            </section>

            <section className="section section--muted" aria-labelledby="trust-h">
                <div className="container">
                    <SectionHead title={<span id="trust-h">Как мы помогаем выбрать</span>} />
                    <div className="grid grid--trust">
                        {TRUST.map((t) => (
                            <div key={t.title} className="trust card">
                                <span className="tile__icon">
                                    <Icon name={t.icon} size={26} />
                                </span>
                                <h3>{t.title}</h3>
                                <p className="text-muted">{t.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="section">
                <div className="container">
                    <div className="cta">
                        <div>
                            <h2>У вас стоматологическая клиника?</h2>
                            <p>Подключите профиль, получайте заявки от пациентов и отвечайте на отзывы в личном кабинете.</p>
                        </div>
                        <LinkButton href="/for-clinics" size="lg" variant="dark">
                            Подключить клинику
                        </LinkButton>
                    </div>
                </div>
            </section>
        </>
    );
}
