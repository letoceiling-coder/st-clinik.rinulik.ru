import { Link, useForm, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import type { FormEvent } from 'react';
import type { SharedProps } from '@/lib/types';
import { Button } from './ui/Button';
import { Check, SelectField, TextArea, TextField } from './ui/Fields';
import { Modal } from './ui/Overlay';
import { Alert } from './ui/Misc';

export interface LeadTarget {
    slug: string;
    name: string;
    phone?: string | null;
    doctors?: { id: number; name: string }[];
    services?: { id: number; name: string }[];
    doctorId?: number | null;
    serviceId?: number | null;
    concernId?: number | null;
    source?: string;
}

const today = () => new Date().toISOString().slice(0, 10);
const maxDate = () => new Date(Date.now() + 59 * 864e5).toISOString().slice(0, 10);

export default function LeadModal({ target, onClose }: { target: LeadTarget | null; onClose: () => void }) {
    const { auth } = usePage<SharedProps>().props;
    const form = useForm({
        clinic: '',
        name: auth.user?.name ?? '',
        phone: '',
        preferred_date: '',
        preferred_time: '',
        service_id: '' as string | number,
        doctor_id: '' as string | number,
        concern_id: '' as string | number,
        comment: '',
        is_child: false,
        consent: false,
        website: '',
        source: 'clinic_page',
    });

    useEffect(() => {
        if (target) {
            form.setData((d) => ({
                ...d,
                clinic: target.slug,
                doctor_id: target.doctorId ?? '',
                service_id: target.serviceId ?? '',
                concern_id: target.concernId ?? '',
                source: target.source ?? 'clinic_page',
            }));
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target?.slug, target?.doctorId, target?.serviceId]);

    if (!target) return null;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/leads', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset('comment', 'consent', 'preferred_date', 'preferred_time');
                onClose();
            },
        });
    };

    return (
        <Modal
            open
            onClose={onClose}
            title={`Запись в «${target.name}»`}
            footer={
                <>
                    <Button variant="ghost" onClick={onClose}>
                        Отмена
                    </Button>
                    <Button type="submit" form="lead-form" loading={form.processing}>
                        Отправить заявку
                    </Button>
                </>
            }
        >
            <form id="lead-form" onSubmit={submit} noValidate className="stack">
                <p className="text-muted text-sm">
                    Клиника перезвонит и подтвердит время. Стоимость указана «от» — итоговую назовёт врач после осмотра.
                </p>

                <div className="form-grid">
                    <TextField label="Ваше имя" required autoComplete="given-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} data-autofocus />
                    <TextField
                        label="Телефон"
                        required
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="+7 (900) 000-00-00"
                        value={form.data.phone}
                        onChange={(e) => form.setData('phone', e.target.value)}
                        error={form.errors.phone}
                    />
                    <TextField
                        label="Желаемая дата"
                        type="date"
                        min={today()}
                        max={maxDate()}
                        value={form.data.preferred_date}
                        onChange={(e) => form.setData('preferred_date', e.target.value)}
                        error={form.errors.preferred_date}
                    />
                    <SelectField label="Удобное время" value={form.data.preferred_time} onChange={(e) => form.setData('preferred_time', e.target.value)} error={form.errors.preferred_time}>
                        <option value="">Любое</option>
                        <option value="утро">Утро (до 12:00)</option>
                        <option value="день">День (12:00–17:00)</option>
                        <option value="вечер">Вечер (после 17:00)</option>
                    </SelectField>
                    {target.services?.length ? (
                        <SelectField label="Услуга" value={form.data.service_id} onChange={(e) => form.setData('service_id', e.target.value)} error={form.errors.service_id}>
                            <option value="">Пока не знаю</option>
                            {target.services.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </SelectField>
                    ) : null}
                    {target.doctors?.length ? (
                        <SelectField label="Врач" value={form.data.doctor_id} onChange={(e) => form.setData('doctor_id', e.target.value)} error={form.errors.doctor_id}>
                            <option value="">Любой свободный</option>
                            {target.doctors.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name}
                                </option>
                            ))}
                        </SelectField>
                    ) : null}
                </div>

                <TextArea
                    label="Комментарий (необязательно)"
                    maxLength={300}
                    rows={3}
                    value={form.data.comment}
                    onChange={(e) => form.setData('comment', e.target.value)}
                    error={form.errors.comment}
                    hint={`${form.data.comment.length}/300. Не указывайте диагнозы, номера документов и результаты анализов.`}
                />

                <Check label="Запись нужна ребёнку" checked={form.data.is_child} onChange={(e) => form.setData('is_child', e.target.checked)} />

                {/* honeypot: скрыто от людей, боты его заполняют */}
                <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
                    <label>
                        Сайт
                        <input type="text" tabIndex={-1} autoComplete="off" value={form.data.website} onChange={(e) => form.setData('website', e.target.value)} />
                    </label>
                </div>

                <Check
                    required
                    checked={form.data.consent}
                    onChange={(e) => form.setData('consent', e.target.checked)}
                    error={form.errors.consent}
                    label={
                        <>
                            Согласен на обработку персональных данных (имя, телефон) для записи в клинику — см.{' '}
                            <Link href="/consent" className="link" target="_blank">
                                согласие
                            </Link>{' '}
                            и{' '}
                            <Link href="/privacy" className="link" target="_blank">
                                политику конфиденциальности
                            </Link>
                            .
                        </>
                    }
                />

                {Object.keys(form.errors).length > 0 && !form.errors.name && !form.errors.phone && !form.errors.consent && !form.errors.comment && !form.errors.preferred_date ? (
                    <Alert tone="danger">Проверьте поля формы и попробуйте ещё раз.</Alert>
                ) : null}
            </form>
        </Modal>
    );
}
