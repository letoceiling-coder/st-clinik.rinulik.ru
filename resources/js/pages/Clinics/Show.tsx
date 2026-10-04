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
import YandexMap from '@/components/YandexMap';
import { AnchorButton, Button } from '@/components/ui/Button';
import { Alert, Badge, Breadcrumbs, EmptyState, Pagination } from '@/components/ui/Misc';
import { cx, doctorsWord, phoneHref, plural, priceFrom, reviewsWord } from '@/lib/format';
import type { ClinicCardData, ClinicDetailData, ClinicPostData, ConcernData, Crumb, Paginated, ReviewData } from '@/lib/types';

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

const BASE_SECTIONS = [
    ['about', 'О клинике'],
    ['doctors', 'Врачи'],
    ['prices', 'Цены'],
    ['news', 'Новости и акции'],
    ['reviews', 'Отзывы'],
    ['contacts', 'Контакты'],
] as const;

function formatPostPeriod(post: ClinicPostData): string | null {
    if (post.starts_at && post.ends_at) {
        const from = new Date(post.starts_at).toLocaleDateString('ru-RU');
        const to = new Date(post.ends_at).toLocaleDateString('ru-RU');
        return `Действует с ${from} по ${to}`;
    }
    if (post.ends_at) {
        return `До ${new Date(post.ends_at).toLocaleDateString('ru-RU')}`;
    }
    return null;
}

function PostCard({ post }: { post: ClinicPostData }) {
    const period = formatPostPeriod(post);

    return (
        <article className={cx('post-card', post.type === 'promo' && 'post-card--promo', post.is_pinned && 'post-card--pinned')}>
            {post.image_url ? (
                <div className="post-card__media">
                    <img src={post.image_url} alt="" loading="lazy" />
                </div>
            ) : null}
            <div className="post-card__body">
                <div className="post-card__meta">
                    <Badge tone={post.type === 'promo' ? 'warning' : 'primary'}>{post.type_label}</Badge>
                    {post.is_pinned ? <Badge tone="success">Важное</Badge> : null}
                    {post.published_at ? <time dateTime={post.published_at}>{post.published_at}</time> : null}
                </div>
                <h3>{post.title}</h3>
                {post.excerpt ? <p className="post-card__excerpt">{post.excerpt}</p> : null}
                <div className="post-card__text">{post.body}</div>
                {period ? <p className="post-card__period">{period}</p> : null}
            </div>
        </article>
    );
}

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
        const ids = sections.map(([id]) => id);
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
    }, [url, sections]);

    const filterReviews = (rating: number) =>
        router.get(`/clinics/${clinic.slug}`, rating ? { rating } : {}, {
            preserveScroll: false,
            preserveState: true,
            replace: true,
            only: ['reviews', 'review_filters'],
            onSuccess: () => document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        });

    const activeRating = review_filters.rating ?? 0;
    const ratingCount = Object.values(distribution).reduce((a, b) => a + b, 0);
    const hasPrices = clinic.prices.length > 0;
    const hasPosts = clinic.posts.length > 0;
    const sections = hasPosts ? BASE_SECTIONS : BASE_SECTIONS.filter(([id]) => id !== 'news');
    const currentGroup = clinic.prices[group] ?? clinic.prices[0];

    return (
        <div className="clinic-page">
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
                        <span className="booking__price-label">Приём и диагностика</span>
                        <strong className="booking__price-value">{priceFrom(clinic.min_price)}</strong>
                        <span className="booking__price-note">Окончательную стоимость называет врач после осмотра.</span>
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
                        {sections.map(([id, label]) => {
                            const count =
                                id === 'doctors' ? clinic.doctors.length : id === 'reviews' ? clinic.reviews_count : id === 'news' ? clinic.posts.length : 0;

                            return (
                                <li key={id}>
                                    <a href={`#${id}`} className={cx(section === id && 'is-active')} aria-current={section === id ? 'true' : undefined}>
                                        {label}
                                        {count > 0 ? <span className="subnav__count">{count}</span> : null}
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </nav>

            <div className="container clinic-body">
                <section id="about" className="block" aria-labelledby="about-h">
                    <h2 id="about-h">О клинике</h2>
                    {clinic.description ? <p className="lead-text">{clinic.description}</p> : null}
                    <div className="facts">
                        {clinic.founded_year ? (
                            <div className="fact-card">
                                <b>{clinic.founded_year}</b>
                                <span>год основания</span>
                            </div>
                        ) : null}
                        <div className="fact-card">
                            <b>{clinic.doctors_count}</b>
                            <span>{plural(clinic.doctors_count, ['врач', 'врача', 'врачей'])} в клинике</span>
                        </div>
                        <div className="fact-card">
                            <b>{clinic.specialties.length}</b>
                            <span>{plural(clinic.specialties.length, ['направление', 'направления', 'направлений'])}</span>
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
                            <div className="chip-row" role="tablist" aria-label="Группы услуг">
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

                {hasPosts ? (
                    <section id="news" className="block" aria-labelledby="news-h">
                        <h2 id="news-h">Новости и акции</h2>
                        <p className="text-muted">Актуальные предложения и новости клиники от администрации.</p>
                        <div className="post-grid">
                            {clinic.posts.map((post) => (
                                <PostCard key={post.id} post={post} />
                            ))}
                        </div>
                    </section>
                ) : null}

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
                            <Pagination page={reviews} only={['reviews', 'review_filters']} param="reviews_page" scrollTo="#reviews" />
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
                                <div className="clinic-map">
                                    <YandexMap
                                        points={[{ slug: clinic.slug, name: clinic.name, address: clinic.address, lat: clinic.lat, lng: clinic.lng }]}
                                        height={280}
                                        zoom={15}
                                        activeSlug={clinic.slug}
                                    />
                                    <a
                                        className="map-link"
                                        href={`https://yandex.ru/maps/?pt=${clinic.lng},${clinic.lat}&z=16&l=map`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        <Icon name="pin" size={18} /> Открыть в Яндекс Картах
                                    </a>
                                </div>
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
                <div className="sticky-cta__info">
                    <b>{priceFrom(clinic.min_price)}</b>
                    <span className="sticky-cta__note">приём и диагностика</span>
                </div>
                <div className="sticky-cta__actions">
                    {clinic.phone ? (
                        <a className="btn btn--outline btn--icon btn--round" href={phoneHref(clinic.phone)} aria-label="Позвонить">
                            <Icon name="phone" size={20} />
                        </a>
                    ) : null}
                    <Button size="sm" onClick={() => open()}>
                        Записаться
                    </Button>
                </div>
            </div>
        </div>
    );
}
