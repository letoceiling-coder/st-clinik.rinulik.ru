import { FilterBar, PageHead, PagerSafe, Table } from '@/components/Dash';
import { SelectField } from '@/components/ui/Fields';
import type { Paginated } from '@/lib/types';

interface Log { id: number; action: string; result: string | null; user: string; subject: string | null; meta: unknown; ip: string | null; at: string | null }

export default function Audit({ logs, sections, filters }: { logs: Paginated<Log>; sections: Record<string, string>; filters: { section?: string } }) {
    return (
        <div className="stack-lg">
            <PageHead title="Журнал аудита" />
            <FilterBar>
                <SelectField name="section" label="Раздел" defaultValue={filters.section ?? ''}>
                    <option value="">Все разделы</option>
                    {Object.entries(sections).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </SelectField>
            </FilterBar>
            <Table headers={['Когда', 'Кто', 'Действие', 'Результат', 'Объект']}>
                {logs.data.map((l) => (
                    <tr key={l.id}>
                        <td>{l.at}</td>
                        <td>{l.user}<div className="text-xs text-muted">{l.ip}</div></td>
                        <td>{l.action}</td>
                        <td>{l.result ?? '—'}</td>
                        <td>
                            {l.subject ?? '—'}
                            {l.meta ? (
                                <details className="text-xs text-muted">
                                    <summary>Подробности</summary>
                                    <code style={{ overflowWrap: 'anywhere' }}>{JSON.stringify(l.meta)}</code>
                                </details>
                            ) : null}
                        </td>
                    </tr>
                ))}
            </Table>
            <PagerSafe page={logs} />
        </div>
    );
}
