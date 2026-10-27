import { Link, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { PageHead, PagerSafe, StatusBadge, Table } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { TextArea, TextField } from '@/components/ui/Fields';
import { Alert, EmptyState, Tabs } from '@/components/ui/Misc';
import { Modal } from '@/components/ui/Overlay';
import type { Paginated } from '@/lib/types';

interface Appointment {
    id: number;
    status: string;
    status_label: string;
    starts_at: string;
    requested_starts_at: string | null;
    can_cancel: boolean;
    can_reschedule: boolean;
    clinic: { slug: string; name: string; address: string } | null;
    doctor: { id: number; name: string } | null;
    service: { name: string } | null;
}

export default function Appointments({
    appointments,
    scope,
    counts,
}: {
    appointments: Paginated<Appointment>;
    scope: 'upcoming' | 'past';
    counts: { upcoming: number };
}) {
    const [moving, setMoving] = useState<Appointment | null>(null);

    return (
        <div className="stack-lg">
            <PageHead title="Мои записи" text="Отмена и перенос — до начала приёма. Перенос подтверждает клиника." />
            <Tabs
                label="Период"
                value={scope}
                items={[
                    { key: 'upcoming', label: 'Предстоящие', count: counts.upcoming },
                    { key: 'past', label: 'Прошедшие' },
                ]}
                onChange={(k) => router.get('/account/appointments', k === 'past' ? { scope: 'past' } : {})}
            />
            {appointments.data.length === 0 ? (
                <EmptyState title={scope === 'upcoming' ? 'Записей нет' : 'Прошлых записей нет'} text="Запишитесь со страницы клиники." />
            ) : (
                <Table headers={['Когда', 'Клиника', 'Статус', '']}>
                    {appointments.data.map((a) => (
                        <tr key={a.id}>
                            <td>
                                <b>{a.starts_at.replace(' ', ' в ')}</b>
                                {a.requested_starts_at ? <div className="text-xs text-muted">Запрошен перенос на {a.requested_starts_at}</div> : null}
                            </td>
                            <td>
                                {a.clinic ? <Link href={`/clinics/${a.clinic.slug}`} className="link">{a.clinic.name}</Link> : '—'}
                                <div className="text-xs text-muted">{a.doctor?.name ?? a.service?.name ?? a.clinic?.address}</div>
                            </td>
                            <td><StatusBadge status={a.status} label={a.status_label} /></td>
                            <td className="actions">
                                {a.can_reschedule ? <Button size="sm" variant="ghost" onClick={() => setMoving(a)}>Перенести</Button> : null}
                                {a.can_cancel ? <Button size="sm" variant="ghost" onClick={() => router.post(`/account/appointments/${a.id}/cancel`)}>Отменить</Button> : null}
                            </td>
                        </tr>
                    ))}
                </Table>
            )}
            <PagerSafe page={appointments} />
            {moving ? <RescheduleModal appointment={moving} onClose={() => setMoving(null)} /> : null}
        </div>
    );
}

function RescheduleModal({ appointment, onClose }: { appointment: Appointment; onClose: () => void }) {
    const form = useForm({ starts_at: '', comment: '' });
    const [day, setDay] = useState(appointment.starts_at.slice(0, 10));
    const [slots, setSlots] = useState<{ time: string }[]>([]);

    useEffect(() => {
        if (!appointment.clinic) return;
        const q = new URLSearchParams({ date: day });
        if (appointment.doctor) q.set('doctor', String(appointment.doctor.id));
        fetch(`/api/v1/clinics/${appointment.clinic.slug}/slots?${q}`)
            .then((r) => r.json())
            .then((json) => setSlots(json.data?.slots ?? []));
    }, [appointment, day]);

    return (
        <Modal open onClose={onClose} title="Перенос записи">
            <form className="stack" onSubmit={(e) => { e.preventDefault(); form.post(`/account/appointments/${appointment.id}/reschedule`, { onSuccess: onClose }); }}>
                <TextField label="Дата" type="date" value={day} onChange={(e) => setDay(e.target.value)} />
                <div className="book-slots">
                    {slots.map((s) => (
                        <button key={s.time} type="button" className={`book-slot ${form.data.starts_at === `${day} ${s.time}` ? 'is-on' : ''}`} onClick={() => form.setData('starts_at', `${day} ${s.time}`)}>
                            {s.time}
                        </button>
                    ))}
                </div>
                {form.errors.starts_at ? <Alert tone="danger">{form.errors.starts_at}</Alert> : null}
                <TextArea label="Комментарий" value={form.data.comment} onChange={(e) => form.setData('comment', e.target.value)} />
                <div className="row">
                    <Button type="submit" loading={form.processing}>Отправить запрос</Button>
                    <Button type="button" variant="ghost" onClick={onClose}>Закрыть</Button>
                </div>
            </form>
        </Modal>
    );
}
