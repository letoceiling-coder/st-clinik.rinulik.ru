import { LinkButton } from '@/components/ui/Button';
import { dateRu } from '@/lib/format';

interface DemoLink {
    href: string;
    label: string;
}

export default function Tz({
    page,
    demo_links = [],
}: {
    page: { html: string; updated_at: string | null };
    demo_links?: DemoLink[];
}) {
    return (
        <article className="container page-head tz-page" style={{ paddingBottom: 'var(--space-16)' }}>
            {demo_links.length > 0 ? (
                <div className="tz-demo-links row row--wrap" style={{ gap: 10, marginBottom: 20 }}>
                    {demo_links.map((link) => (
                        <LinkButton key={link.href} href={link.href} variant="dark" size="sm">
                            {link.label}
                        </LinkButton>
                    ))}
                </div>
            ) : null}
            {page.updated_at ? (
                <p className="text-muted text-sm" style={{ marginBottom: 16 }}>
                    Обновлено: {dateRu(page.updated_at)}
                </p>
            ) : null}
            <div className="prose prose-tz" dangerouslySetInnerHTML={{ __html: page.html }} />
        </article>
    );
}
