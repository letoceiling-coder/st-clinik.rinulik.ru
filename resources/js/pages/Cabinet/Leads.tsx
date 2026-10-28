import { router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { PageHead, PagerSafe, StatusBadge } from '@/components/Dash';
import Icon from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { SelectField, TextArea, TextField } from '@/components/ui/Fields';
import { EmptyState, Tabs } from '@/components/ui/Misc';
import { cx } from '@/lib/format';
import type { Paginated } from '@/lib/types';

interface Lead {
    id: number;
    name: string;
    phone: string;
    status: string;
    status_label: string;
    service: string | null;
    doctor: string | null;
    concern: string | null;
    comment: string | null;
    is_child: boolean;
    preferred_date: string | null;
    preferred_time: string | null;
    clinic_note: string | null;
    created_at: string | null;
    created_at_iso: string | null;
    first_response_at: string | null;
    response_minutes: number | null;
    assigned_to: number | null;
    assignee: string | null;
    callback_at: string | null;
    callback_overdue: boolean;
    cancel_reason: string | null;
    source: string;
    has_appointment?: boolean;
    assistant_broadcast?: boolean;
    can_take_in_work?: boolean;
    taken_by_other_clinic?: boolean;
}

type Tab = 'active' | 'booked' | 'closed' | 'all';

interface Props {
    leads: Paginated<Lead>;
    statuses: Record<string, string>;
    cancelReasons: Record<string, string>;
    staff: { id: number; name: string }[];
    tabs: Record<Tab, number>;
    tab: Tab;
    response: { median_minutes: number | null; median_label: string | null; answered_percent: number | null; sample: number; waiting: number; reliable: boolean };
    filters: { status?: string; mine?: string };
}

/** Через сколько минут без ответа заявка считается «горящей». */
const URGENT_AFTER_MIN = 15;

function minutesSince(iso: string | null, now: number): number {
    return iso ? Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000)) : 0;
}

