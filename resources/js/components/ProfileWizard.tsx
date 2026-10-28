import { Link } from '@inertiajs/react';
import { useState } from 'react';
import Icon from '@/components/Icon';
import { cx } from '@/lib/format';

export interface CompletenessItem {
    key: string;
    label: string;
    done: boolean;
    weight: number;
    progress?: string | null;
    pending?: boolean;
    href?: string;
    why?: string;
}

/**
 * Мастер заполнения профиля: прогресс, один «следующий шаг» с наибольшим эффектом и чек-лист со ссылками.
 * Пункты, отправленные на модерацию, не считаются задачей — они ждут проверки.
 */
export default function ProfileWizard({ percent, items }: { percent: number; items: CompletenessItem[] }) {
    const [showAll, setShowAll] = useState(false);
    const todo = items.filter((i) => !i.done && !i.pending).sort((a, b) => b.weight - a.weight);
    const next = todo[0];
    const doneCount = items.filter((i) => i.done).length;

    if (percent >= 100) {
        return (
            <section className="card wizard wizard--done">
                <Icon name="check-circle" size={28} />
                <div>
                    <b>Профиль заполнен полностью</b>
                    <p className="text-sm text-muted">Карточка показывается выше в каталоге. Обновляйте цены и фото хотя бы раз в квартал.</p>
                </div>
            </section>
        );
    }

    return (
        <section className="card wizard">
            <div className="wizard__head">
                <div>
                    <h2 className="card-title" style={{ margin: 0 }}>
                        Заполните профиль — получите больше пациентов
                    </h2>
                    <p className="text-sm text-muted">
                        Выполнено {doneCount} из {items.length}. Чем полнее профиль, тем выше карточка в каталоге и тем чаще её выбирают.
                    </p>
                </div>
                <span className="wizard__percent">{percent}%</span>
            </div>
            <div className="wizard__bar" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Заполненность профиля">
                <span style={{ width: `${percent}%` }} />
            </div>

            {next ? (
                <div className="wizard__next">
                    <span className="wizard__next-label">Следующий шаг · +{next.weight}%</span>
                    <b>{next.label}</b>
                    {next.why ? <p className="text-sm text-muted">{next.why}</p> : null}
                    {next.href ? (
                        <Link href={next.href} className="btn btn--primary btn--sm">
                            {next.progress ? `Сейчас ${next.progress} — дополнить` : 'Заполнить'}
                            <Icon name="arrow-right" size={16} />
                        </Link>
                    ) : null}
                </div>
            ) : (
                <p className="text-sm">Остальное уже на модерации — после проверки процент обновится.</p>
            )}

            <button type="button" className="wizard__toggle" onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
                {showAll ? 'Скрыть чек-лист' : 'Весь чек-лист'}
                <Icon name={showAll ? 'chevron-up' : 'chevron-down'} size={16} />
            </button>
            {showAll ? (
                <ul className="wizard__list">
                    {items.map((i) => (
                        <li key={i.key} className={cx('wizard__item', i.done && 'is-done', i.pending && 'is-pending')}>
                            <Icon name={i.done ? 'check-circle' : i.pending ? 'clock' : 'plus'} size={18} />
                            <span className="wizard__item-text">
                                {i.href && !i.done ? (
                                    <Link href={i.href} className="link">
                                        {i.label}
                                    </Link>
                                ) : (
                                    i.label
                                )}
                                <span className="text-xs text-muted">
                                    {i.done ? 'готово' : i.pending ? 'на проверке у модератора' : [i.progress, `+${i.weight}%`].filter(Boolean).join(' · ')}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            ) : null}
        </section>
    );
}
