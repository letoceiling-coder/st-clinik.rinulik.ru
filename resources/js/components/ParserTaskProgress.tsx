export interface CollectInfo {
    status: string;
    progress: number | null;
    stage: string;
    target: number | null;
    collected: number;
    eta_sec: number | null;
    attention: string | null;
    stage_label: string | null;
    stages: { id: string; label: string; state: string }[];
    last_organization: string | null;
    status_page: string | null;
}

export const formatEta = (sec: number): string => {
    const minutes = Math.max(1, Math.round(sec / 60));
    if (minutes < 60) return `≈ ${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    return `≈ ${hours} ч${rest > 0 ? ` ${rest} мин` : ''}`;
};

/** Прогресс сбора: шкала этапов, «собрано N из M», оставшееся время и предупреждение о проверке Яндекса. */
export default function ParserTaskProgress({ task, compact = false }: { task: CollectInfo; compact?: boolean }) {
    const indeterminate = task.progress === null || task.status === 'queued';

    return (
        <div className="parser-task-progress">
            {!compact && task.stages.length > 0 ? (
                <ol className="parser-stages" aria-label="Этапы сбора">
                    {task.stages.map((s) => (
                        <li key={s.id} className={`parser-stages__item is-${s.state}`}>
                            {s.label}
                        </li>
                    ))}
                </ol>
            ) : null}

            <div className={`parser-progress${indeterminate ? ' is-indeterminate' : ''}`} role="progressbar" aria-valuenow={task.progress ?? undefined} aria-valuemin={0} aria-valuemax={100}>
                <span style={indeterminate ? undefined : { width: `${Math.max(task.progress ?? 0, 4)}%` }} />
            </div>

            <div className="parser-task-progress__facts text-xs">
                {task.target ? (
                    <b>
                        Собрано {task.collected} из {task.target}
                    </b>
                ) : null}
                {task.progress !== null && task.status !== 'queued' ? <span>{task.progress}%</span> : null}
                {task.eta_sec ? <span>осталось {formatEta(task.eta_sec)}</span> : null}
            </div>

            {task.attention ? <p className="parser-attention text-xs">{task.attention}</p> : null}
            <p className="text-xs">{task.stage}</p>
            {task.last_organization ? <p className="text-xs text-muted">Последняя: {task.last_organization}</p> : null}
            {!compact && task.status_page ? (
                <a href={task.status_page} target="_blank" rel="noreferrer" className="link text-xs">
                    Подробный статус в парсере
                </a>
            ) : null}
        </div>
    );
}
