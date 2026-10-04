import { Link } from '@inertiajs/react';
import { cx, priceFrom, reviewsWord, yearsWord } from '@/lib/format';
import type { DoctorData } from '@/lib/types';
import { CompareButton, FavoriteButton } from './CollectionButtons';
import Icon from './Icon';
import { useLead } from './LeadContext';
import { DoctorArt } from './PhotoArt';
import { Button } from './ui/Button';
import { Badge } from './ui/Misc';

export default function DoctorCard({ doctor, compact }: { doctor: DoctorData; compact?: boolean }) {
    const lead = useLead();
    const href = `/doctors/${doctor.slug}`;

    return (
        <article className={cx('doctor-card', compact && 'doctor-card--compact')} aria-labelledby={`doctor-${doctor.id}`}>
            <Link href={href} className="doctor-card__photo" tabIndex={-1} aria-hidden="true">
                <DoctorArt seed={doctor.art_seed} photoUrl={doctor.photo_url} name={doctor.name} />
            </Link>
            <FavoriteButton type="doctor" id={doctor.id} name={doctor.name} />
            <div className="doctor-card__body">
                <h3 id={`doctor-${doctor.id}`} className="doctor-card__name">
                    <Link href={href}>{doctor.name}</Link>
                </h3>
                <p className="text-muted text-sm">{doctor.position}</p>
                <div className="row row--wrap" style={{ gap: 8 }}>
                    {doctor.reviews_count > 0 ? (
                        <span className="rating">
                            <Icon name="star" size={17} />
                            {doctor.rating.toFixed(1).replace('.', ',')}
                            <span className="rating__count">{reviewsWord(doctor.reviews_count)}</span>
                        </span>
                    ) : (
                        <span className="rating__count">Пока нет отзывов</span>
                    )}
                </div>
                <div className="doctor-card__meta">
                    <Badge icon="award">Стаж {yearsWord(doctor.experience_years)}</Badge>
                    {doctor.is_verified ? (
                        <Badge tone="success" icon="shield">
                            Проверен
                        </Badge>
                    ) : null}
                    {doctor.accepts_children ? <Badge tone="primary">{doctor.children_age_from ? `Дети с ${doctor.children_age_from}` : 'Принимает детей'}</Badge> : null}
                </div>
                {doctor.clinic ? (
                    <p className="doctor-card__clinic text-sm">
                        <Icon name="pin" size={15} />
                        <Link href={`/clinics/${doctor.clinic.slug}`} className="link-arrow" style={{ fontWeight: 600 }}>
                            {doctor.clinic.name}
                        </Link>
                    </p>
                ) : null}
                {!compact ? (
                    <div className="doctor-card__actions">
                        <div>
                            <span className="text-xs text-muted">Приём</span>
                            <br />
                            <b>{priceFrom(doctor.consult_price, 'по запросу')}</b>
                        </div>
                        <div className="row">
                            <CompareButton type="doctor" id={doctor.id} name={doctor.name} compact />
                            {doctor.clinic ? (
                                <Button
                                    size="sm"
                                    onClick={() =>
                                        lead.open({ slug: doctor.clinic!.slug, name: doctor.clinic!.name, doctorId: doctor.id, doctors: [{ id: doctor.id, name: doctor.name }], source: 'doctor' })
                                    }
                                >
                                    Записаться
                                </Button>
                            ) : null}
                        </div>
                    </div>
                ) : null}
            </div>
        </article>
    );
}
