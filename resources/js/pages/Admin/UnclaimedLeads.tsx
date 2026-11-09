import { router } from '@inertiajs/react';
import { useState } from 'react';
import { FilterBar, PageHead, PagerSafe, StatusBadge, Table } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { CitySearchField, SearchInput, SelectField } from '@/components/ui/Fields';
import { Alert } from '@/components/ui/Misc';
import { phoneHref } from '@/lib/format';
import type { Paginated } from '@/lib/types';

interface Row {
    id: number;
    created_at: string | null;
    status: string;
    status_label: string;
    name: string;
    phone: string;
    preferred: string | null;
    service: string | null;
    comment: string | null;
    note: string | null;
    clinic: { name: string; slug: string; phone: string | null; city: string | null } | null;
}

function LeadActions({ lead, statuses }: { lead: Row; statuses: Record<string, string> }) {
    const [status, setStatus] = useState(lead.status);
    const [note, setNote] = useState(lead.note ?? '');
    const [saving, setSaving] = useState(false);
    const dirty = status !== lead.status || note !== (lead.note ?? '');

    return (
        <div className="stack">
            <select className="select select--sm" aria-label="Статус заявки" value={status} onChange={(e) => setStatus(e.target.value)}>
                {Object.entries(statuses).map(([k, v]) => (
                    <option key={k} value={k}>
                        {v}
                    </option>
                ))}
            </select>
            <input className="input input--sm" aria-label="Заметка" placeholder="Заметка: с кем говорили, что решили" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            <Button
                size="sm"
                variant="outline"
                disabled={!dirty}
                loading={saving}
                onClick={() =>
                    router.put(`/admin/leads/unclaimed/${lead.id}`, { status, note }, { preserveScroll: true, onStart: () => setSaving(true), onFinish: () => setSaving(false) })
                }
            >
                Сохранить
            </Button>
        </div>
    );
}

export default function UnclaimedLeads({
    leads,
    statuses,
    active_count,
    cities,
    filters,
}: {
    leads: Paginated<Row>;
    statuses: Record<string, string>;
    active_count: number;
    cities: { id: number; name: string }[];
    filters: { q?: string; status?: string; city?: string };
}) {
    return (
        <div className="stack-lg">
            <PageHead title="Заявки без владельца" text={`В работе: ${active_count}. Пациенты оставили заявки в клиники, у которых ещё нет кабинета.`} />
            <Alert tone="info" icon="info">
                Позвоните в клинику по номеру из карточки и передайте заявку, затем перезвоните пациенту. Это хороший повод предложить клинике забрать карточку: заявки сразу появятся у неё в кабинете.
            </Alert>
            <FilterBar>
                <SearchInput name="q" defaultValue={filters.q} placeholder="Пациент, телефон или клиника" />
                <SelectField name="status" label="Статус" defaultValue={filters.status ?? 'active'}>
                    <option value="active">В работе</option>
                    <option value="all">Все</option>
                    {Object.entries(statuses).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </SelectField>
                <CitySearchField cities={cities} defaultValue={filters.city ?? ''} />
            </FilterBar>
            {leads.data.length === 0 ? (
                <p className="text-muted">Заявок не найдено.</p>
            ) : (
                <Table headers={['Дата', 'Пациент', 'Клиника', 'Запрос', 'Статус', 'Действия']}>
                    {leads.data.map((lead) => (
                        <tr key={lead.id}>
                            <td>{lead.created_at}</td>
                            <td>
                                <b>{lead.name}</b>
                                <div>
                                    <a className="link" href={phoneHref(lead.phone)}>
                                        {lead.phone}
                                    </a>
                                </div>
                            </td>
                            <td>
                                {lead.clinic ? (
                                    <>
                                        <a className="link" href={`/clinics/${lead.clinic.slug}`} target="_blank" rel="noopener">
                                            {lead.clinic.name}
                                        </a>
                                        <div className="text-xs text-muted">{lead.clinic.city}</div>
                                        {lead.clinic.phone ? (
                                            <a className="text-xs link" href={phoneHref(lead.clinic.phone)}>
                                                {lead.clinic.phone}
                                            </a>
                                        ) : null}
                                    </>
                                ) : (
                                    '—'
                                )}
                            </td>
                            <td className="text-sm">
                                {lead.service ?? 'Консультация'}
                                {lead.preferred ? <div className="text-xs text-muted">Удобно: {lead.preferred}</div> : null}
                                {lead.comment ? <div className="text-xs text-muted">{lead.comment}</div> : null}
                            </td>
                            <td>
                                <StatusBadge status={lead.status} label={lead.status_label} />
                            </td>
                            <td>
                                <LeadActions lead={lead} statuses={statuses} />
                            </td>
                        </tr>
                    ))}
                </Table>
            )}
            <PagerSafe page={leads} />
        </div>
    );
}
