import { Link } from '@inertiajs/react';
import { FilterBar, PageHead, PagerSafe, STATUS, StatusBadge, Table } from '@/components/Dash';
import { LinkButton } from '@/components/ui/Button';
import { CitySearchField, SearchInput, SelectField } from '@/components/ui/Fields';
import type { Paginated } from '@/lib/types';

interface Clinic {
    id: number;
    name: string;
    slug: string;
    city: string | null;
    organization: string | null;
    address: string;
    status: string;
    is_verified: boolean;
    rating: number;
    reviews_count: number;
    completeness: number;
}

export default function Clinics({
    clinics,
    cities,
    statuses,
    filters,
}: {
    clinics: Paginated<Clinic>;
    cities: { id: number; name: string }[];
    statuses: string[];
    filters: { q?: string; status?: string; city?: string };
}) {
    return (
        <div className="stack-lg">
            <PageHead title="Клиники" text={`Найдено: ${clinics.total}`} />
            <FilterBar>
                <SearchInput name="q" defaultValue={filters.q} placeholder="Название или адрес" />
                <SelectField name="status" label="Статус" defaultValue={filters.status ?? ''}>
                    <option value="">Все</option>
                    {statuses.map((s) => (
                        <option key={s} value={s}>
                            {STATUS[s]?.label ?? s}
                        </option>
                    ))}
                </SelectField>
                <CitySearchField cities={cities} defaultValue={filters.city ?? ''} />
            </FilterBar>
            {clinics.data.length === 0 ? (
                <p className="text-muted">Клиники не найдены. Измените фильтры или поисковый запрос.</p>
            ) : (
                <Table headers={['Клиника', 'Город', 'Организация', 'Статус', 'Рейтинг', 'Профиль', '']}>
                    {clinics.data.map((c) => (
                        <tr key={c.id}>
                            <td>
                                <b>{c.name}</b>
                                <div className="text-xs text-muted">{c.address}</div>
                            </td>
                            <td>{c.city ?? '—'}</td>
                            <td className="text-sm">{c.organization ?? '—'}</td>
                            <td>
                                <StatusBadge status={c.status} />
                                {c.is_verified ? <span className="text-xs text-muted"> · проверена</span> : null}
                            </td>
                            <td>
                                {c.rating > 0 ? c.rating.toFixed(1) : '—'}
                                <div className="text-xs text-muted">{c.reviews_count} отз.</div>
                            </td>
                            <td>{c.completeness}%</td>
                            <td>
                                <LinkButton href={`/admin/clinics/${c.id}`} size="sm" variant="outline">
                                    Открыть
                                </LinkButton>
                            </td>
                        </tr>
                    ))}
                </Table>
            )}
            <PagerSafe page={clinics} />
        </div>
    );
}
