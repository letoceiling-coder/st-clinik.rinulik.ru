import { Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import YandexMap from '@/components/YandexMap';
import AdSlot, { type AdBanner } from '@/components/AdSlot';
import ClinicCard from '@/components/ClinicCard';
import DoctorCard from '@/components/DoctorCard';
import HeroServiceFinder, { type HeroChip } from '@/components/HeroServiceFinder';
import Icon from '@/components/Icon';
import ReviewCard from '@/components/ReviewCard';
import ServicePickerModal, { type PickerService } from '@/components/ServicePickerModal';
import { ConcernChips, SpecialtyCircles } from '@/components/Tiles';
import { Button, LinkButton } from '@/components/ui/Button';
import { SectionHead } from '@/components/ui/Misc';
import { useCity } from '@/lib/city';
import { clinicsWord, doctorsWord, priceFrom, reviewsWord } from '@/lib/format';
import type { ClinicCardData, ConcernData, DoctorData, MapClinicPoint, ReviewData, SpecialtyData } from '@/lib/types';

interface Props {
    home_map_active: boolean;
    home_map_clinics: MapClinicPoint[];
    stats: { clinics: number; clinics_total: number; doctors: number; reviews: number; same_day: number };
    concerns: ConcernData[];
    popular_services: { name: string; slug: string; specialty: string | null; price_from: number | null; clinics: number }[];
    catalog_services: PickerService[];
    hero_chips: HeroChip[];
    specialties: SpecialtyData[];
    top_clinics: ClinicCardData[];
    top_clinics_has_more: boolean;
    top_doctors: DoctorData[];
    latest_reviews: ReviewData[];
    banner_home: AdBanner[];
}

const TRUST = [
    { icon: 'shield', title: 'Проверяем лицензии', text: 'Модераторы сверяют документы клиник и отмечают подтверждённые профили.' },
    { icon: 'thumb', title: 'Отзывы после модерации', text: 'Публикуем только личный опыт пациентов: без рекламы, диагнозов и персональных данных.' },
    { icon: 'ruble', title: 'Честные цены «от»', text: 'Показываем минимальные цены клиник. Итоговую стоимость называет врач после осмотра.' },
] as const;

const HOME_CLINICS_BATCH = 6;

export default function Home({
    home_map_active,
    home_map_clinics,
    stats,
    concerns,
    popular_services,
    catalog_services,
    hero_chips,
    specialties,
    top_clinics,
    top_clinics_has_more,
    top_doctors,
    latest_reviews,
    banner_home,
}: Props) {
    const city = useCity();
    const [servicePickerOpen, setServicePickerOpen] = useState(false);
    const [pickerSeed, setPickerSeed] = useState<string[]>([]);
    const [clinics, setClinics] = useState(top_clinics);
    const [clinicsHasMore, setClinicsHasMore] = useState(top_clinics_has_more);
    const [clinicsLoading, setClinicsLoading] = useState(false);
    const showHomeMap = home_map_active;

    const openServicePicker = (slug?: string) => {
        setPickerSeed(slug ? [slug] : []);
        setServicePickerOpen(true);
    };

    const popularWithOffers = useMemo(() => popular_services.filter((s) => s.clinics > 0), [popular_services]);
    const showClinics = clinics.length > 0;

    const loadMoreClinics = async () => {
        if (clinicsLoading || !clinicsHasMore) {
            return;
        }

        setClinicsLoading(true);
        try {
            const params = new URLSearchParams({
                city: city.slug,
                offset: String(clinics.length),
                limit: String(HOME_CLINICS_BATCH),
            });
            const response = await fetch(`/api/v1/home/clinics?${params}`, { headers: { Accept: 'application/json' } });
            if (!response.ok) {
                throw new Error('load failed');
            }
            const json = (await response.json()) as { data: ClinicCardData[]; meta?: { has_more?: boolean } };
            const next = json.data ?? [];
            setClinics((prev) => {
                const seen = new Set(prev.map((c) => c.id));
                return [...prev, ...next.filter((c) => !seen.has(c.id))];
            });
            setClinicsHasMore(Boolean(json.meta?.has_more));
        } catch {
            setClinicsHasMore(false);
        } finally {
            setClinicsLoading(false);
        }
    };
    const showDoctors = top_doctors.length > 0;
    const showReviews = latest_reviews.length > 0;
    const showPopularServices = popularWithOffers.length > 0;

    return (
        <>
            <section className="hero">
                <div className="container hero__grid">
                    <div className="hero__copy">
                        <p className="eyebrow">Стоматологии по всей России</p>
                        <h1 className="visually-hidden">
                            Стоматологии {city.nameIn}
                        </h1>
                        <HeroServiceFinder services={catalog_services} chips={hero_chips} stats={{ clinics: stats.clinics, same_day: stats.same_day }} />
                        <dl className="hero__stats hero__stats--inline" aria-label="Сервис в цифрах">
                            {stats.clinics > 0 ? (
                                <div>
                                    <dt>Клиник</dt>
                                    <dd>{stats.clinics}</dd>
                                </div>
                            ) : null}
                            {stats.doctors > 0 ? (
                                <div>
                                    <dt>Врачей</dt>
                                    <dd>{stats.doctors}</dd>
                                </div>
                            ) : null}
                            {stats.reviews > 0 ? (
                                <div>
                                    <dt>Отзывов</dt>
                                    <dd>{stats.reviews}</dd>
                                </div>
                            ) : null}
                        </dl>
                    </div>
                </div>
            </section>

            {showHomeMap ? (
                <section className="section section--tight home-map" aria-labelledby="home-map-h">
                    <div className="container">
                        <SectionHead
                            title={<span id="home-map-h">Клиники {city.nameIn} на карте</span>}
                            text={`${clinicsWord(home_map_clinics.length)} — нажмите на метку, чтобы открыть карточку клиники.`}
                            action={
                                <Link href={city.path('clinics')} className="link-arrow hide-mobile">
                                    Списком <Icon name="arrow-right" size={18} />
                                </Link>
                            }
                        />
                        <div className="home-map__frame">
                            <YandexMap points={home_map_clinics} className="home-map__map" />
                        </div>
                    </div>
                </section>
            ) : null}

            {banner_home.length > 0 ? (
                <section className="section section--tight">
                    <div className="container">
                        <AdSlot banners={banner_home} slot="home" />
                    </div>
                </section>
            ) : null}

            {concerns.length > 0 ? (
                <section className="section section--tight" aria-labelledby="concerns-h">
                    <div className="container">
                        <SectionHead
                            title={<span id="concerns-h">С чем чаще обращаются</span>}
                            text="Выберите, что беспокоит, — подскажем направление и подходящие клиники."
                        />
                        <ConcernChips concerns={concerns} />
                    </div>
                </section>
            ) : null}

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
                </div>
            </section>

            {showClinics ? (
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
                            {clinics.map((c, i) => (
                                <ClinicCard key={c.id} clinic={c} layout="tile" priority={i < 3} />
                            ))}
                        </div>
                        {clinicsHasMore ? (
                            <div className="home-clinics-more">
                                <Button type="button" variant="outline" size="lg" loading={clinicsLoading} onClick={loadMoreClinics}>
                                    Показать ещё
                                </Button>
                            </div>
                        ) : null}
                        <div className="show-mobile" style={{ marginTop: 20 }}>
                            <LinkButton href={city.path('clinics')} variant="dark" block>
                                Все клиники
                            </LinkButton>
                        </div>
                    </div>
                </section>
            ) : null}

            {showPopularServices ? (
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
                            {popularWithOffers.map((s) => (
                                <button type="button" key={s.slug} className="service-card card card--link" onClick={() => openServicePicker(s.slug)}>
                                    <span className="text-xs text-muted">{s.specialty}</span>
                                    <b>{s.name}</b>
                                    <span className="service-card__price">{priceFrom(s.price_from)}</span>
                                    <span className="text-xs text-muted">{`в ${clinicsWord(s.clinics)}`}</span>
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
            ) : null}

            {showDoctors ? (
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
            ) : null}

            {showReviews ? (
                <section className="section" aria-labelledby="reviews-h">
                    <div className="container">
                        <SectionHead
                            title={<span id="reviews-h">Свежие отзывы пациентов</span>}
                            text={`${reviewsWord(latest_reviews.length)} о клиниках ${city.nameIn}.`}
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
            ) : null}

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
