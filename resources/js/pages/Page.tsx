import { dateRu } from '@/lib/format';

export default function Page({ page }: { page: { slug: string; title: string; html: string; updated_at: string | null } }) {
    return (
        <article className="container page-head" style={{ paddingBottom: 'var(--space-16)' }}>
            <h1>{page.title}</h1>
            {page.updated_at ? <p className="text-muted text-sm" style={{ marginTop: 8 }}>Обновлено: {dateRu(page.updated_at)}</p> : null}
            <div className="prose" style={{ marginTop: 24 }} dangerouslySetInnerHTML={{ __html: page.html }} />
        </article>
    );
}