function duration(minutes: number): string {
    if (minutes < 60) return `${Math.max(1, minutes)} мин`;
    if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} ч ${minutes % 60 ? `${minutes % 60} мин` : ''}`.trim();
    return `${Math.floor(minutes / 1440)} дн`;
}

/** Текущее время, обновляемое раз в 30 секунд, — для живых таймеров ожидания. */
function useNow(): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 30000);
        return () => window.clearInterval(timer);
    }, []);
    return now;
}

export default function Leads({ leads, statuses, cancelReasons, staff, tabs, tab, response, filters }: Props) {
    const now = useNow();
    const visit = (params: Record<string, string | undefined>) =>
        router.get('/clinic-cabinet/leads', Object.fromEntries(Object.entries({ tab, mine: filters.mine, ...params }).filter(([, v]) => v)), { preserveState: true, preserveScroll: true });

    const speedTone = response.median_minutes === null ? 'muted' : response.median_minutes <= 15 ? 'good' : response.median_minutes <= 60 ? 'warn' : 'bad';

    return (
        <div className="stack-lg">
            <PageHead title="Заявки" text="Перезванивайте как можно быстрее: пациент, которому ответили за 15 минут, записывается в разы чаще." />

            <section className={cx('card leads-speed', `leads-speed--${speedTone}`)}>
                <div className="leads-speed__main">
                    <span className="leads-speed__label">Среднее время ответа за 30 дней</span>
                    <b className="leads-speed__value">{response.median_label ?? 'нет данных'}</b>
                </div>
                <dl className="leads-speed__facts">
                    <div>
                        <dt>Ждут ответа</dt>
                        <dd className={cx(response.waiting > 0 && 'is-alert')}>{response.waiting}</dd>
                    </div>
                    <div>
                        <dt>Отвечено</dt>
                        <dd>{response.answered_percent !== null ? `${response.answered_percent}%` : '—'}</dd>
                    </div>
                    <div>
                        <dt>Заявок</dt>
                        <dd>{response.sample}</dd>
                    </div>
                </dl>
                <p className="leads-speed__hint text-xs">
                    {response.reliable
                        ? 'Показатель виден пациентам на странице клиники — быстрый ответ повышает доверие.'
                        : 'Когда наберётся не меньше 3 отвеченных заявок, скорость ответа появится на странице клиники.'}
                </p>
            </section>

            <div className="leads-toolbar">
                <Tabs<Tab>
                    label="Заявки"
                    value={tab}
                    onChange={(key) => visit({ tab: key, status: undefined })}
                    items={[
                        { key: 'active', label: 'Требуют действий', count: tabs.active },
                        { key: 'booked', label: 'Записаны', count: tabs.booked },
                        { key: 'closed', label: 'Закрытые', count: tabs.closed },
                        { key: 'all', label: 'Все', count: tabs.all },
                    ]}
                />
                <label className="leads-mine">
                    <input type="checkbox" checked={filters.mine === '1'} onChange={(e) => visit({ mine: e.target.checked ? '1' : undefined })} />
                    Только мои
                </label>
            </div>

            {leads.data.length === 0 ? (
                <EmptyState title={tab === 'active' ? 'Все заявки обработаны' : 'Заявок нет'} text={tab === 'active' ? 'Новые заявки появятся здесь, а уведомление придёт в кабинет и выбранные каналы.' : undefined} />
            ) : (
                <div className="stack">
                    {leads.data.map((l) => (
                        <LeadCard key={l.id} lead={l} statuses={statuses} cancelReasons={cancelReasons} staff={staff} now={now} />
                    ))}
                </div>
            )}
            <PagerSafe page={leads} />
        </div>
    );
}

function LeadCard({ lead, statuses, cancelReasons, staff, now }: { lead: Lead; statuses: Record<string, string>; cancelReasons: Record<string, string>; staff: { id: number; name: string }[]; now: number }) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        status: lead.status,
        clinic_note: lead.clinic_note ?? '',
        assigned_to: lead.assigned_to ? String(lead.assigned_to) : '',
        callback_at: lead.callback_at ?? '',
        cancel_reason: lead.cancel_reason ?? '',
    });

    const waiting = lead.status === 'new' ? minutesSince(lead.created_at_iso, now) : null;
    const urgent = waiting !== null && waiting >= URGENT_AFTER_MIN;

    const quick = (changes: Partial<typeof form.data>) => {
        router.put(
            `/clinic-cabinet/leads/${lead.id}`,
            { ...form.data, assigned_to: form.data.assigned_to || null, callback_at: form.data.callback_at || null, cancel_reason: form.data.cancel_reason || null, ...changes },
            { preserveScroll: true },
        );
    };
    const inHour = () => {
        const d = new Date(Date.now() + 60 * 60 * 1000);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    return (
        <article className={cx('card lead-card', urgent && 'lead-card--urgent', lead.status === 'new' && 'lead-card--new')}>
            <div className="lead-card__head">
                <div className="lead-card__who">
                    <b>{lead.name}</b>
                    <span className="text-sm text-muted">{[lead.service, lead.doctor, lead.concern, lead.is_child ? 'ребёнок' : null].filter(Boolean).join(' · ') || 'Без уточнения услуги'}</span>
                </div>
                <div className="lead-card__state">
                    <StatusBadge status={lead.status} label={lead.status_label} />
                    {waiting !== null ? (
                        <span className={cx('lead-timer', urgent && 'is-urgent')}>
                            <Icon name="clock" size={14} /> ждёт {duration(waiting)}
                        </span>
                    ) : lead.response_minutes !== null ? (
                        <span className="text-xs text-muted">ответили за {duration(lead.response_minutes)}</span>
                    ) : null}
                </div>
            </div>

            <div className="lead-card__meta text-sm">
                {lead.preferred_date ? (
                    <span>
                        <Icon name="calendar" size={14} /> Хочет: {lead.preferred_date} {lead.preferred_time ?? ''}
                    </span>
                ) : null}
                {lead.callback_at ? (
                    <span className={cx(lead.callback_overdue && 'is-alert')}>
                        <Icon name="phone" size={14} /> Перезвонить: {lead.callback_at.replace('T', ' ')}
                        {lead.callback_overdue ? ' — просрочено' : ''}
                    </span>
                ) : null}
                {lead.assignee ? (
                    <span>
                        <Icon name="user" size={14} /> {lead.assignee}
                    </span>
                ) : null}
                <span className="text-muted">Получена {lead.created_at}</span>
            </div>

            {lead.comment ? <p className="lead-card__comment text-sm">«{lead.comment}»</p> : null}
            {lead.assistant_broadcast ? <p className="text-xs text-muted">Заявка от AI-ассистента · отправлена нескольким клиникам города — кто первым возьмёт в работу, того и пациент.</p> : null}
            {lead.taken_by_other_clinic ? <p className="text-xs text-muted">Пациента уже взяла в работу другая клиника.</p> : null}

            <div className="lead-card__actions">
                <a className="btn btn--primary btn--sm" href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`}>
                    <Icon name="phone" size={16} /> {lead.phone}
                </a>
                {lead.can_take_in_work ? (
                    <Button size="sm" onClick={() => router.post(`/clinic-cabinet/leads/${lead.id}/accept`, {}, { preserveScroll: true })}>
                        Беру в работу
                    </Button>
                ) : null}
                {['new', 'no_answer'].includes(lead.status) ? (
                    <Button size="sm" variant="outline" onClick={() => quick({ status: 'contacted', callback_at: '' })}>
                        Связались
                    </Button>
                ) : null}
                {['new', 'contacted', 'no_answer'].includes(lead.status) ? (
                    <Button size="sm" variant="outline" onClick={() => quick({ status: 'no_answer', callback_at: inHour() })}>
                        Не дозвонились · через час
                    </Button>
                ) : null}
                {lead.preferred_date && !lead.has_appointment && ['new', 'contacted', 'no_answer', 'confirmed'].includes(lead.status) ? (
                    <Button size="sm" variant="outline" onClick={() => router.post(`/clinic-cabinet/leads/${lead.id}/appointment`)}>
                        Записать в календарь
                    </Button>
                ) : ['new', 'contacted', 'no_answer'].includes(lead.status) ? (
                    <Button size="sm" variant="outline" onClick={() => quick({ status: 'confirmed', callback_at: '' })}>
                        Записан
                    </Button>
                ) : null}
                {lead.has_appointment ? (
                    <a className="btn btn--ghost btn--sm" href="/clinic-cabinet/calendar">
                        Открыть в календаре
                    </a>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
                    {open ? 'Скрыть' : 'Подробнее'}
                </Button>
            </div>

            {open ? (
                <form
                    className="form-grid lead-card__form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.transform((d) => ({ ...d, assigned_to: d.assigned_to || null, callback_at: d.callback_at || null, cancel_reason: d.cancel_reason || null }));
                        form.put(`/clinic-cabinet/leads/${lead.id}`, { preserveScroll: true });
                    }}
                >
                    <SelectField label="Статус" value={form.data.status} onChange={(e) => form.setData('status', e.target.value)} error={form.errors.status}>
                        {Object.entries(statuses).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </SelectField>
                    <SelectField label="Ответственный" value={form.data.assigned_to} onChange={(e) => form.setData('assigned_to', e.target.value)} error={form.errors.assigned_to}>
                        <option value="">Не назначен</option>
                        {staff.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </SelectField>
                    {['new', 'contacted', 'no_answer'].includes(form.data.status) ? (
                        <TextField label="Перезвонить" type="datetime-local" value={form.data.callback_at} onChange={(e) => form.setData('callback_at', e.target.value)} error={form.errors.callback_at} />
                    ) : null}
                    {form.data.status === 'cancelled' ? (
                        <SelectField label="Причина отказа" value={form.data.cancel_reason} onChange={(e) => form.setData('cancel_reason', e.target.value)} error={form.errors.cancel_reason}>
                            <option value="">Не указана</option>
                            {Object.entries(cancelReasons).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {v}
                                </option>
                            ))}
                        </SelectField>
                    ) : null}
                    <TextArea className="span-2" label="Заметка клиники" hint="Видна только сотрудникам клиники." maxLength={500} value={form.data.clinic_note} onChange={(e) => form.setData('clinic_note', e.target.value)} />
                    <div className="span-2">
                        <Button type="submit" size="sm" loading={form.processing}>
                            Сохранить
                        </Button>
                    </div>
                </form>
            ) : null}
        </article>
    );
}
