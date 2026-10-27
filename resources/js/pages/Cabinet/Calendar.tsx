import { router, useForm } from '@inertiajs/react';
import { type CSSProperties, useMemo, useState } from 'react';
import { PageHead, StatusBadge } from '@/components/Dash';
import Icon from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { PhoneField, SelectField, TextArea, TextField } from '@/components/ui/Fields';
import { Badge, EmptyState } from '@/components/ui/Misc';
import { Modal } from '@/components/ui/Overlay';
import { cx } from '@/lib/format';

interface DaySchedule {
    is_working: boolean;
    open: string | null;
    close: string | null;
    open_minutes: number;
    close_minutes: number;
    hours_label: string;
}

interface Appointment {
    id: number;
    patient_name: string;
    patient_phone: string;
    starts_at: string;
    time_label: string;
    status: string;
    status_label: string;
    is_past: boolean;
    source: string;
    doctor: string | null;
    doctor_id: number | null;
    service: string | null;
    service_id: number | null;
    lead_id: number | null;
    notes: string | null;
    cancel_reason: string | null;
    requested_starts_at: string | null;
    requested_label: string | null;
    date_label: string | null;
    duration_minutes: number;
    history: { id: number; to_label: string; actor: string; comment: string | null; at: string | null }[];
}

interface Day {
    date: string;
    label: string;
    label_short?: string;
    weekday_short?: string;
    is_today: boolean;
    in_month?: boolean;
    schedule: DaySchedule;
    appointments: Appointment[];
}

interface GridConfig {
    start_minutes: number;
    end_minutes: number;
    step_minutes: number;
}

type CalendarView = 'week' | 'day' | 'month';

interface Props {
    anchor: string;
    week_start: string;
    period_label: string;
    focus_day: string;
    focus_label: string;
    view: CalendarView;
    doctor_id: number | null;
    days: Day[];
    doctors: { id: number; name: string }[];
    services: { id: number; name: string }[];
    statuses: Record<string, string>;
    transitions: Record<string, string[]>;
    reschedule_requests: Appointment[];
    durations: number[];
    grid: GridConfig;
}

const ROW_PX = 28;
const MONTH_WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function formatLocalDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function parseLocalDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function calendarQuery(anchor: string, extra: Record<string, string | number | undefined | null> = {}) {
    const url = new URL(window.location.href);
    const branch = url.searchParams.get('branch');
    const params: Record<string, string | number | undefined> = {
        anchor,
        ...extra,
    };
    if (branch) {
        params.branch = branch;
    }
    Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === null || params[key] === '') {
            delete params[key];
        }
    });
    return params;
}

function navigateCalendar(anchor: string, extra: Record<string, string | number | undefined | null> = {}) {
    router.get('/clinic-cabinet/calendar', calendarQuery(anchor, extra), {
        preserveScroll: true,
        preserveState: false,
    });
}

function navParams(view: CalendarView, anchor: string, focusDay: string, doctorId: number | null) {
    return {
        view,
        day: focusDay,
        doctor_id: doctorId ?? undefined,
    };
}

function shiftPeriod(view: CalendarView, anchor: string, weekStart: string, focusDay: string, delta: number, doctorId: number | null) {
    if (view === 'day') {
        const d = parseLocalDate(focusDay);
        d.setDate(d.getDate() + delta);
        const next = formatLocalDate(d);
        navigateCalendar(next, navParams('day', next, next, doctorId));
        return;
    }

    if (view === 'month') {
        const d = parseLocalDate(anchor);
        d.setDate(1);
        d.setMonth(d.getMonth() + delta);
        const next = formatLocalDate(d);
        navigateCalendar(next, navParams('month', next, next, doctorId));
        return;
    }

    const monday = parseLocalDate(weekStart);
    monday.setDate(monday.getDate() + delta * 7);
    const newWeekStart = formatLocalDate(monday);

    const focus = parseLocalDate(focusDay);
    const oldMonday = parseLocalDate(weekStart);
    const offset = Math.round((focus.getTime() - oldMonday.getTime()) / 86400000);
    const newFocus = parseLocalDate(newWeekStart);
    newFocus.setDate(newFocus.getDate() + Math.max(0, Math.min(6, offset)));
    const newFocusStr = formatLocalDate(newFocus);

    navigateCalendar(newWeekStart, navParams('week', newWeekStart, newFocusStr, doctorId));
}

