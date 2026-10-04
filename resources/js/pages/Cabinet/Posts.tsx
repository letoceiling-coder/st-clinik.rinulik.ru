import { router, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import { PageHead, StatusBadge } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import FileDropzone from '@/components/ui/FileDropzone';
import { Check, SelectField, TextArea, TextField } from '@/components/ui/Fields';
import { Badge, EmptyState } from '@/components/ui/Misc';

interface Post {
    id: number;
    type: string;
    title: string;
    slug: string;
    excerpt: string | null;
    body: string;
    starts_at: string | null;
    ends_at: string | null;
    is_pinned: boolean;
    status: string;
    image_url: string | null;
    published_at: string | null;
}

function PostCard({ post, types }: { post: Post; types: Record<string, string> }) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        type: post.type,
        title: post.title,
        excerpt: post.excerpt ?? '',
        body: post.body,
        starts_at: post.starts_at ?? '',
        ends_at: post.ends_at ?? '',
        is_pinned: post.is_pinned,
        image: null as File | null,
        remove_image: false,
    });

    const save = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({ ...data, _method: 'put' })).post(`/clinic-cabinet/posts/${post.id}`, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset('image');
                form.setData('remove_image', false);
                setOpen(false);
            },
        });
    };

    return (
        <article className="post-card card stack">
            {post.image_url ? <img className="post-card__image" src={post.image_url} alt="" /> : null}
            <div className="row row--wrap" style={{ gap: 8 }}>
                <Badge tone={post.type === 'promo' ? 'warning' : 'primary'}>{types[post.type] ?? post.type}</Badge>
                {post.is_pinned ? <Badge tone="success">Закреплено</Badge> : null}
                <StatusBadge status={post.status} />
            </div>
            <h3 className="post-card__title">{post.title}</h3>
            {post.excerpt ? <p className="text-sm text-muted">{post.excerpt}</p> : null}
            <p className="text-xs text-muted">{post.published_at}{post.ends_at ? ` · до ${post.ends_at.split('-').reverse().join('.')}` : ''}</p>
            <div className="photo-card__actions">
                <Button size="sm" variant={open ? 'primary' : 'outline'} type="button" onClick={() => setOpen((v) => !v)}>
                    {open ? 'Свернуть' : 'Редактировать'}
                </Button>
                <Button size="sm" variant="ghost" type="button" onClick={() => router.delete(`/clinic-cabinet/posts/${post.id}`)}>
                    Удалить
                </Button>
            </div>
            {open ? (
                <form className="photo-card__edit stack" onSubmit={save}>
                    <SelectField label="Тип" value={form.data.type} onChange={(e) => form.setData('type', e.target.value)} error={form.errors.type}>
                        {Object.entries(types).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </SelectField>
                    <TextField label="Заголовок" required value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} />
                    <TextField label="Краткое описание" value={form.data.excerpt} maxLength={400} onChange={(e) => form.setData('excerpt', e.target.value)} error={form.errors.excerpt} hint={`${form.data.excerpt.length}/400`} />
                    <TextArea label="Текст" required rows={6} value={form.data.body} onChange={(e) => form.setData('body', e.target.value)} error={form.errors.body} />
                    <div className="form-grid">
                        <TextField label="Публикация с" type="date" value={form.data.starts_at} onChange={(e) => form.setData('starts_at', e.target.value)} error={form.errors.starts_at} />
                        <TextField label="Действует до" type="date" value={form.data.ends_at} onChange={(e) => form.setData('ends_at', e.target.value)} error={form.errors.ends_at} hint="Для акций — дата окончания" />
                    </div>
                    <Check label="Закрепить вверху списка" checked={form.data.is_pinned} onChange={(e) => form.setData('is_pinned', e.target.checked)} />
                    <FileDropzone
                        label="Обложка"
                        hint="JPG, PNG или WebP до 5 МБ"
                        accept="image/*"
                        value={form.data.image}
                        onChange={(file) => {
                            form.setData('image', file);
                            if (file) {
                                form.setData('remove_image', false);
                            }
                        }}
                        previewUrl={form.data.image || form.data.remove_image ? null : post.image_url}
                        error={form.errors.image}
                        compact
                    />
                    {post.image_url && !form.data.image ? (
                        <Check label="Удалить текущую обложку" checked={form.data.remove_image} onChange={(e) => form.setData('remove_image', e.target.checked)} />
                    ) : null}
                    <div className="photo-card__edit-actions">
                        <Button type="submit" size="sm" loading={form.processing}>
                            Сохранить
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={() => { form.reset(); form.clearErrors(); setOpen(false); }}>
                            Отмена
                        </Button>
                    </div>
                </form>
            ) : null}
        </article>
    );
}

export default function Posts({ posts, types }: { posts: Post[]; types: Record<string, string> }) {
    const form = useForm({
        type: 'news',
        title: '',
        excerpt: '',
        body: '',
        starts_at: '',
        ends_at: '',
        is_pinned: false,
        image: null as File | null,
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/clinic-cabinet/posts', {
            forceFormData: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <div className="stack-lg">
            <PageHead title="Новости и акции" text="Публикуйте новости клиники, акции и полезную информацию для пациентов. Материалы отображаются на странице клиники на сайте." />
            <form className="card stack" onSubmit={submit}>
                <div className="form-grid">
                    <SelectField label="Тип" value={form.data.type} onChange={(e) => form.setData('type', e.target.value)} error={form.errors.type}>
                        {Object.entries(types).map(([k, v]) => (
                            <option key={k} value={k}>
                                {v}
                            </option>
                        ))}
                    </SelectField>
                    <TextField label="Заголовок" required value={form.data.title} onChange={(e) => form.setData('title', e.target.value)} error={form.errors.title} />
                    <TextField className="span-2" label="Краткое описание" value={form.data.excerpt} maxLength={400} onChange={(e) => form.setData('excerpt', e.target.value)} error={form.errors.excerpt} hint={`${form.data.excerpt.length}/400 · показывается в карточке на сайте`} />
                    <div className="span-2">
                        <TextArea label="Текст" required rows={6} value={form.data.body} onChange={(e) => form.setData('body', e.target.value)} error={form.errors.body} />
                    </div>
                    <TextField label="Публикация с" type="date" value={form.data.starts_at} onChange={(e) => form.setData('starts_at', e.target.value)} error={form.errors.starts_at} />
                    <TextField label="Действует до" type="date" value={form.data.ends_at} onChange={(e) => form.setData('ends_at', e.target.value)} error={form.errors.ends_at} />
                    <div className="span-2">
                        <Check label="Закрепить вверху списка" checked={form.data.is_pinned} onChange={(e) => form.setData('is_pinned', e.target.checked)} />
                    </div>
                    <FileDropzone
                        className="span-2"
                        label="Обложка"
                        hint="Необязательно · JPG, PNG или WebP до 5 МБ"
                        accept="image/*"
                        value={form.data.image}
                        onChange={(file) => form.setData('image', file)}
                        error={form.errors.image}
                    />
                </div>
                <Button type="submit" loading={form.processing}>
                    Опубликовать
                </Button>
            </form>
            {posts.length === 0 ? (
                <EmptyState title="Публикаций пока нет" text="Добавьте новость или акцию — она появится на странице клиники." />
            ) : (
                <div className="post-grid">
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} types={types} />
                    ))}
                </div>
            )}
        </div>
    );
}
