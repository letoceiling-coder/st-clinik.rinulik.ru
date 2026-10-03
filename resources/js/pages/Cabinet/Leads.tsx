import { useForm } from '@inertiajs/react';
import { FilterBar, PageHead, PagerSafe, StatusBadge, Table } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { SelectField, TextArea } from '@/components/ui/Fields';
import { EmptyState } from '@/components/ui/Misc';
import type { Paginated } from '@/lib/types';

interface Lead {
    id: number; name: string; phone: string; status: string; status_label: string;
    service: string | null; doctor: string | null; concern: string | null; comment: string | null;
    is_child: boolean; preferred_date: string | null; preferred_time: string | null;
    clinic_note: string | null; created_at: string | null;
}

export default function Leads({ leads, statuses, filters }: { leads: Paginated<Lead>; statuses: Record<string, string>; filters: { status?: string } }) {
    return (
        <div className="stack-lg">
            <PageHead title="Заявки" text="Не запрашивайте диагнозы и анализы через чат сервиса." />
            <FilterBar>
                <SelectField name="status" label="Статус" defaultValue={filters.status ?? ''}>
                    <option value="">Все</option>
                    {Object.entries(statuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </SelectField>
            </FilterBar>
            {leads.data.length === 0 ? <EmptyState title="Заявок нет" /> : (
                <div className="stack-lg">
                    {leads.data.map((l) => (
                        <LeadRow key={l.id} lead={l} statuses={statuses} />
                    ))}
                </div>
            )}
            <PagerSafe page={leads} />
        </div>
    );
}

function LeadRow({ lead, statuses }: { lead: Lead; statuses: Record<string, string> }) {
    const form = useForm({ status: lead.status, clinic_note: lead.clinic_note ?? '' });
    return (
        <article className="card stack">
            <div className="row row--between">
                <div>
                    <b>{lead.name}</b> · {lead.phone}
                    <div className="text-sm text-muted">{[lead.service, lead.doctor, lead.concern, lead.is_child ? 'ребёнок' : null].filter(Boolean).join(' · ')}</div>
                    <div className="text-xs text-muted">{lead.preferred_date} {lead.preferred_time} · {lead.created_at}</div>
                    {lead.comment ? <p className="text-sm">{lead.comment}</p> : null}
                </div>
                <StatusBadge status={lead.status} />
            </div>
            <form className="form-grid" onSubmit={(e) => { e.preventDefault(); form.put(`/clinic-cabinet/leads/${lead.id}`); }}>
                <SelectField label="Статус" value={form.data.status} onChange={(e) => form.setData('status', e.target.value)}>
                    {Object.entries(statuses).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </SelectField>
                <TextArea className="span-2" label="Заметка клиники" value={form.data.clinic_note} onChange={(e) => form.setData('clinic_note', e.target.value)} />
                <Button type="submit" size="sm" loading={form.processing}>Обновить</Button>
            </form>
        </article>
    );
}
