import { Link, router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { notify } from '@/lib/toast';
import Icon from './Icon';
import ParserTaskProgress, { type CollectInfo } from './ParserTaskProgress';

interface ActivityTask extends CollectInfo {
    id: number;
    title: string;
    status_label: string;
    purpose: string;
    parsed_organization_id: number | null;
    found: number;
    created: number;
    started: string | null;
    checked: string | null;
}

interface ActivityResponse {
    now: string;
    active: ActivityTask[];
    finished: ActivityTask[];
}

const SINCE_KEY = 'parser-activity-since';
const SEEN_KEY = 'parser-activity-seen';
const ACTIVE_INTERVAL = 4000;
const IDLE_INTERVAL = 20000;

const readSeen = (): number[] => {
    try {
        return JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? '[]') as number[];
    } catch {
        return [];
    }
};

/**
 * Индикатор фоновых задач парсера. Живёт в layout админки, поэтому виден на любой странице,
 * а задачи продолжают выполняться на сервере независимо от того, где находится администратор.
 */
export default function ParserActivity() {
    const [active, setActive] = useState<ActivityTask[]>([]);
    const [collapsed, setCollapsed] = useState(false);
    const [offline, setOffline] = useState(false);
    const timer = useRef<number | undefined>(undefined);
    const activeCount = useRef(0);

    const load = useCallback(async () => {
        window.clearTimeout(timer.current);
        try {
            const since = sessionStorage.getItem(SINCE_KEY) ?? '';
            const response = await fetch(`/admin/parser/activity?since=${encodeURIComponent(since)}`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            });
            if (!response.ok) throw new Error(String(response.status));
            const data = (await response.json()) as ActivityResponse;

            const seen = readSeen();
            const fresh = data.finished.filter((t) => !seen.includes(t.id));
            fresh.forEach((t) => notify(`${t.title}. ${t.stage}`, t.status === 'completed' ? 'info' : 'error'));
            if (fresh.length > 0) {
                sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen, ...fresh.map((t) => t.id)].slice(-50)));
                if (window.location.pathname.startsWith('/admin/parser')) {
                    router.reload();
                }
            }
            sessionStorage.setItem(SINCE_KEY, data.now);

            setActive(data.active);
            activeCount.current = data.active.length;
            setOffline(false);
        } catch {
            setOffline(activeCount.current > 0);
        } finally {
            timer.current = window.setTimeout(load, activeCount.current > 0 ? ACTIVE_INTERVAL : IDLE_INTERVAL);
        }
    }, []);

    useEffect(() => {
        void load();
        const off = router.on('success', () => void load());

        return () => {
            off();
            window.clearTimeout(timer.current);
        };
    }, [load]);

    if (active.length === 0) {
        return null;
    }

    return (
        <aside className={`parser-activity card${collapsed ? ' is-collapsed' : ''}`} aria-live="polite" aria-label="Фоновые процессы парсера">
            <button type="button" className="parser-activity__head" onClick={() => setCollapsed((v) => !v)} aria-expanded={!collapsed}>
                <span className="parser-activity__spinner" aria-hidden="true" />
                <span className="parser-activity__title">
                    {active.some((t) => t.attention)
                        ? 'Сбор на паузе: проверка Яндекса'
                        : active.length === 1
                          ? `Идёт процесс парсера${active[0].target ? ` · ${active[0].collected}/${active[0].target}` : ''}`
                          : `Процессов парсера: ${active.length}`}
                </span>
                <Icon name={collapsed ? 'chevron-up' : 'chevron-down'} size={18} />
            </button>

            {!collapsed ? (
                <div className="parser-activity__body">
                    {active.map((t) => (
                        <div key={t.id} className="parser-activity__item">
                            <div className="parser-activity__row">
                                <b>{t.title}</b>
                                <span className="text-xs text-muted">{t.status_label}</span>
                            </div>
                            <ParserTaskProgress task={t} compact />
                            <p className="text-xs text-muted">
                                Запущено {t.started}
                                {t.checked ? ` · статус обновлён ${t.checked}` : ''}
                            </p>
                        </div>
                    ))}
                    {offline ? <p className="text-xs parser-warn">Нет связи с сервером — повторяем запрос…</p> : null}
                    <p className="text-xs text-muted">Можно работать на других страницах — по завершении появится уведомление.</p>
                    <Link href="/admin/parser?tab=tasks" className="link text-sm">
                        Открыть задачи
                    </Link>
                </div>
            ) : null}
        </aside>
    );
}
