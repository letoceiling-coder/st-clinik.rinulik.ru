import { FilterBar, PageHead, PagerSafe, Table } from '@/components/Dash';
import { SearchInput } from '@/components/ui/Fields';
import type { Paginated } from '@/lib/types';

interface Log { id: number; action: string; user: string; subject: string | null; meta: unknown; ip: string | null; at: string | null }

export default function Audit({ logs, filters }: { logs: Paginated<Log>; filters: { action?: string } }) {
    return (
        <div className="stack-lg">
            <PageHead title="Журнал аудита" />
            <FilterBar>
                <SearchInput name="action" defaultValue={filters.action} placeholder="Действие, например clinic." />
            </FilterBar>
            <Table headers={['Когда', 'Кто', 'Действие', 'Объект']}>
                {logs.data.map((l) => (
                    <tr key={l.id}>
                        <td>{l.at}</td>
                        <td>{l.user}<div className="text-xs text-muted">{l.ip}</div></td>
                        <td>{l.action}</td>
                        <td>{l.subject ?? '—'}{l.meta ? <div className="text-xs text-muted">{JSON.stringify(l.meta)}</div> : null}</td>
                    </tr>
                ))}
            </Table>
            <PagerSafe page={logs} />
        </div>
    );
}
