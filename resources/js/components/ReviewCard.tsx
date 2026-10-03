import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { dateRu } from '@/lib/format';
import type { ReviewData, SharedProps } from '@/lib/types';
import Icon from './Icon';
import { Button } from './ui/Button';
import { SelectField, TextArea } from './ui/Fields';
import { Modal } from './ui/Overlay';
import { Avatar, Badge, Stars } from './ui/Misc';

export const COMPLAINT_REASONS: Record<string, string> = {
    insult: 'Оскорбления или нецензурная лексика',
    ad: 'Реклама или ссылки',
    personal_data: 'Персональные данные третьих лиц',
    medical_data: 'Диагнозы и медицинские документы',
    fake: 'Вымышленный отзыв / не было визита',
    other: 'Другое',
};

export default function ReviewCard({ review, showClinic, canReport = true }: { review: ReviewData; showClinic?: boolean; canReport?: boolean }) {
    const { auth } = usePage<SharedProps>().props;
    const [report, setReport] = useState(false);
    const [reason, setReason] = useState('fake');
    const [comment, setComment] = useState('');
    const [busy, setBusy] = useState(false);

    const send = () => {
        setBusy(true);
        router.post(
            `/reviews/${review.id}/complaints`,
            { reason, comment },
            {
                preserveScroll: true,
                onFinish: () => setBusy(false),
                onSuccess: () => {
                    setReport(false);
                    setComment('');
                },
            },
        );
    };

    return (
        <article className="review" aria-label={`Отзыв ${review.author_name}`}>
            <header className="review__head">
                <Avatar name={review.author_name} />
                <div className="grow">
                    <div className="review__author">
                        <b>{review.author_name}</b>
                        {review.is_verified_visit ? (
                            <Badge tone="success" icon="check-circle">
                                Подтверждённый визит
                            </Badge>
                        ) : null}
                    </div>
                    <div className="row row--wrap" style={{ gap: 10 }}>
                        <Stars value={review.rating} />
                        <span className="text-xs text-muted">{dateRu(review.published_at ?? review.visit_date)}</span>
                    </div>
                </div>
            </header>

            {review.title ? <h3 className="review__title">{review.title}</h3> : null}
            <p className="review__body">{review.body}</p>

            <div className="review__meta text-xs text-muted">
                {showClinic && review.clinic ? (
                    <Link href={`/clinics/${review.clinic.slug}`} className="link">
                        {review.clinic.name}
                    </Link>
                ) : null}
                {review.doctor ? <span>Врач: {review.doctor.name}</span> : null}
                {review.service ? <span>Услуга: {review.service.name}</span> : null}
                {review.visit_date ? <span>Визит: {dateRu(review.visit_date)}</span> : null}
            </div>

            {review.reply ? (
                <div className="review__reply">
                    <b className="text-sm">Ответ клиники</b>
                    <p>{review.reply.text}</p>
                    {review.reply.at ? <span className="text-xs text-muted">{dateRu(review.reply.at)}</span> : null}
                </div>
            ) : null}

            {canReport ? (
                <button
                    type="button"
                    className="review__report"
                    onClick={() => (auth.user ? setReport(true) : router.visit('/login'))}
                >
                    <Icon name="alert" size={14} /> Пожаловаться
                </button>
            ) : null}

            <Modal
                open={report}
                onClose={() => setReport(false)}
                title="Жалоба на отзыв"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setReport(false)}>
                            Отмена
                        </Button>
                        <Button onClick={send} loading={busy}>
                            Отправить жалобу
                        </Button>
                    </>
                }
            >
                <div className="stack">
                    <SelectField label="Причина" value={reason} onChange={(e) => setReason(e.target.value)}>
                        {Object.entries(COMPLAINT_REASONS).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </SelectField>
                    <TextArea label="Пояснение (необязательно)" maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
                </div>
            </Modal>
        </article>
    );
}
