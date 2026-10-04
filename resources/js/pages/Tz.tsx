import { dateRu } from '@/lib/format';

export default function Tz({ page }: { page: { html: string; updated_at: string | null } }) {
    return (
        <article className="container page-head tz-page" style={{ paddingBottom: 'var(--space-16)' }}>
            {page.updated_at ? (
                <p className="text-muted text-sm" style={{ marginBottom: 16 }}>
                    Обновлено: {dateRu(page.updated_at)}
                </p>
            ) : null}
            <div className="prose prose-tz" dangerouslySetInnerHTML={{ __html: page.html }} />
        </article>
    );
}
