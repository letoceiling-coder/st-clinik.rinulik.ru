import { Link, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { StatusBadge } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { TextArea, TextField } from '@/components/ui/Fields';
import { Alert } from '@/components/ui/Misc';

interface Appointment {
    id: number;
    status: string;
    status_label: string;
    starts_at: string;
    ends_at: string;
    requested_starts_at: string | null;
    patient_name: string;
    patient_phone: string;
    can_cancel: boolean;
    can_reschedule: boolean;
    clinic: { slug: string; name: string; address: string; phone: string | null } | null;
    doctor: { id: number; slug: string; name: string; position: string | null } | null;
    service: { id: number; name: string } | null;
}

interface HistoryRow {
    id: number;
    to_label: string;
    actor: string;
    comment: string | null;
    at: string | null;
}

export default function BookingShow({
    appointment,
    history,
    cancel_url,
    reschedule_url,
}: {
    appointment: Appointment;
    history: HistoryRow[];
    cancel_url: string;
    reschedule_url: string;
}) {
    const cancel = useForm({ reason: '' });
    const move = useForm({ starts_at: '', comment: '' });
    const [openMove, setOpenMove] = useState(false);
    const [slots, setSlots] = useState<{ time: string }[]>([]);
    const [day, setDay] = useState(appointment.starts_at.slice(0, 10));

    useEffect(() => {
        if (!openMove || !appointment.clinic) return;
        const q = new URLSearchParams({ date: day });
        if (appointment.doctor) q.set('doctor', String(appointment.doctor.id));
        if (appointment.service) q.set('service', String(appointment.service.id));
        fetch(`/api/v1/clinics/${appointment.clinic.slug}/slots?${q}`)
            .then((r) => r.json())
            .then((json) => setSlots(json.data?.slots ?? []));
    }, [openMove, day, appointment.clinic, appointment.doctor, appointment.service]);

    return (
        <div className="container book">
            <article className="card appt-card">
                <div className="row row--between">
                    <h1>Ваша запись</h1>
                    <StatusBadge status={appointment.status} label={appointment.status_label} />
                </div>
                <p className="appt-card__when">{appointment.starts_at.replace(' ', ' в ')}</p>
                {appointment.clinic ? (
                    <p>
                        <Link href={`/clinics/${appointment.clinic.slug}`} className="link">{appointment.clinic.name}</Link>
                        <br />
                        <span className="text-muted">{appointment.clinic.address}</span>
                    </p>
                ) : null}
                <dl className="book-sum">
                    {appointment.doctor ? <div><dt>Врач</dt><dd>{appointment.doctor.name}</dd></div> : null}
                    {appointment.service ? <div><dt>Услуга</dt><dd>{appointment.service.name}</dd></div> : null}
                    <div><dt>Пациент</dt><dd>{appointment.patient_name}, {appointment.patient_phone}</dd></div>
                    {appointment.requested_starts_at ? <div><dt>Запрошен перенос</dt><dd>{appointment.requested_starts_at}</dd></div> : null}
                </dl>

                {appointment.can_reschedule ? (
                    openMove ? (
                        <form className="stack" onSubmit={(e) => { e.preventDefault(); move.post(reschedule_url); }}>
                            <TextField label="Новая дата" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
                            <div className="book-slots">
                                {slots.map((s) => (
                                    <button key={s.time} type="button" className={`book-slot ${move.data.starts_at === `${day} ${s.time}` ? 'is-on' : ''}`} onClick={() => move.setData('starts_at', `${day} ${s.time}`)}>
                                        {s.time}
                                    </button>
                                ))}
                            </div>
                            {move.errors.starts_at ? <Alert tone="danger">{move.errors.starts_at}</Alert> : null}
                            <TextArea label="Комментарий" value={move.data.comment} onChange={(e) => move.setData('comment', e.target.value)} />
                            <div className="row">
                                <Button type="submit" loading={move.processing}>Отправить запрос</Button>
                                <Button type="button" variant="ghost" onClick={() => setOpenMove(false)}>Отмена</Button>
                            </div>
                        </form>
                    ) : (
                        <Button type="button" variant="outline" onClick={() => setOpenMove(true)}>Попросить перенос</Button>
                    )
                ) : null}

                {appointment.can_cancel ? (
                    <form className="stack" onSubmit={(e) => { e.preventDefault(); cancel.post(cancel_url); }}>
                        <TextArea label="Причина отмены" value={cancel.data.reason} onChange={(e) => cancel.setData('reason', e.target.value)} />
                        <Button type="submit" variant="danger" loading={cancel.processing}>Отменить запись</Button>
                    </form>
                ) : null}

                {history.length > 0 ? (
                    <ul className="stack text-sm">
                        {history.map((h) => (
                            <li key={h.id}>{h.at} · {h.to_label} · {h.actor}{h.comment ? ` — ${h.comment}` : ''}</li>
                        ))}
                    </ul>
                ) : null}
            </article>
        </div>
    );
}
