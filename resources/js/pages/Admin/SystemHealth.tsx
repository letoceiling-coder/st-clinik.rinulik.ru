import { router } from '@inertiajs/react';
import { useState } from 'react';
import { PageHead } from '@/components/Dash';
import Icon from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { cx } from '@/lib/format';

type Status = 'ok' | 'warn' | 'fail';

interface Check {
    key: string;
    label: string;
    status: Status;
    value: string;
    hint: string | null;
}

const OVERALL: Record<Status, { title: string; text: string }> = {
    ok: { title: 'Всё работает', text: 'Все проверки пройдены.' },
    warn: { title: 'Есть предупреждения', text: 'Сайт работает, но что-то требует внимания.' },
    fail: { title: 'Есть сбои', text: 'Часть функций не работает — пользователи могут это заметить.' },
};

const ICON: Record<Status, string> = { ok: 'check-circle', warn: 'alert', fail: 'alert' };

export default function SystemHealth({
    checks,
    overall,
    checkedAt,
    failedJobs,
}: {
    checks: Check[];
    overall: Status;
    checkedAt: string;
    failedJobs: { id: number; queue: string; failed_at: string; error: string }[];
}) {
    const [busy, setBusy] = useState(false);
    const sorted = [...checks].sort((a, b) => ['fail', 'warn', 'ok'].indexOf(a.status) - ['fail', 'warn', 'ok'].indexOf(b.status));

    return (
        <div className="stack-lg">
            <PageHead
                title="Состояние системы"
                text="Сервисы, которые ломаются незаметно. Проверка идёт каждые 10 минут: о новом сбое суперадмины получают сообщение в MAX и на почту."
                action={
                    <Button
                        variant="outline"
                        icon="refresh"
                        loading={busy}
                        onClick={() => router.post('/admin/system/refresh', {}, { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) })}
                    >
                        Проверить сейчас
                    </Button>
                }
            />

            <section className={cx('card health-overall', `health-overall--${overall}`)}>
                <Icon name={ICON[overall]} size={28} />
                <div>
                    <b>{OVERALL[overall].title}</b>
                    <p className="text-sm">
                        {OVERALL[overall].text} Проверено {checkedAt}.
                    </p>
                </div>
            </section>

            <div className="health-grid">
                {sorted.map((c) => (
                    <article key={c.key} className={cx('card health-card', `health-card--${c.status}`)}>
                        <span className="health-card__dot" aria-hidden="true" />
                        <div className="health-card__body">
                            <span className="health-card__label">{c.label}</span>
                            <b className="health-card__value">{c.value}</b>
                            {c.hint && c.status !== 'ok' ? <p className="health-card__hint">{c.hint}</p> : null}
                        </div>
                    </article>
                ))}
            </div>

            {failedJobs.length > 0 ? (
                <section className="card stack">
                    <h2 className="card-title">Последние упавшие задачи</h2>
                    <ul className="health-jobs">
                        {failedJobs.map((j) => (
                            <li key={j.id}>
                                <span className="text-xs text-muted">
                                    {j.failed_at} · {j.queue}
                                </span>
                                <code>{j.error}</code>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}
        </div>
    );
}
