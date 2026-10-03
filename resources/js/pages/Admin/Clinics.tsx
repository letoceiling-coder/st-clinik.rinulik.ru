import { Link, router, useForm } from '@inertiajs/react';
import { FilterBar, PageHead, PagerSafe, StatusBadge, Table } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check, SearchInput, SelectField, TextArea, TextField } from '@/components/ui/Fields';
import type { Paginated } from '@/lib/types';

interface Clinic {
    id: number; name: string; slug: string; city: string | null; organization: string | null; address: string;
    status: string; is_verified: boolean; rating: number; reviews_count: number; completeness: number;
    moderation_note: string | null; seo_title: string | null; seo_description: string | null;
}

export default function Clinics({ clinics, cities, statuses, filters }: { clinics: Paginated<Clinic>; cities: { id: number; name: string }[]; statuses: string[]; filters: { q?: string; status?: string; city?: string } }) {
    return (
        <div className="stack-lg">
            <PageHead title="Клиники" />
            <FilterBar>
                <SearchInput name="q" defaultValue={filters.q} placeholder="Название или адрес" />
                <SelectField name="status" label="Статус" defaultValue={filters.status ?? ''}>
                    <option value="">Все</option>
                    {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </SelectField>
                <SelectField name="city" label="Город" defaultValue={filters.city ?? ''}>
                    <option value="">Все города</option>
                    {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectField>
            </FilterBar>
            {clinics.data.map((c) => <ClinicRow key={c.id} clinic={c} statuses={statuses} />)}
            <PagerSafe page={clinics} />
        </div>
    );
}

function ClinicRow({ clinic, statuses }: { clinic: Clinic; statuses: string[] }) {
    const form = useForm({
        status: clinic.status,
        is_verified: clinic.is_verified,
        moderation_note: clinic.moderation_note ?? '',
        seo_title: clinic.seo_title ?? '',
        seo_description: clinic.seo_description ?? '',
    });
    return (
        <article className="card stack">
            <div className="row row--between">
                <div>
                    <Link href={`/clinics/${clinic.slug}`} className="link">{clinic.name}</Link>
                    <div className="text-xs text-muted">{clinic.city} · {clinic.address} · профиль {clinic.completeness}%</div>
                </div>
                <StatusBadge status={clinic.status} />
            </div>
            <form className="form-grid" onSubmit={(e) => { e.preventDefault(); form.put(`/admin/clinics/${clinic.id}`); }}>
                <SelectField label="Статус" value={form.data.status} onChange={(e) => form.setData('status', e.target.value)}>
                    {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </SelectField>
                <Check label="Проверена" checked={form.data.is_verified} onChange={(e) => form.setData('is_verified', e.target.checked)} />
                <TextField className="span-2" label="SEO title" value={form.data.seo_title} onChange={(e) => form.setData('seo_title', e.target.value)} />
                <TextArea className="span-2" label="SEO description / заметка" value={form.data.seo_description} onChange={(e) => form.setData('seo_description', e.target.value)} />
                <TextArea className="span-2" label="Заметка модерации" value={form.data.moderation_note} onChange={(e) => form.setData('moderation_note', e.target.value)} />
                <Button type="submit" size="sm" loading={form.processing}>Сохранить</Button>
                <Button type="button" size="sm" variant="danger" onClick={() => confirm('Удалить клинику?') && router.delete(`/admin/clinics/${clinic.id}`)}>Удалить</Button>
            </form>
        </article>
    );
}
