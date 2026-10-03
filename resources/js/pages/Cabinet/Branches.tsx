import { Link, router } from '@inertiajs/react';
import { PageHead, StatusBadge, Table } from '@/components/Dash';
import { Button, LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Misc';

interface Branch {
    id: number; name: string; slug: string; address: string; status: string; moderation_note: string | null;
    completeness: number; rating: number; reviews_count: number; city: string | null;
}

export default function Branches({ branches }: { branches: Branch[] }) {
    return (
        <div className="stack-lg">
            <PageHead title="Филиалы" action={<LinkButton href="/clinic-cabinet/branches/create">Новый филиал</LinkButton>} />
            {branches.length === 0 ? (
                <EmptyState title="Добавьте первый филиал" action={<LinkButton href="/clinic-cabinet/branches/create">Создать</LinkButton>} />
            ) : (
                <Table headers={['Филиал', 'Город', 'Статус', 'Профиль', '']}>
                    {branches.map((b) => (
                        <tr key={b.id}>
                            <td>
                                <b>{b.name}</b>
                                <div className="text-xs text-muted">{b.address}</div>
                                {b.moderation_note ? <div className="text-xs text-muted">{b.moderation_note}</div> : null}
                            </td>
                            <td>{b.city}</td>
                            <td><StatusBadge status={b.status} /></td>
                            <td>{b.completeness}%</td>
                            <td className="actions">
                                <Link href={`/clinic-cabinet/branches/${b.id}/edit`} className="link">Править</Link>
                                {['draft', 'rejected'].includes(b.status) ? (
                                    <Button size="sm" variant="ghost" onClick={() => router.post(`/clinic-cabinet/branches/${b.id}/submit`)}>На модерацию</Button>
                                ) : null}
                            </td>
                        </tr>
                    ))}
                </Table>
            )}
        </div>
    );
}
