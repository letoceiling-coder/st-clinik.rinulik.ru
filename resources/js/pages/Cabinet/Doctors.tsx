import { Link, router } from '@inertiajs/react';
import { PageHead, StatusBadge, Table } from '@/components/Dash';
import { DoctorArt } from '@/components/PhotoArt';
import { Button, LinkButton } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Misc';

interface Doc {
    id: number; name: string; position: string; experience_years: number; status: string;
    moderation_note: string | null; rating: number; reviews_count: number; specialties: string[]; slug: string;
    art_seed: number; photo_url: string | null;
}

export default function Doctors({ doctors }: { doctors: Doc[] }) {
    return (
        <div className="stack-lg">
            <PageHead title="Врачи" action={<LinkButton href="/clinic-cabinet/doctors/create">Добавить врача</LinkButton>} />
            {doctors.length === 0 ? <EmptyState title="В филиале ещё нет врачей" action={<LinkButton href="/clinic-cabinet/doctors/create">Добавить</LinkButton>} /> : (
                <Table headers={['', 'Врач', 'Стаж', 'Статус', '']}>
                    {doctors.map((d) => (
                        <tr key={d.id}>
                            <td className="doctor-list__photo">
                                <DoctorArt seed={d.art_seed} photoUrl={d.photo_url} name={d.name} />
                            </td>
                            <td>
                                <b>{d.name}</b>
                                <div className="text-xs text-muted">{d.position} · {d.specialties.join(', ')}</div>
                            </td>
                            <td>{d.experience_years} лет</td>
                            <td>
                                <StatusBadge status={d.status} />
                                {d.moderation_note ? <div className="text-xs text-muted">{d.moderation_note}</div> : null}
                            </td>
                            <td className="actions">
                                <Link href={`/clinic-cabinet/doctors/${d.id}/edit`} className="link">Править</Link>
                                <Button size="sm" variant="ghost" onClick={() => confirm('Удалить врача?') && router.delete(`/clinic-cabinet/doctors/${d.id}`)}>Удалить</Button>
                            </td>
                        </tr>
                    ))}
                </Table>
            )}
        </div>
    );
}
