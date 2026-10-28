import { Link, router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { Check, PhoneField, TextArea, TextField } from '@/components/ui/Fields';
import { Alert } from '@/components/ui/Misc';
import { AnalyticsEvents, trackAnalyticsEvent } from '@/lib/analytics';
import { DoctorArt } from '@/components/PhotoArt';
import { formatRuPhone, money, priceFrom, yearsWord } from '@/lib/format';

interface Clinic {
    id: number;
    slug: string;
    name: string;
    address: string;
    phone: string | null;
    city: { name: string; slug: string } | null;
}

interface Service {
    id: number;
    name: string;
    price_from: number;
    price_to: number | null;
    duration: number;
}

interface Doctor {
    id: number;
    name: string;
    position: string | null;
    experience_years: number;
    photo_url: string | null;
    art_seed?: number;
}

interface DayCount {
    date: string;
    count: number;
}

interface Slot {
    time: string;
    doctor_ids: number[];
}

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

/** Сколько услуг показываем сразу; остальные — по кнопке, чтобы на телефоне не листать длинный список. */
const SERVICES_PREVIEW = 6;

const SECTION_IDS = ['book-service', 'book-doctor', 'book-date', 'book-time', 'book-contacts'];

/** Плавно подводит к следующему шагу, когда он отрисуется. */
function scrollToSection(id: string): void {
    window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
}

/** «сб, 31 октября» из даты YYYY-MM-DD. */
function humanDate(isoDate: string): string {
    return new Date(`${isoDate}T12:00:00`).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
}

function iso(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function addDays(isoDate: string, n: number): string {
    const d = new Date(`${isoDate}T12:00:00`);
    d.setDate(d.getDate() + n);

    return iso(d);
}

export default function BookingCreate({
    clinic,
    branches,
    services,
    doctors,
    uses_doctors,
    initial,
    patient,
    horizon_days,
}: {
    clinic: Clinic;
    branches: { slug: string; name: string; address: string }[];
    services: Service[];
    doctors: Doctor[];
    uses_doctors: boolean;
    initial: { doctor_id: number | null; service_id: number | null };
    patient: { name: string; phone: string } | null;
    horizon_days: number;
}) {
    useEffect(() => {
        trackAnalyticsEvent(AnalyticsEvents.bookingStart, { clinic_id: clinic.id }, clinic.city?.slug ?? null);
    }, [clinic.id, clinic.city?.slug]);

    const [serviceId, setServiceId] = useState<number | null>(initial.service_id);
    const [doctorId, setDoctorId] = useState<number | null>(initial.doctor_id);
    const [anyDoctor, setAnyDoctor] = useState(!initial.doctor_id && uses_doctors);
    const [from, setFrom] = useState(iso(new Date()));
    const [date, setDate] = useState<string | null>(null);
    const [time, setTime] = useState<string | null>(null);
    const [days, setDays] = useState<DayCount[]>([]);
    const [slots, setSlots] = useState<Slot[]>([]);
    const [loadingDays, setLoadingDays] = useState(false);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [showAllServices, setShowAllServices] = useState(false);

    const service = services.find((s) => s.id === serviceId) ?? null;
    const doctor = doctors.find((d) => d.id === doctorId) ?? null;
    const doctorReady = !uses_doctors || anyDoctor || doctorId !== null;
    const step = !doctorReady ? 1 : !date ? 2 : !time ? 3 : 4;

    const form = useForm({
        service_id: serviceId ?? '',
        doctor_id: anyDoctor || !doctorId ? '' : doctorId,
        starts_at: '',
        patient_name: patient?.name ?? '',
        patient_phone: formatRuPhone(patient?.phone ?? ''),
        is_child: false,
        notes: '',
        consent: false,
        website: '',
    });

    useEffect(() => {
        form.setData((d) => ({
            ...d,
            service_id: serviceId ?? '',
            doctor_id: anyDoctor || !doctorId ? '' : doctorId,
            starts_at: date && time ? `${date} ${time}` : '',
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serviceId, doctorId, anyDoctor, date, time]);

    useEffect(() => {
        const q = new URLSearchParams({ from, days: '14' });
        if (serviceId) q.set('service', String(serviceId));
        if (doctorId && !anyDoctor) q.set('doctor', String(doctorId));
        setLoadingDays(true);
        fetch(`/api/v1/clinics/${clinic.slug}/slot-days?${q}`)
            .then((r) => r.json())
            .then((json) => setDays(json.data ?? []))
            .finally(() => setLoadingDays(false));
    }, [clinic.slug, from, serviceId, doctorId, anyDoctor]);

    useEffect(() => {
        if (!date) {
            setSlots([]);
            return;
        }
        const q = new URLSearchParams({ date });
        if (serviceId) q.set('service', String(serviceId));
        if (doctorId && !anyDoctor) q.set('doctor', String(doctorId));
        setLoadingSlots(true);
        fetch(`/api/v1/clinics/${clinic.slug}/slots?${q}`)
            .then((r) => r.json())
            .then((json) => setSlots(json.data?.slots ?? []))
            .finally(() => setLoadingSlots(false));
    }, [clinic.slug, date, serviceId, doctorId, anyDoctor]);

    useEffect(() => {
        if (date && days.length && !days.find((d) => d.date === date && d.count > 0)) {
            setDate(null);
            setTime(null);
        }
    }, [days, date]);

    const firstFree = useMemo(() => days.find((d) => d.count > 0)?.date ?? null, [days]);

    const submit = () => {
        form.post(`/clinics/${clinic.slug}/booking`);
    };

    const pickService = (id: number | null) => {
        setServiceId(id);
        setTime(null);
        scrollToSection(uses_doctors ? 'book-doctor' : 'book-date');
    };

    const pickDoctor = (id: number | null, any = false) => {
        setAnyDoctor(any);
        setDoctorId(id);
        setDate(null);
        setTime(null);
        scrollToSection('book-date');
    };

    const pickDate = (value: string) => {
        setDate(value);
        setTime(null);
        scrollToSection('book-time');
    };

    const pickTime = (value: string) => {
        setTime(value);
        scrollToSection('book-contacts');
    };

    const steps: [string, string][] = [
        ['Услуга', service?.name ?? 'Консультация'],
        ['Врач', uses_doctors ? (anyDoctor ? 'Любой свободный' : doctor?.name ?? 'Выберите') : 'Клиника'],
        ['Дата', date ? humanDate(date) : 'Выберите'],
        ['Время', time ?? 'Выберите'],
        ['Контакты', 'Имя и телефон'],
    ];
    const currentStep = Math.min(step, steps.length - 1);

    const selectedIndex = services.findIndex((s) => s.id === serviceId);
    const servicesCollapsed = !showAllServices && services.length > SERVICES_PREVIEW + 1;
    const visibleServices = servicesCollapsed
        ? services.filter((s, i) => i < SERVICES_PREVIEW || i === selectedIndex)
        : services;

    return (
        <div className="container book">
            <header className="book__head">
                <p className="text-sm text-muted">
                    <Link href={`/clinics/${clinic.slug}`} className="link">{clinic.name}</Link>
                    {clinic.city ? ` · ${clinic.city.name}` : ''}
                </p>
                <h1>Онлайн-запись</h1>
                <p className="text-muted">{clinic.address}</p>
            </header>

            {branches.length > 1 ? (
                <div className="book__choice">
                    {branches.map((b) => (
                        <button
                            key={b.slug}
                            type="button"
                            className={`book-card ${b.slug === clinic.slug ? 'is-on' : ''}`}
                            onClick={() => {
                                if (b.slug !== clinic.slug) {
                                    router.visit(`/clinics/${b.slug}/booking`);
                                }
                            }}
                        >
                            <span />
                            <span>
                                <b>{b.name}</b>
                                <span className="text-sm text-muted">{b.address}</span>
                            </span>
                        </button>
                    ))}
                </div>
            ) : null}

            <nav className="book__steps" aria-label="Шаги записи">
                <ol className="book__step-list">
                    {steps.map(([title, value], i) => {
                        const state = i === currentStep ? 'is-current' : i < currentStep ? 'is-done' : '';
                        const skipped = i === 1 && !uses_doctors;

                        return (
                            <li key={title} className={`book__step ${state}`}>
                                <button
                                    type="button"
                                    disabled={i > currentStep || skipped}
                                    aria-current={i === currentStep ? 'step' : undefined}
                                    onClick={() => scrollToSection(SECTION_IDS[i])}
                                >
                                    <span className="book__step-dot" aria-hidden="true">
                                        {i < currentStep ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}
                                    </span>
                                    <span className="book__step-text">
                                        <span className="book__step-t">{title}</span>
                                        <span className="book__step-v">{value}</span>
                                    </span>
                                </button>
                            </li>
                        );
                    })}
                </ol>
                <p className="book__now">
                    <span>
                        Шаг {currentStep + 1} из {steps.length}
                    </span>
                    {steps[currentStep][0]}
                </p>
            </nav>

            {services.length > 0 ? (
                <section className="card stack book__section" id="book-service">
                    <h2>Услуга</h2>
                    <div className="book__choice book__choice--2">
                        <button type="button" className={`book-card ${serviceId === null ? 'is-on' : ''}`} onClick={() => pickService(null)}>
                            <span />
                            <span>
                                <b>Консультация / осмотр</b>
                                <span className="text-sm text-muted">30 мин, уточнит клиника</span>
                            </span>
                        </button>
                        {visibleServices.map((s) => (
                            <button key={s.id} type="button" className={`book-card ${serviceId === s.id ? 'is-on' : ''}`} onClick={() => pickService(s.id)}>
                                <span />
                                <span>
                                    <b>{s.name}</b>
                                    <span className="text-sm text-muted">{s.duration} мин · {s.price_to ? `${money(s.price_from)}–${money(s.price_to)}` : priceFrom(s.price_from)}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                    {services.length > SERVICES_PREVIEW + 1 ? (
                        <button type="button" className="book__more" onClick={() => setShowAllServices((v) => !v)}>
                            {showAllServices ? 'Свернуть список' : `Показать все услуги (${services.length + 1})`}
                            <Icon name={showAllServices ? 'chevron-up' : 'chevron-down'} size={18} />
                        </button>
                    ) : null}
                </section>
            ) : null}

            {uses_doctors ? (
                <section className="card stack book__section" id="book-doctor">
                    <h2>Врач</h2>
                    <div className="book__choice book__choice--2">
                        <button type="button" className={`book-card ${anyDoctor ? 'is-on' : ''}`} onClick={() => pickDoctor(null, true)}>
                            <span />
                            <span>
                                <b>Любой свободный</b>
                                <span className="text-sm text-muted">Подберём врача на выбранное время</span>
                            </span>
                        </button>
                        {doctors.map((d) => (
                            <button key={d.id} type="button" className={`book-card ${!anyDoctor && doctorId === d.id ? 'is-on' : ''}`} onClick={() => pickDoctor(d.id)}>
                                <span className="book-card__photo">
                                    <DoctorArt seed={d.art_seed} photoUrl={d.photo_url} name={d.name} />
                                </span>
                                <span>
                                    <b>{d.name}</b>
                                    <span className="text-sm text-muted">{d.position}{d.experience_years ? ` · стаж ${yearsWord(d.experience_years)}` : ''}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </section>
            ) : null}

            {doctorReady ? (
                <section className="card stack book__section" id="book-date">
                    <div className="book__section-head">
                        <h2>Дата</h2>
                        <div className="book__pager">
                            <button type="button" aria-label="Предыдущие дни" disabled={from <= iso(new Date())} onClick={() => setFrom(addDays(from, -14))}>
                                <Icon name="chevron-left" size={20} />
                            </button>
                            <button type="button" aria-label="Следующие дни" disabled={addDays(from, 14) > addDays(iso(new Date()), horizon_days)} onClick={() => setFrom(addDays(from, 14))}>
                                <Icon name="chevron-right" size={20} />
                            </button>
                        </div>
                    </div>
                    {loadingDays ? <p className="text-muted">Считаем свободные дни…</p> : null}
                    <div className="book-days">
                        {days.map((d) => {
                            const dt = new Date(`${d.date}T12:00:00`);

                            return (
                                <button key={d.date} type="button" className={`book-day ${date === d.date ? 'is-on' : ''}`} disabled={d.count === 0} onClick={() => pickDate(d.date)}>
                                    <span className="book-day__w">{WEEKDAYS[dt.getDay()]}</span>
                                    <span className="book-day__n">{dt.getDate()}</span>
                                    <span className="book-day__c">{d.count ? `${d.count} св.` : 'нет'}</span>
                                </button>
                            );
                        })}
                    </div>
                    {!loadingDays && !days.some((d) => d.count > 0) ? <Alert>На ближайшие дни свободных слотов нет. Попробуйте другого врача или оставьте заявку «перезвоните мне».</Alert> : null}
                    {!date && firstFree ? (
                        <Button type="button" variant="outline" size="sm" icon="flash" onClick={() => pickDate(firstFree)}>Ближайшее свободное</Button>
                    ) : null}
                </section>
            ) : null}

            {date ? (
                <section className="card stack book__section" id="book-time">
                    <h2>Время</h2>
                    {loadingSlots ? <p className="text-muted">Загружаем слоты…</p> : null}
                    <div className="book-slots">
                        {slots.map((s) => (
                            <button key={s.time} type="button" className={`book-slot ${time === s.time ? 'is-on' : ''}`} onClick={() => pickTime(s.time)}>
                                {s.time}
                            </button>
                        ))}
                    </div>
                    {!loadingSlots && slots.length === 0 ? <p className="text-muted">На эту дату слотов нет.</p> : null}
                    {form.errors.starts_at ? <Alert tone="danger">{form.errors.starts_at}</Alert> : null}
                </section>
            ) : null}

            {time ? (
                <section className="card stack book__section" id="book-contacts">
                    <h2>Контакты</h2>
                    <dl className="book-sum">
                        <div><dt>Когда</dt><dd>{date ? humanDate(date) : ''} в {time}</dd></div>
                        <div><dt>Где</dt><dd>{clinic.name}, {clinic.address}</dd></div>
                        {doctor ? <div><dt>Врач</dt><dd>{doctor.name}</dd></div> : <div><dt>Врач</dt><dd>Любой свободный</dd></div>}
                        {service ? <div><dt>Услуга</dt><dd>{service.name}, {service.duration} мин</dd></div> : null}
                    </dl>
                    <form className="form-grid" autoComplete="on" onSubmit={(e) => { e.preventDefault(); submit(); }}>
                        <TextField label="Ваше имя" required autoComplete="name" maxLength={60} value={form.data.patient_name} onChange={(e) => form.setData('patient_name', e.target.value)} error={form.errors.patient_name} />
                        <PhoneField label="Телефон" required value={form.data.patient_phone} onChange={(e) => form.setData('patient_phone', e.target.value)} error={form.errors.patient_phone} />
                        <TextArea className="span-2" label="Комментарий" maxLength={300} rows={3} placeholder="Например: удобнее после 18:00. Не указывайте диагнозы и данные документов." value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} error={form.errors.notes} />
                        <Check label="Запись для ребёнка" checked={form.data.is_child} onChange={(e) => form.setData('is_child', e.target.checked)} />
                        <Check label="Согласен на обработку персональных данных" checked={form.data.consent} onChange={(e) => form.setData('consent', e.target.checked)} error={form.errors.consent} />
                        <input type="text" name="website" value={form.data.website} onChange={(e) => form.setData('website', e.target.value)} className="visually-hidden" tabIndex={-1} autoComplete="off" />
                        <div className="book__submit span-2">
                            <Button type="submit" size="lg" loading={form.processing}>Подтвердить запись</Button>
                        </div>
                    </form>
                </section>
            ) : null}
        </div>
    );
}
