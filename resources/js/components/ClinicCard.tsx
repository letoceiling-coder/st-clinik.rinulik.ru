import { Link } from '@inertiajs/react';
import { useEffect, useId, useState, type MouseEvent } from 'react';
import { cx, doctorsWord, phoneHref, plural, priceFrom, reviewsWord } from '@/lib/format';
import type { ClinicCardData } from '@/lib/types';
import { CompareButton, FavoriteButton } from './CollectionButtons';
import Icon from './Icon';
import { useLead } from './LeadContext';
import { DemoImg, DoctorArt, PhotoArt } from './PhotoArt';
import { Button, LinkButton } from './ui/Button';
import { Badge } from './ui/Misc';

function ClinicCardPrices({
    clinic,
    layout,
    href,
    expanded,
    onExpandedChange,
}: {
    clinic: ClinicCardData;
    layout: 'row' | 'tile';
    href: string;
    expanded: boolean;
    onExpandedChange: (open: boolean) => void;
}) {
    const listId = useId();
    const previewCount = layout === 'tile' ? 2 : 3;
    const services = clinic.top_services;
    const total = clinic.services_count ?? services.length;
    const hidden = Math.max(total - previewCount, services.length - previewCount);
    const canExpand = services.length > previewCount || total > previewCount;

    useEffect(() => {
        if (!expanded) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onExpandedChange(false);
            }
        };

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, [expanded, onExpandedChange]);

    if (services.length === 0 && !clinic.min_price) {
        return null;
    }

    const toggle = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        onExpandedChange(!expanded);
    };

    return (
        <div className={cx('clinic-card__prices-wrap', expanded && 'is-open')}>
            <div className={cx('clinic-card__prices', expanded && 'is-expanded', canExpand && !expanded && 'has-more')}>
                <div className="clinic-card__prices-head">
                    <span className="clinic-card__prices-label">
                        <Icon name="ruble" size={16} />
                        Приём и диагностика
                    </span>
                    {clinic.min_price ? <strong className="clinic-card__prices-from">{priceFrom(clinic.min_price)}</strong> : null}
                </div>

                {services.length > 0 ? (
                    <>
                        <div id={listId} className="clinic-card__prices-body">
                            <ul className="clinic-card__prices-list" aria-label="Услуги и цены">
                                {services.map((service, index) => (
                                    <li
                                        key={service.slug}
                                        aria-hidden={!expanded && index >= previewCount ? true : undefined}
                                    >
                                        <span className="clinic-card__prices-name">{service.name}</span>
                                        <b>{priceFrom(service.price_from)}</b>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {canExpand ? (
                            <div className="clinic-card__prices-more">
                                <button
                                    type="button"
                                    className="clinic-card__prices-toggle"
                                    aria-expanded={expanded}
                                    aria-controls={listId}
                                    onClick={toggle}
                                >
                                    <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} />
                                    {expanded
                                        ? 'Свернуть'
                                        : hidden > 0
                                          ? `Ещё ${hidden} ${plural(hidden, ['услуга', 'услуги', 'услуг'])}`
                                          : 'Показать все'}
                                </button>
                                {expanded ? (
                                    <Link href={`${href}#prices`} className="clinic-card__prices-all link-arrow" onClick={(e) => e.stopPropagation()}>
                                        {total > services.length ? `${services.length} из ${total}` : 'Все цены'}
                                        <Icon name="arrow-right" size={16} />
                                    </Link>
                                ) : null}
                            </div>
                        ) : null}
                    </>
                ) : null}
            </div>
        </div>
    );
}

function DoctorAvatarStack({
    doctors,
    total,
}: {
    doctors: ClinicCardData['doctors_preview'];
    total: number;
}) {
    const visible = doctors.slice(0, 3);
    const extra = Math.max(total - visible.length, 0);

    return (
        <div className="avatar-stack" aria-label={doctorsWord(total)}>
            {visible.map((doctor) => (
                <span key={doctor.slug} className="avatar-stack__item">
                    <DoctorArt seed={doctor.art_seed} photoUrl={doctor.photo_url} name={doctor.name} />
                </span>
            ))}
            {extra > 0 ? (
                <span className="avatar-stack__more" aria-hidden="true">
                    <span className="avatar-stack__more-ring">
                        <span className="avatar-stack__more-inner">
                            <span className="avatar-stack__more-count">+{extra}</span>
                        </span>
                    </span>
                </span>
            ) : null}
        </div>
    );
}

export function ClinicFeatures({ clinic, limit = 5 }: { clinic: ClinicCardData; limit?: number }) {
    const items: { icon: Parameters<typeof Icon>[0]['name']; label: string }[] = [];
    if (clinic.same_day) items.push({ icon: 'flash', label: 'Запись на сегодня' });
    if (clinic.has_installment) items.push({ icon: 'percent', label: clinic.installment_months ? `Рассрочка до ${clinic.installment_months} мес.` : 'Рассрочка' });
    if (clinic.accepts_dms) items.push({ icon: 'shield', label: 'ДМС' });
    if (clinic.has_sedation) items.push({ icon: 'moon', label: 'Седация' });
    if (clinic.has_anesthesia) items.push({ icon: 'moon', label: 'Наркоз' });
    if (clinic.has_microscope) items.push({ icon: 'microscope', label: 'Микроскоп' });
    if (clinic.has_ct) items.push({ icon: 'scale', label: 'КТ' });
    return (
        <ul className="feature-list" aria-label="Особенности клиники">
            {items.slice(0, limit).map((i) => (
                <li key={i.label}>
                    <Icon name={i.icon} size={15} />
                    {i.label}
                </li>
            ))}
        </ul>
    );
}

export default function ClinicCard({
    clinic,
    layout = 'row',
    priority,
    interactive = true,
}: {
    clinic: ClinicCardData;
    layout?: 'row' | 'tile';
    priority?: boolean;
    interactive?: boolean;
}) {
    const lead = useLead();
    const isTile = layout === 'tile';
    const href = `/clinics/${clinic.slug}`;
    const photo = clinic.photos[0];
    const [pricesOpen, setPricesOpen] = useState(false);
    const open = () =>
        lead.open({ slug: clinic.slug, name: clinic.name, phone: clinic.phone, source: 'catalog' });

    return (
        <article
            className={cx(
                'clinic-card',
                isTile && 'clinic-card--tile',
                interactive && 'clinic-card--interactive',
                pricesOpen && 'clinic-card--prices-open',
            )}
            aria-labelledby={`clinic-${clinic.id}`}
        >
            {interactive ? <Link href={href} className="clinic-card__hit" aria-label={`Открыть «${clinic.name}»`} tabIndex={-1} /> : null}
            <Link href={href} className="clinic-card__media" tabIndex={-1} aria-hidden="true">
                {photo?.url ? (
                    <DemoImg src={photo.url} aspect="4/3" loading={priority ? 'eager' : 'lazy'} className="clinic-card__photo" />
                ) : (
                    <PhotoArt seed={photo?.art_seed ?? clinic.art_seed} kind={photo?.kind ?? 'interior'} priority={priority} className="clinic-card__photo" />
                )}
                <div className="clinic-card__badges">
                    {clinic.is_24_7 ? <Badge tone="dark">24/7</Badge> : null}
                    {clinic.accepts_children ? <Badge tone="primary">{clinic.children_age_from ? `Дети с ${clinic.children_age_from}` : 'Дети'}</Badge> : null}
                </div>
            </Link>
            <FavoriteButton type="clinic" id={clinic.id} name={clinic.name} />

            <div className="clinic-card__body">
                <div className="clinic-card__summary">
                    <div className="clinic-card__head">
                        <h3 id={`clinic-${clinic.id}`} className="clinic-card__title">
                            <Link href={href}>{clinic.name}</Link>
                        </h3>
                        <div className="clinic-card__rating">
                            {clinic.reviews_count > 0 ? (
                                <>
                                    <span className="rating">
                                        <Icon name="star" size={18} />
                                        {clinic.rating.toFixed(1).replace('.', ',')}
                                    </span>
                                    <Link href={`${href}#reviews`} className="rating__count">
                                        {reviewsWord(clinic.reviews_count)}
                                    </Link>
                                </>
                            ) : (
                                <span className="rating__count">Пока нет отзывов</span>
                            )}
                        </div>
                    </div>

                    <div className="clinic-card__flags">
                        {clinic.is_promoted ? (
                            <Badge tone="warning" icon="sparkle">
                                Рекомендуем
                            </Badge>
                        ) : null}
                        {clinic.is_verified ? (
                            <Badge tone="success" icon="shield">
                                Проверена
                            </Badge>
                        ) : null}
                        {clinic.license.confirmed ? <Badge tone="info">Лицензия подтверждена</Badge> : null}
                        {clinic.achievements.slice(0, 1).map((a) => (
                            <Badge key={a} icon="award">
                                {a}
                            </Badge>
                        ))}
                    </div>

                    <p className="clinic-card__address">
                        <Icon name="pin" size={16} />
                        <span>
                            {clinic.address}
                            {clinic.district ? <span className="text-muted"> · {clinic.district}</span> : null}
                            {clinic.metro ? <span className="text-muted"> · м. {clinic.metro}</span> : null}
                        </span>
                    </p>
                    <p className="clinic-card__schedule">
                        <Icon name="clock" size={16} />
                        <span>{clinic.today}</span>
                    </p>
                </div>

                <ClinicCardPrices
                    clinic={clinic}
                    layout={layout}
                    href={href}
                    expanded={pricesOpen}
                    onExpandedChange={setPricesOpen}
                />

                <div className="clinic-card__extras">
                    <ClinicFeatures clinic={clinic} limit={isTile ? 3 : 5} />

                    {!isTile && clinic.doctors_preview.length > 0 ? (
                        <div className="clinic-card__doctors">
                            <DoctorAvatarStack doctors={clinic.doctors_preview} total={clinic.doctors_count} />
                        </div>
                    ) : null}

                    {!isTile && clinic.payment_methods.length > 0 ? (
                        <p className="clinic-card__pay text-xs text-muted">Оплата: {clinic.payment_methods.join(', ')}</p>
                    ) : null}
                </div>

                <div className="clinic-card__actions">
                    <div className="clinic-card__buttons">
                        {!isTile ? (
                            <LinkButton href={href} variant="outline" size="sm" className="clinic-card__details">
                                Подробнее
                            </LinkButton>
                        ) : null}
                        <CompareButton type="clinic" id={clinic.id} name={clinic.name} compact={isTile} />
                        {clinic.phone ? (
                            <a className="btn btn--outline btn--icon btn--round" href={phoneHref(clinic.phone)} aria-label={`Позвонить в «${clinic.name}»`}>
                                <Icon name="phone" size={20} />
                            </a>
                        ) : null}
                        <Button size={isTile ? 'sm' : 'md'} onClick={open}>
                            Записаться
                        </Button>
                    </div>
                </div>
            </div>
        </article>
    );
}

export function ClinicCardSkeleton() {
    return (
        <div className="clinic-card" aria-hidden="true">
            <div className="clinic-card__media skeleton" style={{ borderRadius: 16 }} />
            <div className="clinic-card__body">
                <span className="skeleton" style={{ height: 24, width: '60%' }} />
                <span className="skeleton" style={{ height: 16, width: '85%' }} />
                <span className="skeleton" style={{ height: 16, width: '40%' }} />
                <span className="skeleton" style={{ height: 70 }} />
                <span className="skeleton" style={{ height: 52, width: 180 }} />
            </div>
        </div>
    );
}