function goToday(view: CalendarView, doctorId: number | null) {
    const today = formatLocalDate(new Date());
    navigateCalendar(today, navParams(view, today, today, doctorId));
}

function defaultStartsAt(date: string, hour = 10, minute = 0) {
    return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function parseLocalDateTime(value: string): Date {
    const [datePart, timePart] = value.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    const [hh, mm] = (timePart ?? '00:00').split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm, 0, 0);
}

function gridRowCount(grid: GridConfig): number {
    return (grid.end_minutes - grid.start_minutes) / grid.step_minutes;
}

function eventPosition(startsAt: string, durationMinutes: number, grid: GridConfig): { top: number; height: number } | null {
    const start = parseLocalDateTime(startsAt);
    const dayStartMin = grid.start_minutes;
    const dayEndMin = grid.end_minutes;
    const startMin = start.getHours() * 60 + start.getMinutes();
    const endMin = startMin + durationMinutes;

    if (endMin <= dayStartMin || startMin >= dayEndMin) {
        return null;
    }

    const top = ((Math.max(startMin, dayStartMin) - dayStartMin) / grid.step_minutes) * ROW_PX;
    const visibleDuration = Math.min(endMin, dayEndMin) - Math.max(startMin, dayStartMin);
    const height = (visibleDuration / grid.step_minutes) * ROW_PX - 2;

    return { top, height: Math.max(height, ROW_PX - 2) };
}

function hourLabels(grid: GridConfig): string[] {
    const labels: string[] = [];
    const firstHour = Math.floor(grid.start_minutes / 60);
    const lastHour = Math.ceil(grid.end_minutes / 60);
    for (let h = firstHour; h < lastHour; h++) {
        labels.push(`${String(h).padStart(2, '0')}:00`);
    }
    return labels;
}

function minutesFromGridOffset(grid: GridConfig, slotIndex: number): number {
    return grid.start_minutes + slotIndex * grid.step_minutes;
}

function isWithinWorkingHours(day: Day, minutesFromMidnight: number): boolean {
    if (!day.schedule.is_working) {
        return false;
    }
    return minutesFromMidnight >= day.schedule.open_minutes && minutesFromMidnight < day.schedule.close_minutes;
}

function closedOverlayStyle(grid: GridConfig, openMinutes: number, closeMinutes: number, bodyHeight: number): { before: CSSProperties | null; after: CSSProperties | null } {
    const gridStart = grid.start_minutes;
    const beforeHeight = Math.max(0, ((openMinutes - gridStart) / grid.step_minutes) * ROW_PX);
    const afterTop = Math.max(0, ((closeMinutes - gridStart) / grid.step_minutes) * ROW_PX);
    const afterHeight = Math.max(0, bodyHeight - afterTop);

    return {
        before: beforeHeight > 0 ? { height: beforeHeight } : null,
        after: afterHeight > 0 ? { top: afterTop, height: afterHeight } : null,
    };
}

function defaultOpenTime(day: Day, grid: GridConfig): string {
    if (day.schedule.is_working && day.schedule.open) {
        const [h, m] = day.schedule.open.split(':').map(Number);
        return defaultStartsAt(day.date, h, m);
    }
    const hour = Math.floor(grid.start_minutes / 60);
    const minute = grid.start_minutes % 60;
    return defaultStartsAt(day.date, hour, minute);
}

