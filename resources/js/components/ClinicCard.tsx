import { Link } from '@inertiajs/react';
import { cx, doctorsWord, phoneHref, priceFrom, reviewsWord } from '@/lib/format';
import type { ClinicCardData } from '@/lib/types';
import { CompareButton, FavoriteButton } from './CollectionButtons';
import Icon from './Icon';
import { useLead } from './LeadContext';
import { DemoImg, DoctorArt, PhotoArt } from './PhotoArt';
import { Button } from './ui/Button';
import { Badge } from './ui/Misc';

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

export default function ClinicCard({ clinic, layout = 'row', priority }: { clinic: ClinicCardData; layout?: 'row' | 'tile'; priority?: boolean }) {
    const lead = useLead();
    const href = `/clinics/${clinic.slug}`;
    const photo = clinic.photos[0];
    const open = () =>
        lead.open({ slug: clinic.slug, name: clinic.name, phone: clinic.phone, source: 'catalog' });

    return (
        <article className={cx('clinic-card', layout === 'tile' && 'clinic-card--tile')} aria-labelledby={`clinic-${clinic.id}`}>
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

                {clinic.top_services.length > 0 ? (
                    <ul className="clinic-card__services" aria-label="Услуги и цены">
                        {clinic.top_services.map((s) => (
                            <li key={s.slug}>
                                <span>{s.name}</span>
                                <b>{priceFrom(s.price_from)}</b>
                            </li>
                        ))}
                    </ul>
                ) : null}

                <ClinicFeatures clinic={clinic} />

                {clinic.doctors_preview.length > 0 ? (
                    <div className="clinic-card__doctors">
                        <div className="avatar-stack" aria-hidden="true">
                            {clinic.doctors_preview.map((d) => (
                                <span key={d.slug} className="avatar-stack__item">
                                    <DoctorArt seed={d.art_seed} />
                                </span>
                            ))}
                        </div>
                        <span className="text-sm text-muted">{doctorsWord(clinic.doctors_count)}</span>
                    </div>
                ) : null}

                {clinic.payment_methods.length > 0 ? <p className="clinic-card__pay text-xs text-muted">Оплата: {clinic.payment_methods.join(', ')}</p> : null}

                <div className="clinic-card__actions">
                    <div className="clinic-card__price">
                        <span className="text-xs text-muted">Приём и диагностика</span>
                        <b>{priceFrom(clinic.min_price)}</b>
                    </div>
                    <div className="clinic-card__buttons">
                        <CompareButton type="clinic" id={clinic.id} name={clinic.name} />
                        {clinic.phone ? (
                            <a className="btn btn--outline btn--icon btn--round" href={phoneHref(clinic.phone)} aria-label={`Позвонить в «${clinic.name}»`}>
                                <Icon name="phone" size={20} />
                            </a>
                        ) : null}
                        <Button onClick={open}>Записаться</Button>
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
