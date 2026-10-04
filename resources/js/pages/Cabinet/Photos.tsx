import { router, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import { PageHead, StatusBadge } from '@/components/Dash';
import { PhotoArt } from '@/components/PhotoArt';
import { Button } from '@/components/ui/Button';
import FileDropzone from '@/components/ui/FileDropzone';
import { SelectField, TextField } from '@/components/ui/Fields';
import { EmptyState } from '@/components/ui/Misc';

interface Photo {
    id: number;
    kind: string;
    caption: string | null;
    status: string;
    url: string | null;
    art_seed: number;
}

function PhotoCard({ photo, kinds }: { photo: Photo; kinds: Record<string, string> }) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        kind: photo.kind,
        caption: photo.caption ?? '',
        photo: null as File | null,
    });

    const save = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({ ...data, _method: 'put' })).post(`/clinic-cabinet/photos/${photo.id}`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset('photo');
                setOpen(false);
            },
        });
    };

    return (
        <figure className="photo-card card stack">
            {photo.url ? (
                <img className="photo-tile" src={photo.url} alt={photo.caption ?? kinds[photo.kind] ?? ''} />
            ) : (
                <div className="photo-tile">
                    <PhotoArt seed={photo.art_seed} kind={photo.kind} />
                </div>
            )}
            <div className="photo-card__meta">
                <StatusBadge status={photo.status} />
                <span className="text-sm">
                    {kinds[photo.kind] ?? photo.kind}
                    {photo.caption ? ` · ${photo.caption}` : ''}
                </span>
            </div>
            <div className="photo-card__actions">
                <Button size="sm" variant={open ? 'primary' : 'outline'} type="button" onClick={() => setOpen((v) => !v)}>
                    {open ? 'Свернуть' : 'Редактировать'}
                </Button>
                <Button size="sm" variant="ghost" type="button" onClick={() => router.delete(`/clinic-cabinet/photos/${photo.id}`)}>
                    Удалить
                </Button>
            </div>
            {open ? (
                <form className="photo-card__edit stack" onSubmit={save}>
                    <SelectField
                        label="Тип"
                        value={form.data.kind}
                        onChange={(e) => form.setData('kind', e.target.value)}
                        error={form.errors.kind}
                    >
                        {Object.entries(kinds).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </SelectField>
                    <TextField
                        label="Подпись"
                        value={form.data.caption}
                        maxLength={120}
                        placeholder="Краткое описание фото для каталога"
                        onChange={(e) => form.setData('caption', e.target.value)}
                        error={form.errors.caption}
                        hint={`${form.data.caption.length}/120`}
                    />
                    <FileDropzone
                        label="Заменить файл"
                        hint="Оставьте пустым, если меняете только тип или подпись"
                        accept="image/*"
                        value={form.data.photo}
                        onChange={(file) => form.setData('photo', file)}
                        previewUrl={form.data.photo ? null : photo.url}
                        error={form.errors.photo}
                        compact
                    />
                    <div className="photo-card__edit-actions">
                        <Button type="submit" size="sm" loading={form.processing}>
                            Сохранить
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                form.reset();
                                form.clearErrors();
                                setOpen(false);
                            }}
                        >
                            Отмена
                        </Button>
                    </div>
                </form>
            ) : null}
        </figure>
    );
}

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
                <FileDropzone
                    className="span-2"
                    label="Файл"
                    hint="JPG, PNG или WebP · до 5 МБ · минимум 600×400 px"
                    accept="image/*"
                    value={form.data.photo}
                    onChange={(file) => form.setData('photo', file)}
                    error={form.errors.photo}
                />
                <SelectField label="Тип" value={form.data.kind} onChange={(e) => form.setData('kind', e.target.value)} error={form.errors.kind}>
                    {Object.entries(kinds).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </SelectField>
                <TextField
                    label="Подпись"
                    value={form.data.caption}
                    maxLength={120}
                    placeholder="Например: Ресепшен и зона ожидания"
                    onChange={(e) => form.setData('caption', e.target.value)}
                    error={form.errors.caption}
                    hint={`${form.data.caption.length}/120`}
                />
                <Button type="submit" className="span-2" loading={form.processing} disabled={!form.data.photo}>
                    Загрузить
                </Button>
            </form>
            {photos.length === 0 ? (
                <EmptyState title="Фото ещё нет" />
            ) : (
                <div className="photo-grid photo-grid--manage">
                    {photos.map((p) => (
                        <PhotoCard key={p.id} photo={p} kinds={kinds} />
                    ))}
                </div>
            )}
        </div>
    );
}