export default function Calendar({
    anchor,
    week_start,
    period_label,
    focus_day,
    view,
    doctor_id,
    days,
    doctors,
    services,
    statuses,
    transitions = {},
    reschedule_requests = [],
    durations,
    grid,
}: Props) {
    const [creatingFor, setCreatingFor] = useState<string | null>(null);
    const [creatingStartsAt, setCreatingStartsAt] = useState<string | null>(null);
    const [editing, setEditing] = useState<Appointment | null>(null);

    const visibleDays = useMemo(() => {
        if (view === 'day') {
            return days.filter((d) => d.date === focus_day);
        }
        if (view === 'week') {
            return days.slice(0, 7);
        }
        return days;
    }, [days, focus_day, view]);

    const monthWeeks = useMemo(() => {
        if (view !== 'month') {
            return [];
        }
        const weeks: Day[][] = [];
        for (let i = 0; i < days.length; i += 7) {
            weeks.push(days.slice(i, i + 7));
        }
        return weeks;
    }, [days, view]);

    const total = useMemo(() => {
        if (view === 'month') {
            return days.filter((d) => d.in_month !== false).reduce((sum, d) => sum + d.appointments.length, 0);
        }
        return visibleDays.reduce((sum, d) => sum + d.appointments.length, 0);
    }, [days, visibleDays, view]);

    const rows = gridRowCount(grid);
    const bodyHeight = rows * ROW_PX;
    const hourBlockPx = (60 / grid.step_minutes) * ROW_PX;

    const modalOpen = creatingFor !== null || editing !== null;
    const modalTitle = editing ? 'Редактирование записи' : 'Новая запись';

    const closeModal = () => {
        setCreatingFor(null);
        setCreatingStartsAt(null);
        setEditing(null);
    };

    const openCreate = (date: string, startsAt?: string) => {
        const day = days.find((d) => d.date === date);
        if (day && !day.schedule.is_working) {
            return;
        }
        setEditing(null);
        setCreatingFor(date);
        setCreatingStartsAt(startsAt ?? (day ? defaultOpenTime(day, grid) : defaultStartsAt(date)));
    };

    const openDayView = (date: string) => {
        navigateCalendar(date, navParams('day', date, date, doctor_id));
    };

    const handleEmptySlotClick = (day: Day, offsetY: number, column: HTMLElement) => {
        if (!day.schedule.is_working) {
            return;
        }
        const rect = column.getBoundingClientRect();
        const y = offsetY - rect.top;
        const slotIndex = Math.max(0, Math.min(rows - 1, Math.floor(y / ROW_PX)));
        const minutes = minutesFromGridOffset(grid, slotIndex);
        if (!isWithinWorkingHours(day, minutes)) {
            return;
        }
        const hour = Math.floor(minutes / 60);
        const minute = minutes % 60;
        openCreate(day.date, defaultStartsAt(day.date, hour, minute));
    };

    const formDefaults = editing
        ? {
            patient_name: editing.patient_name,
            patient_phone: editing.patient_phone,
            starts_at: editing.starts_at,
            duration_minutes: editing.duration_minutes,
            doctor_id: editing.doctor_id ? String(editing.doctor_id) : '',
            service_id: editing.service_id ? String(editing.service_id) : '',
            status: editing.status,
            notes: editing.notes ?? '',
        }
        : {
            patient_name: '',
            patient_phone: '',
            starts_at: creatingStartsAt ?? defaultStartsAt(creatingFor ?? focus_day),
            duration_minutes: 30,
            doctor_id: doctor_id ? String(doctor_id) : '',
            service_id: '',
            status: 'confirmed',
            notes: '',
        };

    const prevLabel = view === 'day' ? 'Предыдущий день' : view === 'month' ? 'Предыдущий месяц' : 'Предыдущая неделя';
    const nextLabel = view === 'day' ? 'Следующий день' : view === 'month' ? 'Следующий месяц' : 'Следующая неделя';

    return (
        <div className="stack-lg">
            <PageHead
                title="Календарь записей"
                text="Неделя, день или месяц. Прошедшие приёмы отображаются со статусами. Клик по слоту — новая запись."
                action={
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                            const day = days.find((d) => d.date === focus_day) ?? visibleDays[0];
                            if (day) {
                                openCreate(day.date);
                            }
                        }}
                    >
                        <Icon name="plus" size={18} /> Новая запись
                    </Button>
                }
            />

            {reschedule_requests.length > 0 ? (
                <section className="card stack">
                    <h2>Запросы на перенос</h2>
                    {reschedule_requests.map((a) => (
                        <div key={a.id} className="row row--between row--wrap">
                            <div>
                                <b>{a.patient_name}</b>
                                <div className="text-sm text-muted">{a.date_label} → {a.requested_label}{a.doctor ? ` · ${a.doctor}` : ''}</div>
                            </div>
                            <div className="row">
                                <Button size="sm" onClick={() => router.post(`/clinic-cabinet/calendar/${a.id}/reschedule/approve`)}>Подтвердить</Button>
                                <Button size="sm" variant="outline" onClick={() => router.post(`/clinic-cabinet/calendar/${a.id}/reschedule/reject`)}>Отклонить</Button>
                            </div>
                        </div>
                    ))}
                </section>
            ) : null}

            <div className="cal-toolbar card row row--between row--wrap">
                <div className="row row--wrap cal-toolbar__nav">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => shiftPeriod(view, anchor, week_start, focus_day, -1, doctor_id)}
                        aria-label={prevLabel}
                    >
                        <Icon name="chevron-left" size={18} />
                    </Button>
                    <strong className="cal-toolbar__label">{period_label}</strong>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => shiftPeriod(view, anchor, week_start, focus_day, 1, doctor_id)}
                        aria-label={nextLabel}
                    >
                        <Icon name="chevron-right" size={18} />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="cal-toolbar__today" onClick={() => goToday(view, doctor_id)}>
                        Сегодня
                    </Button>
                </div>

                <div className="row row--wrap cal-toolbar__filters">
                    <div className="cal-view-toggle" role="group" aria-label="Режим календаря">
                        <Button
                            type="button"
                            size="sm"
                            variant={view === 'month' ? 'primary' : 'outline'}
                            onClick={() => navigateCalendar(focus_day, navParams('month', focus_day, focus_day, doctor_id))}
                        >
                            Месяц
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={view === 'week' ? 'primary' : 'outline'}
                            onClick={() => navigateCalendar(week_start, navParams('week', week_start, focus_day, doctor_id))}
                        >
                            Неделя
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={view === 'day' ? 'primary' : 'outline'}
                            onClick={() => navigateCalendar(focus_day, navParams('day', focus_day, focus_day, doctor_id))}
                        >
                            День
                        </Button>
                    </div>

                    <SelectField
                        label=""
                        aria-label="Врач"
                        className="cal-toolbar__doctor"
                        value={doctor_id ? String(doctor_id) : ''}
                        onChange={(e) => {
                            const id = e.target.value;
                            navigateCalendar(anchor, {
                                ...navParams(view, anchor, focus_day, id ? Number(id) : null),
                            });
                        }}
                    >
                        <option value="">Все врачи</option>
                        {doctors.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </SelectField>
                </div>

                <span className="text-sm text-muted">Записей: {total}</span>
            </div>

            {view === 'month' ? (
                <div className="cal-month card">
                    <div className="cal-month__weekdays">
                        {MONTH_WEEKDAYS.map((w) => (
                            <span key={w}>{w}</span>
                        ))}
                    </div>
                    {monthWeeks.map((week) => (
                        <div key={week[0]?.date ?? week.map((d) => d.date).join('-')} className="cal-month__week">
                            {week.map((day) => {
                                const preview = day.appointments.slice(0, 3);
                                const more = day.appointments.length - preview.length;
                                return (
                                    <div
                                        key={day.date}
                                        className={cx(
                                            'cal-month__cell',
                                            day.in_month === false && 'cal-month__cell--muted',
                                            day.is_today && 'cal-month__cell--today',
                                            !day.schedule.is_working && 'cal-month__cell--off',
                                        )}
                                    >
                                        <button type="button" className="cal-month__cell-top" onClick={() => openDayView(day.date)}>
                                            <span>{day.label_short ?? day.date.slice(-2)}</span>
                                            <span className="cal-month__count">{day.appointments.length || ''}</span>
                                        </button>
                                        <div className="cal-month__items">
                                            {preview.map((a) => (
                                                <button
                                                    key={a.id}
                                                    type="button"
                                                    className={cx('cal-month__chip', a.source === 'lead' && 'cal-month__chip--lead')}
                                                    title={`${a.time_label} ${a.patient_name} — ${a.status_label}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCreatingFor(null);
                                                        setEditing(a);
                                                    }}
                                                >
                                                    {a.time_label} {a.patient_name}
                                                </button>
                                            ))}
                                            {more > 0 ? (
                                                <button type="button" className="cal-month__more" onClick={() => openDayView(day.date)}>
                                                    ещё {more}
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="cal-grid-wrap card">
                    <div className="cal-grid" style={{ '--cal-cols': visibleDays.length } as CSSProperties}>
                        <div className="cal-grid__head">
                            <div className="cal-grid__gutter" />
                            {visibleDays.map((day) => (
                                <div key={day.date} className={cx('cal-grid__day-head', day.is_today && 'cal-grid__day-head--today', !day.schedule.is_working && 'cal-grid__day-head--off')}>
                                    <div className="cal-grid__day-head-main">
                                        <span>{day.label}</span>
                                        <span className="cal-grid__day-hours text-xs text-muted">{day.schedule.hours_label}</span>
                                    </div>
                                    <Button type="button" variant="ghost" size="sm" disabled={!day.schedule.is_working} onClick={() => openCreate(day.date)}>
                                        +
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="cal-grid__body">
                            <div className="cal-grid__times" style={{ height: bodyHeight }}>
                                {hourLabels(grid).map((label) => (
                                    <div key={label} className="cal-grid__time" style={{ height: hourBlockPx }}>
                                        {label}
                                    </div>
                                ))}
                            </div>

                            <div className="cal-grid__cols" style={{ gridTemplateColumns: `repeat(${visibleDays.length}, minmax(0, 1fr))` }}>
                                {visibleDays.map((day) => {
                                    const overlays = day.schedule.is_working
                                        ? closedOverlayStyle(grid, day.schedule.open_minutes, day.schedule.close_minutes, bodyHeight)
                                        : { before: { height: bodyHeight }, after: null };

                                    return (
                                        <div
                                            key={day.date}
                                            className={cx('cal-grid__col', day.is_today && 'cal-grid__col--today', !day.schedule.is_working && 'cal-grid__col--closed')}
                                            style={{ height: bodyHeight }}
                                            onClick={(e) => {
                                                if ((e.target as HTMLElement).closest('.cal-grid__event')) {
                                                    return;
                                                }
                                                handleEmptySlotClick(day, e.clientY, e.currentTarget);
                                            }}
                                        >
                                            <div className="cal-grid__lines" aria-hidden style={{ backgroundSize: `100% ${ROW_PX}px` }} />
                                            {overlays.before ? <div className="cal-grid__closed cal-grid__closed--before" style={overlays.before} aria-hidden /> : null}
                                            {overlays.after ? <div className="cal-grid__closed cal-grid__closed--after" style={overlays.after} aria-hidden /> : null}
                                            {!day.schedule.is_working ? <div className="cal-grid__closed-label">Выходной</div> : null}
                                            {day.appointments.map((a) => {
                                                const pos = eventPosition(a.starts_at, a.duration_minutes, grid);
                                                if (!pos) {
                                                    return null;
                                                }
                                                return (
                                                    <button
                                                        key={a.id}
                                                        type="button"
                                                        className={cx(
                                                            'cal-grid__event',
                                                            a.source === 'lead' && 'cal-grid__event--lead',
                                                            a.is_past && 'cal-grid__event--past',
                                                        )}
                                                        style={{ top: pos.top, height: pos.height }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setCreatingFor(null);
                                                            setEditing(a);
                                                        }}
                                                    >
                                                        <span className="cal-grid__event-time">{a.time_label}</span>
                                                        <span className="cal-grid__event-name">{a.patient_name}</span>
                                                        {a.source === 'lead' ? (
                                                            <span className="cal-grid__lead-badge">
                                                                <Badge tone="info">Из заявки</Badge>
                                                            </span>
                                                        ) : null}
                                                        <span className="cal-grid__event-meta text-xs text-muted">
                                                            {[a.service, a.doctor].filter(Boolean).join(' · ')}
                                                        </span>
                                                        <StatusBadge status={a.status} label={a.status_label} />
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Modal open={modalOpen} onClose={closeModal} title={modalTitle} wide>
                <AppointmentForm
                    key={editing ? `edit-${editing.id}` : `create-${creatingFor}-${creatingStartsAt}`}
                    defaults={formDefaults}
                    doctors={doctors}
                    services={services}
                    statuses={statuses}
                    transitions={transitions}
                    durations={durations}
                    appointment={editing}
                    onCancel={closeModal}
                    onSubmit={(data) => {
                        if (editing) {
                            router.put(`/clinic-cabinet/calendar/${editing.id}`, data, { onSuccess: closeModal });
                        } else {
                            router.post('/clinic-cabinet/calendar', data, { onSuccess: closeModal });
                        }
                    }}
                />
            </Modal>

            {total === 0 && !modalOpen ? (
                <EmptyState title="Записей не найдено" text="Переключите период, снимите фильтр по врачу или создайте запись вручную." />
            ) : null}
        </div>
    );
}

function AppointmentForm({
    defaults,
    doctors,
    services,
    statuses,
    transitions,
    durations,
    appointment,
    onCancel,
    onSubmit,
}: {
    defaults: Record<string, string | number>;
    doctors: { id: number; name: string }[];
    services: { id: number; name: string }[];
    statuses: Record<string, string>;
    transitions: Record<string, string[]>;
    durations: number[];
    appointment: Appointment | null;
    onCancel: () => void;
    onSubmit: (data: Record<string, string | number>) => void;
}) {
    const form = useForm(defaults);

    return (
        <form
            className="form-grid"
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit(form.data);
            }}
        >
            <TextField label="Имя пациента" value={String(form.data.patient_name)} onChange={(e) => form.setData('patient_name', e.target.value)} required />
            <PhoneField label="Телефон" value={String(form.data.patient_phone)} onChange={(e) => form.setData('patient_phone', e.target.value)} required />
            <TextField label="Дата и время" type="datetime-local" value={String(form.data.starts_at)} onChange={(e) => form.setData('starts_at', e.target.value)} required />
            <SelectField label="Длительность" value={String(form.data.duration_minutes)} onChange={(e) => form.setData('duration_minutes', Number(e.target.value))}>
                {durations.map((m) => (
                    <option key={m} value={m}>{m} мин</option>
                ))}
            </SelectField>
            <SelectField label="Врач" value={String(form.data.doctor_id)} onChange={(e) => form.setData('doctor_id', e.target.value)}>
                <option value="">Не выбран</option>
                {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                ))}
            </SelectField>
            <SelectField label="Услуга" value={String(form.data.service_id)} onChange={(e) => form.setData('service_id', e.target.value)}>
                <option value="">Не выбрана</option>
                {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </SelectField>
            <SelectField label="Статус" value={String(form.data.status)} onChange={(e) => form.setData('status', e.target.value)}>
                {Object.entries(statuses).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                ))}
            </SelectField>
            <TextArea className="span-2" label="Заметка" value={String(form.data.notes)} maxLength={500} onChange={(e) => form.setData('notes', e.target.value)} />
            {appointment?.history?.length ? (
                <ul className="span-2 text-sm text-muted">
                    {appointment.history.map((h) => (
                        <li key={h.id}>{h.at} · {h.to_label} · {h.actor}{h.comment ? ` — ${h.comment}` : ''}</li>
                    ))}
                </ul>
            ) : null}
            {appointment ? (
                <div className="row row--wrap span-2">
                    {(transitions[appointment.status] ?? []).map((to) => (
                        <Button
                            key={to}
                            type="button"
                            size="sm"
                            variant={to === 'cancelled' || to === 'no_show' ? 'outline' : 'ghost'}
                            onClick={() => router.post(`/clinic-cabinet/calendar/${appointment.id}/status`, { status: to }, { onSuccess: onCancel })}
                        >
                            {statuses[to] ?? to}
                        </Button>
                    ))}
                </div>
            ) : null}
            <div className="row row--wrap">
                <Button type="submit" loading={form.processing}>Сохранить</Button>
                <Button type="button" variant="outline" onClick={onCancel}>Отмена</Button>
            </div>
        </form>
    );
}
