import { Link, useForm } from '@inertiajs/react';
import { FilterBar, PageHead, PagerSafe, StatusBadge } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check, SearchInput, SelectField, TextArea } from '@/components/ui/Fields';
import type { Paginated } from '@/lib/types';

interface Doc { id: number; name: string; slug: string; position: string; clinic: string | null; status: string; is_verified: boolean; rating: number; moderation_note: string | null }

export default function Doctors({ doctors, statuses, filters }: { doctors: Paginated<Doc>; statuses: string[]; filters: { q?: string; status?: string } }) {
    return (
        <div className="stack-lg">
            <PageHead title="Врачи" />
            <FilterBar>
                <SearchInput name="q" defaultValue={filters.q} placeholder="ФИО" />
                <SelectField name="status" label="Статус" defaultValue={filters.status ?? ''}>
                    <option value="">Все</option>
                    {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </SelectField>
            </FilterBar>
            {doctors.data.map((d) => <Row key={d.id} doctor={d} statuses={statuses} />)}
            <PagerSafe page={doctors} />
        </div>
    );
}

function Row({ doctor, statuses }: { doctor: Doc; statuses: string[] }) {
    const form = useForm({ status: doctor.status, is_verified: doctor.is_verified, moderation_note: doctor.moderation_note ?? '' });
    return (
        <article className="card stack">
            <div className="row row--between">
                <div>
                    <Link href={`/doctors/${doctor.slug}`} className="link">{doctor.name}</Link>
                    <div className="text-xs text-muted">{doctor.position} · {doctor.clinic}</div>
                </div>
                <StatusBadge status={doctor.status} />
            </div>
            <form className="form-grid" onSubmit={(e) => { e.preventDefault(); form.put(`/admin/doctors/${doctor.id}`); }}>
                <SelectField label="Статус" value={form.data.status} onChange={(e) => form.setData('status', e.target.value)}>
                    {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </SelectField>
                <Check label="Проверен" checked={form.data.is_verified} onChange={(e) => form.setData('is_verified', e.target.checked)} />
                <TextArea className="span-2" label="Заметка" value={form.data.moderation_note} onChange={(e) => form.setData('moderation_note', e.target.value)} />
                <Button type="submit" size="sm" loading={form.processing}>Сохранить</Button>
            </form>
        </article>
    );
}
