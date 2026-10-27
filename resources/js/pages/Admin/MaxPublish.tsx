import { Link } from '@inertiajs/react';
import { PageHead } from '@/components/Dash';
import { Alert, Badge } from '@/components/ui/Misc';

type Item = {
    key: string;
    title: string;
    manual: boolean;
    ok: boolean | null;
    detail: string;
    links?: { label: string; href: string }[];
};

export default function MaxPublish({
    items,
    summary,
}: {
    items: Item[];
    summary: {
        auto_done: number;
        auto_total: number;
        webhook_url: string;
        mini_app_url: string;
        last_api_check: { ok: boolean; message: string; at: string } | null;
    };
}) {
    return (
        <>
            <PageHead title="Публикация MAX" />
            <div className="stack">
                <div className="row row--between row--wrap">
                    <div>
                        <h1 className="page-title">Чек-лист публикации MAX</h1>
                        <p className="text-muted text-sm">Бот, Mini App и модерация (фаза 6.3)</p>
                    </div>
                    <Link href="/admin/integrations" className="text-sm">
                        ← Интеграции
                    </Link>
                </div>

                <Alert tone="info">
                    Автоматически проверено: {summary.auto_done} из {summary.auto_total}. Пункты с пометкой «вручную» — на стороне заказчика и QA.
                </Alert>

                {summary.last_api_check ? (
                    <p className="text-sm text-muted">
                        Последняя проверка API MAX: {summary.last_api_check.at} —{' '}
                        {summary.last_api_check.ok ? 'успешно' : summary.last_api_check.message}
                    </p>
                ) : null}

                <div className="stack">
                    {items.map((item, index) => (
                        <div key={item.key} className="card stack">
                            <div className="row row--wrap row--between">
                                <strong>
                                    {index + 1}. {item.title}
                                </strong>
                                {item.manual ? (
                                    <Badge tone="info">Вручную</Badge>
                                ) : item.ok ? (
                                    <Badge tone="success">Готово</Badge>
                                ) : (
                                    <Badge tone="warning">Проверить</Badge>
                                )}
                            </div>
                            <p className="text-sm text-muted">{item.detail}</p>
                            {item.links?.length ? (
                                <div className="row row--wrap">
                                    {item.links.map((link) => (
                                        <a key={link.href} href={link.href} className="text-sm" target="_blank" rel="noreferrer">
                                            {link.label}
                                        </a>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    ))}
                </div>

                <div className="card stack text-sm">
                    <strong>Быстрые URL</strong>
                    <div>Webhook: {summary.webhook_url}</div>
                    <div>Mini App: {summary.mini_app_url}</div>
                </div>
            </div>
        </>
    );
}
