import { Link, router } from '@inertiajs/react';
import { FilterBar, PageHead, PagerSafe, StatusBadge, Table } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { SelectField } from '@/components/ui/Fields';
import { EmptyState } from '@/components/ui/Misc';
import type { Paginated } from '@/lib/types';

interface Lead {
    id: number;
    status: string;
    status_label: string;
    clinic: { name: string; slug: string; address: string; phone: string | null } | null;
    doctor: { name: string; slug: string } | null;
    service: string | null;
    preferred_date: string | null;
    preferred_time: string | null;
    created_at: string | null;
    can_cancel: boolean;
    can_review: boolean;
}

export default function Leads({ leads, statuses, filters }: { leads: Paginated<Lead>; statuses: Record<string, string>; filters: { status?: string } }) {
    return (
        <div className="stack-lg">
            <PageHead title="Заявки и записи" text="Статус обновляет клиника. Мы не храним диагнозы и меддокументы." />
            <FilterBar>
                <SelectField name="status" label="Статус" defaultValue={filters.status ?? ''}>
                    <option value="">Все</option>
                    {Object.entries(statuses).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                    ))}
                </SelectField>
            </FilterBar>
            {leads.data.length === 0 ? (
                <EmptyState title="Заявок нет" text="Отправьте заявку со страницы клиники или врача." />
            ) : (
                <Table headers={['Клиника', 'Когда', 'Статус', '']}>
                    {leads.data.map((l) => (
                        <tr key={l.id}>
                            <td>
                                {l.clinic ? <Link href={`/clinics/${l.clinic.slug}`} className="link">{l.clinic.name}</Link> : '—'}
                                <div className="text-xs text-muted">{l.doctor?.name ?? l.service ?? l.clinic?.address}</div>
                            </td>
                            <td>{[l.preferred_date, l.preferred_time].filter(Boolean).join(' ') || l.created_at}</td>
                            <td><StatusBadge status={l.status} /></td>
                            <td className="actions">
                                {l.can_cancel ? (
                                    <Button size="sm" variant="ghost" onClick={() => router.post(`/account/leads/${l.id}/cancel`)}>Отменить</Button>
                                ) : null}
                                {l.can_review && l.clinic ? <Link href={`/clinics/${l.clinic.slug}#reviews`} className="link text-sm">Отзыв</Link> : null}
                            </td>
                        </tr>
                    ))}
                </Table>
            )}
            <PagerSafe page={leads} />
        </div>
    );
}
