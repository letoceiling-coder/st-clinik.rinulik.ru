import { Link, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import type { SharedProps } from '@/lib/types';
import Icon from './Icon';
import { Button, LinkButton } from './ui/Button';
import { Check, SelectField, TextArea, TextField } from './ui/Fields';
import { Alert } from './ui/Misc';

export default function ReviewForm({
    clinicSlug,
    doctors,
    services,
}: {
    clinicSlug: string;
    doctors: { id: number; name: string }[];
    services: { id: number; name: string }[];
}) {
    const { auth } = usePage<SharedProps>().props;
    const [hover, setHover] = useState(0);
    const form = useForm({
        rating: 0,
        title: '',
        body: '',
        visit_date: '',
        doctor_id: '' as string | number,
        service_id: '' as string | number,
        rules: false,
        consent: false,
    });

    if (!auth.user) {
        return (
            <div className="card card--muted">
                <h3 className="card-title" style={{ marginBottom: 8 }}>
                    Были в этой клинике?
                </h3>
                <p className="text-muted" style={{ marginBottom: 16 }}>
                    Войдите, чтобы оставить отзыв. Отзывы публикуются после проверки модератором.
                </p>
                <LinkButton href="/login" variant="dark">
                    Войти и написать отзыв
                </LinkButton>
            </div>
        );
    }

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(`/clinics/${clinicSlug}/reviews`, {
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    const shown = hover || form.data.rating;

    return (
        <form onSubmit={submit} noValidate className="card stack" id="review-form" aria-labelledby="review-form-title">
            <h3 id="review-form-title" className="card-title" style={{ marginBottom: 0 }}>
                Оставить отзыв
            </h3>
            <Alert tone="muted" icon="shield">
                Опишите свой опыт: что понравилось, как прошёл приём. Не указывайте диагнозы, результаты анализов и персональные данные — такие отзывы не публикуются. Подробнее в{' '}
                <Link href="/review-rules" className="link">
                    правилах отзывов
                </Link>
                .
            </Alert>

            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                <legend className="field__label" style={{ marginBottom: 8 }}>
                    Ваша оценка <span className="req">*</span>
                </legend>
                <div className="star-input" onMouseLeave={() => setHover(0)}>
                    {[1, 2, 3, 4, 5].map((n) => (
                        <label key={n} onMouseEnter={() => setHover(n)} className={n <= shown ? 'is-on' : ''}>
                            <input type="radio" name="rating" value={n} checked={form.data.rating === n} onChange={() => form.setData('rating', n)} className="visually-hidden" />
                            <Icon name="star" size={34} />
                            <span className="visually-hidden">{n} из 5</span>
                        </label>
                    ))}
                </div>
                {form.errors.rating ? <p className="field__error" role="alert">{form.errors.rating}</p> : null}
            </fieldset>

            <div className="form-grid">
                <TextField label="Заголовок" maxLength={100} value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} />
                <TextField
                    label="Когда были на приёме"
                    required
                    type="date"
                    max={new Date().toISOString().slice(0, 10)}
                    value={form.data.visit_date}
                    onChange={(e) => form.setData('visit_date', e.target.value)}
                    error={form.errors.visit_date}
                />
                {doctors.length > 0 ? (
                    <SelectField label="Врач" value={form.data.doctor_id} onChange={(e) => form.setData('doctor_id', e.target.value)}>
                        <option value="">Не указывать</option>
                        {doctors.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </SelectField>
                ) : null}
                {services.length > 0 ? (
                    <SelectField label="Услуга" value={form.data.service_id} onChange={(e) => form.setData('service_id', e.target.value)}>
                        <option value="">Не указывать</option>
                        {services.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </SelectField>
                ) : null}
            </div>

            <TextArea
                label="Ваш отзыв"
                required
                rows={6}
                maxLength={3000}
                value={form.data.body}
                onChange={(e) => form.setData('body', e.target.value)}
                error={form.errors.body}
                hint={`${form.data.body.length}/3000 · не менее 40 символов`}
            />

            <Check checked={form.data.rules} onChange={(e) => form.setData('rules', e.target.checked)} error={form.errors.rules} label="Я описываю личный опыт и согласен с правилами публикации отзывов" />
            <Check
                checked={form.data.consent}
                onChange={(e) => form.setData('consent', e.target.checked)}
                error={form.errors.consent}
                label="Согласен на обработку персональных данных и публикацию отзыва под именем и первой буквой фамилии"
            />

            <div>
                <Button type="submit" loading={form.processing}>
                    Отправить на проверку
                </Button>
            </div>
        </form>
    );
}
