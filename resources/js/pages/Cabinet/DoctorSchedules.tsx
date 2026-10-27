import { router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check, SelectField, TextField } from '@/components/ui/Fields';
import { Badge, EmptyState } from '@/components/ui/Misc';

interface Day {
    weekday: number;
    enabled: boolean;
    start_time: string;
    end_time: string;
    break_start: string;
    break_end: string;
    slot_minutes: number;
}

interface Exception {
    id: number;
    kind: string;
    kind_label: string;
    date_from: string;
    date_to: string;
    start_time: string | null;
    end_time: string | null;
    comment: string | null;
}

interface Doctor {
    id: number;
    name: string;
    position: string | null;
    home: boolean;
    days: Day[];
    exceptions: Exception[];
}

export default function DoctorSchedules({
    doctors,
    weekdays,
    slot_minutes,
    kinds,
}: {
    doctors: Doctor[];
    weekdays: { n: number; label: string }[];
    slot_minutes: number[];
    kinds: Record<string, string>;
}) {
    return (
        <div className="stack-lg">
            <PageHead title="Расписание врачей" text="Недельный шаблон, перерывы и исключения. Если шаблона нет — используются часы филиала." action={<a className="link" href="/clinic-cabinet/schedule">График филиала</a>} />
            {doctors.length === 0 ? <EmptyState title="Нет врачей" text="Сначала добавьте врача в филиал." /> : doctors.map((d) => (
                <DoctorCard key={d.id} doctor={d} weekdays={weekdays} slotMinutes={slot_minutes} kinds={kinds} />
            ))}
        </div>
    );
}

function DoctorCard({ doctor, weekdays, slotMinutes, kinds }: { doctor: Doctor; weekdays: { n: number; label: string }[]; slotMinutes: number[]; kinds: Record<string, string> }) {
    const form = useForm({
        days: Object.fromEntries(doctor.days.map((d) => [d.weekday, d])),
    });
    const extra = useForm({
        kind: 'day_off',
        date_from: '',
        date_to: '',
        start_time: '09:00',
        end_time: '14:00',
        comment: '',
    });

    const setDay = (n: number, patch: Partial<Day>) => {
        form.setData('days', { ...form.data.days, [n]: { ...form.data.days[n], ...patch } });
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.put(`/clinic-cabinet/schedule/doctors/${doctor.id}`);
    };

    return (
        <article className="card stack doc-sched">
            <div className="row row--between">
                <div>
                    <b>{doctor.name}</b>
                    <div className="text-sm text-muted">{doctor.position}{doctor.home ? '' : ' · из другого филиала'}</div>
                </div>
                <Badge>{doctor.days.filter((d) => d.enabled).length} дн.</Badge>
            </div>
            <form className="doc-sched__days" onSubmit={submit}>
                {weekdays.map((w) => {
                    const day = form.data.days[w.n];
                    if (!day) return null;

                    return (
                        <div key={w.n} className="doc-sched__day">
                            <Check label={w.label} checked={day.enabled} onChange={(e) => setDay(w.n, { enabled: e.target.checked })} />
                            <div className="doc-sched__times">
                                <TextField label="С" type="time" value={day.start_time} onChange={(e) => setDay(w.n, { start_time: e.target.value })} />
                                <TextField label="До" type="time" value={day.end_time} onChange={(e) => setDay(w.n, { end_time: e.target.value })} />
                                <TextField label="Перерыв с" type="time" value={day.break_start} onChange={(e) => setDay(w.n, { break_start: e.target.value })} />
                                <TextField label="Перерыв до" type="time" value={day.break_end} onChange={(e) => setDay(w.n, { break_end: e.target.value })} />
                                <SelectField label="Шаг" value={String(day.slot_minutes)} onChange={(e) => setDay(w.n, { slot_minutes: Number(e.target.value) })}>
                                    {slotMinutes.map((m) => <option key={m} value={m}>{m} мин</option>)}
                                </SelectField>
                            </div>
                        </div>
                    );
                })}
                <Button type="submit" loading={form.processing}>Сохранить шаблон</Button>
            </form>

            <div className="stack">
                <h3>Исключения</h3>
                {doctor.exceptions.length === 0 ? <p className="text-sm text-muted">Нет выходных и отпусков.</p> : (
                    <ul className="stack">
                        {doctor.exceptions.map((e) => (
                            <li key={e.id} className="row row--between">
                                <span>{e.kind_label}: {e.date_from}{e.date_to !== e.date_from ? ` — ${e.date_to}` : ''}{e.start_time ? ` ${e.start_time}–${e.end_time}` : ''}{e.comment ? ` · ${e.comment}` : ''}</span>
                                <Button size="sm" variant="ghost" onClick={() => router.delete(`/clinic-cabinet/schedule/exceptions/${e.id}`)}>Удалить</Button>
                            </li>
                        ))}
                    </ul>
                )}
                <form className="form-grid" onSubmit={(e) => { e.preventDefault(); extra.post(`/clinic-cabinet/schedule/doctors/${doctor.id}/exceptions`, { onSuccess: () => extra.reset() }); }}>
                    <SelectField label="Тип" value={extra.data.kind} onChange={(e) => extra.setData('kind', e.target.value)}>
                        {Object.entries(kinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </SelectField>
                    <TextField label="С" type="date" value={extra.data.date_from} onChange={(e) => extra.setData('date_from', e.target.value)} />
                    <TextField label="По" type="date" value={extra.data.date_to} onChange={(e) => extra.setData('date_to', e.target.value)} />
                    {extra.data.kind === 'hours' ? (
                        <>
                            <TextField label="С" type="time" value={extra.data.start_time} onChange={(e) => extra.setData('start_time', e.target.value)} />
                            <TextField label="До" type="time" value={extra.data.end_time} onChange={(e) => extra.setData('end_time', e.target.value)} />
                        </>
                    ) : null}
                    <TextField label="Комментарий" value={extra.data.comment} onChange={(e) => extra.setData('comment', e.target.value)} />
                    <Button type="submit" size="sm" loading={extra.processing}>Добавить</Button>
                </form>
            </div>
        </article>
    );
}
