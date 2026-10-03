import { router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { PageHead, StatusBadge } from '@/components/Dash';
import { PhotoArt } from '@/components/PhotoArt';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Fields';
import { EmptyState } from '@/components/ui/Misc';

interface Photo { id: number; kind: string; caption: string | null; status: string; url: string | null; art_seed: number }

export default function Photos({ photos, kinds }: { photos: Photo[]; kinds: Record<string, string> }) {
    const form = useForm({ photo: null as File | null, kind: 'interior', caption: '' });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/clinic-cabinet/photos', { forceFormData: true, onSuccess: () => form.reset('photo', 'caption') });
    };
    return (
        <div className="stack-lg">
            <PageHead title="Фотографии" text="JPG, PNG или WebP до 5 МБ, минимум 600×400. Фото проходят модерацию." />
            <form className="card form-grid" onSubmit={submit}>
                <div className="field">
                    <label className="field__label" htmlFor="photo">Файл</label>
                    <input id="photo" className="input" type="file" accept="image/*" onChange={(e) => form.setData('photo', e.target.files?.[0] ?? null)} />
                    {form.errors.photo ? <p className="field__error">{form.errors.photo}</p> : null}
                </div>
                <SelectField label="Тип" value={form.data.kind} onChange={(e) => form.setData('kind', e.target.value)}>
                    {Object.entries(kinds).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </SelectField>
                <TextField label="Подпись" value={form.data.caption} onChange={(e) => form.setData('caption', e.target.value)} />
                <Button type="submit" loading={form.processing}>Загрузить</Button>
            </form>
            {photos.length === 0 ? <EmptyState title="Фото ещё нет" /> : (
                <div className="photo-grid">
                    {photos.map((p) => (
                        <figure key={p.id} className="card stack">
                            {p.url ? <img className="photo-tile" src={p.url} alt="" /> : <div className="photo-tile"><PhotoArt seed={p.art_seed} kind={p.kind} /></div>}
                            <StatusBadge status={p.status} />
                            <span className="text-sm">{kinds[p.kind] ?? p.kind}{p.caption ? ` · ${p.caption}` : ''}</span>
                            <Button size="sm" variant="ghost" onClick={() => router.delete(`/clinic-cabinet/photos/${p.id}`)}>Удалить</Button>
                        </figure>
                    ))}
                </div>
            )}
        </div>
    );
}
