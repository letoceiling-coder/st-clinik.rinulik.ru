import { Link, router } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { AnchorButton } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Misc';

export default function MaxLogin({ code, bot_url, expires_in }: { code: string; bot_url: string | null; expires_in: number }) {
    const stopped = useRef(false);

    useEffect(() => {
        stopped.current = false;
        const started = Date.now();
        const tick = () => {
            if (stopped.current) {
                return;
            }
            if (Date.now() - started > expires_in * 1000) {
                return;
            }
            fetch(`/auth/max/status/${code}`, { headers: { Accept: 'application/json' } })
                .then((r) => r.json())
                .then((data: { status?: string; complete_url?: string }) => {
                    if (data.status === 'ready' && data.complete_url) {
                        stopped.current = true;
                        router.visit(data.complete_url);
                    }
                })
                .catch(() => undefined);
        };
        const id = window.setInterval(tick, 2000);
        tick();

        return () => {
            stopped.current = true;
            window.clearInterval(id);
        };
    }, [code, expires_in]);

    return (
        <div className="auth-card card card--shadow stack">
            <div>
                <h1 className="auth-card__title">Вход через MAX</h1>
                <p className="text-muted">Откройте бота в MAX и нажмите «Start». Эта страница автоматически завершит вход.</p>
            </div>
            {!bot_url && <Alert tone="warning">Username бота не настроен. Укажите его в интеграции MAX в админке.</Alert>}
            {bot_url && (
                <AnchorButton href={bot_url} target="_blank" rel="noopener noreferrer" block size="lg">
                    Открыть MAX
                </AnchorButton>
            )}
            <p className="text-sm text-muted text-center">Код сессии: {code.slice(0, 8)}…</p>
            <p className="text-sm text-center">
                <Link href="/login" className="link">
                    Другой способ входа
                </Link>
            </p>
        </div>
    );
}
