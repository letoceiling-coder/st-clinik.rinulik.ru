import { FilterBar, PageHead, PagerSafe, StatusBadge, Table } from '@/components/Dash';
import { CitySearchField, SearchInput, SelectField, TextField } from '@/components/ui/Fields';
import type { Paginated } from '@/lib/types';

interface Row {
    id: number;
    starts_at: string | null;
    status: string;
    status_label: string;
    patient_name: string;
    patient_phone: string;
    clinic: string | null;
    city: string | null;
    doctor: string | null;
    source: string;
    user: string | null;
}

export default function Appointments({
    appointments,
    statuses,
    cities,
    clinics,
    filters,
}: {
    appointments: Paginated<Row>;
    statuses: Record<string, string>;
    cities: { id: number; name: string }[];
    clinics: { id: number; name: string }[];
    filters: { q?: string; status?: string; city?: string; clinic?: string; from?: string; to?: string };
}) {
    return (
        <div className="stack-lg">
            <PageHead title="Записи" text={`Найдено: ${appointments.total}. Онлайн-запись и записи из кабинета клиник.`} />
            <FilterBar>
                <SearchInput name="q" defaultValue={filters.q} placeholder="Пациент или телефон" />
                <SelectField name="status" label="Статус" defaultValue={filters.status ?? ''}>
                    <option value="">Все</option>
                    {Object.entries(statuses).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </SelectField>
                <CitySearchField cities={cities} defaultValue={filters.city ?? ''} />
                <SelectField name="clinic" label="Клиника" defaultValue={filters.clinic ?? ''}>
                    <option value="">Все</option>
                    {clinics.map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.name}
                        </option>
                    ))}
                </SelectField>
                <TextField name="from" type="date" label="С" defaultValue={filters.from ?? ''} />
                <TextField name="to" type="date" label="По" defaultValue={filters.to ?? ''} />
            </FilterBar>
            {appointments.data.length === 0 ? (
                <p className="text-muted">Записей не найдено.</p>
            ) : (
                <Table headers={['Дата', 'Пациент', 'Клиника', 'Врач', 'Статус', 'Источник']}>
                    {appointments.data.map((a) => (
                        <tr key={a.id}>
                            <td>{a.starts_at}</td>
                            <td>
                                <b>{a.patient_name}</b>
                                <div className="text-xs text-muted">{a.patient_phone}</div>
                            </td>
                            <td>
                                {a.clinic ?? '—'}
                                <div className="text-xs text-muted">{a.city}</div>
                            </td>
                            <td>{a.doctor ?? '—'}</td>
                            <td>
                                <StatusBadge status={a.status} label={a.status_label} />
                            </td>
                            <td className="text-sm">{a.source}</td>
                        </tr>
                    ))}
                </Table>
            )}
            <PagerSafe page={appointments} />
        </div>
    );
}
