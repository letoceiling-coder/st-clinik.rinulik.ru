import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AdSlot, { type AdBanner } from '@/components/AdSlot';
import ClinicCard from '@/components/ClinicCard';
import DoctorCard from '@/components/DoctorCard';
import HeroServiceFinder, { type HeroChip } from '@/components/HeroServiceFinder';
import Icon from '@/components/Icon';
import ReviewCard from '@/components/ReviewCard';
import ServicePickerModal, { type PickerService } from '@/components/ServicePickerModal';
import { ConcernChips, SpecialtyCircles, SpecialtyTile } from '@/components/Tiles';
import { LinkButton } from '@/components/ui/Button';
import { SectionHead } from '@/components/ui/Misc';
import { useCity } from '@/lib/city';
import { HERO_PHOTOS } from '@/lib/demo-images';
import { clinicsWord, doctorsWord, priceFrom, reviewsWord } from '@/lib/format';
import type { ClinicCardData, ConcernData, DoctorData, ReviewData, SpecialtyData } from '@/lib/types';

interface Props {
    stats: { clinics: number; clinics_total: number; doctors: number; reviews: number; same_day: number };
    concerns: ConcernData[];
    popular_services: { name: string; slug: string; specialty: string | null; price_from: number | null; clinics: number }[];
    catalog_services: PickerService[];
    hero_chips: HeroChip[];
    specialties: SpecialtyData[];
    top_clinics: ClinicCardData[];
    top_doctors: DoctorData[];
    latest_reviews: ReviewData[];
    banner_home: AdBanner[];
}

const TRUST = [
    { icon: 'shield', title: 'Проверяем лицензии', text: 'Модераторы сверяют документы клиник и отмечают подтверждённые профили.' },
    { icon: 'thumb', title: 'Отзывы после модерации', text: 'Публикуем только личный опыт пациентов: без рекламы, диагнозов и персональных данных.' },
    { icon: 'ruble', title: 'Честные цены «от»', text: 'Показываем минимальные цены клиник. Итоговую стоимость называет врач после осмотра.' },
] as const;

export default function Home({ stats, concerns, popular_services, catalog_services, hero_chips, specialties, top_clinics, top_doctors, latest_reviews, banner_home }: Props) {
    const city = useCity();
    const [servicePickerOpen, setServicePickerOpen] = useState(false);
    const [pickerSeed, setPickerSeed] = useState<string[]>([]);

    const openServicePicker = (slug?: string) => {
        setPickerSeed(slug ? [slug] : []);
        setServicePickerOpen(true);
    };

    return (
        <>
            <section className="hero">
                <div className="container hero__grid">
                    <div className="hero__copy">
                        <p className="eyebrow">Стоматологии по всей России</p>
                        <h1>
                            Найдите стоматолога
                            <br />
                            {city.nameIn}
                        </h1>
                        <p className="hero__lead">Сравнивайте клиники и врачей по цене, рейтингу и отзывам. Записывайтесь онлайн или по телефону.</p>
                        <HeroServiceFinder services={catalog_services} chips={hero_chips} stats={{ clinics: stats.clinics, same_day: stats.same_day }} />
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

            <section className="section section--tight">
                <div className="container">
                    <AdSlot banners={banner_home} slot="home" demoWhenEmpty />
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
                        text={`${clinicsWord(stats.clinics)} ${city.nameIn}. Показываем лучшие по оценкам пациентов.`}
                        action={
                            <LinkButton href={city.path('clinics')} variant="dark" size="sm" className="hide-mobile btn--compact">
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
                        text="Выберите одну или несколько услуг — покажем клиники с этими позициями в прайсе."
                        action={
                            <button type="button" className="link-arrow hide-mobile" onClick={() => openServicePicker()}>
                                Все услуги <Icon name="arrow-right" size={18} />
                            </button>
                        }
                    />
                    <div className="grid grid--services">
                        {popular_services.map((s) => (
                            <button type="button" key={s.slug} className="service-card card card--link" onClick={() => openServicePicker(s.slug)}>
                                <span className="text-xs text-muted">{s.specialty}</span>
                                <b>{s.name}</b>
                                <span className="service-card__price">{priceFrom(s.price_from)}</span>
                                <span className="text-xs text-muted">{s.clinics > 0 ? `в ${clinicsWord(s.clinics)}` : 'нет предложений'}</span>
                            </button>
                        ))}
                    </div>
                    <div className="show-mobile" style={{ marginTop: 16 }}>
                        <LinkButton href={city.path('prices')} variant="outline" block>
                            Весь прайс
                        </LinkButton>
                    </div>
                </div>
            </section>

            <section className="section section--muted" aria-labelledby="docs-h">
                <div className="container">
                    <SectionHead
                        title={<span id="docs-h">Врачи с лучшими отзывами</span>}
                        text={`${doctorsWord(stats.doctors)} принимают ${city.nameIn}.`}
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

            <ServicePickerModal
                open={servicePickerOpen}
                onClose={() => setServicePickerOpen(false)}
                services={catalog_services}
                initialSelected={pickerSeed}
                onApply={(slugs) => {
                    const query: Record<string, string> = {};
                    if (slugs.length === 1) query.service = slugs[0];
                    else if (slugs.length > 1) query.services = slugs.join(',');
                    router.get(city.path('clinics', query));
                }}
            />
        </>
    );
}
