import { Link, router, useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import { PageHead, Table } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check, SelectField, TextField } from '@/components/ui/Fields';
import { Alert, Badge } from '@/components/ui/Misc';

interface Field {
    name: string;
    label: string;
    type: 'text' | 'password' | 'url' | 'email' | 'number' | 'checkbox' | 'select';
    secret: boolean;
    optional: boolean;
    options: Record<string, string> | null;
    placeholder: string | null;
    help: string | null;
    value: string;
    masked: string | null;
    has_value: boolean;
}

interface CheckDetail {
    label: string;
    value: string;
    ok?: boolean | null;
}

interface Group {
    key: string;
    category: string;
    title: string;
    description: string;
    docs_url: string | null;
    instructions: string;
    checkable: boolean;
    generatable: boolean;
    fields: Field[];
    status: { configured: boolean; filled: number; total: number };
    last_check: { ok: boolean; message: string; details: CheckDetail[]; checked_at: string; checked_by: string | null } | null;
    hints: Record<string, string>;
    history: { id: number; at: string; user: string; text: string }[];
}

type MetrikaGoal = { id: string; label: string };

interface Props {
    categories: Record<string, string>;
    groups: Group[];
    app_url: string;
    yandex_metrika_goals: MetrikaGoal[];
    admin_web_push_subscribed: boolean;
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function InstructionBlock({ text }: { text: string }) {
    if (!text) return null;

    return (
        <div className="integration-instructions">
            {text.split('\n').map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return null;
                const html = escapeHtml(trimmed)
                    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="link">$1</a>')
                    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                    .replace(/`([^`]+)`/g, '<code>$1</code>');
                return <p key={i} className={/^\d+\./.test(trimmed) ? 'text-sm' : 'text-sm text-muted'} dangerouslySetInnerHTML={{ __html: html }} />;
            })}
        </div>
    );
}

function MetrikaGoalsSetup({ goals }: { goals: MetrikaGoal[] }) {
    if (goals.length === 0) {
        return null;
    }

    return (
        <div className="integration-instructions stack">
            <p className="text-sm">
                <strong>5. JavaScript-цели (обязательно для воронки):</strong> после сохранения номера счётчика сайт вызывает{' '}
                <code>reachGoal</code> с фиксированными идентификаторами. В Метрике: счётчик → <strong>Настройки</strong> → <strong>Цели</strong> →{' '}
                <strong>Добавить цель</strong> → тип <strong>JavaScript-событие</strong>. В поле <strong>Идентификатор цели</strong> введите строку{' '}
                <strong>точно</strong> как в таблице (латиница, подчёркивания, без пробелов). Название цели может быть любым.
            </p>
            <Table headers={['ID цели', 'Описание']}>
                {goals.map((g) => (
                    <tr key={g.id}>
                        <td>
                            <code>{g.id}</code>
                        </td>
                        <td>{g.label}</td>
                    </tr>
                ))}
            </Table>
            <p className="text-sm">
                <strong>6.</strong> Тот же список — в разделе{' '}
                <Link href="/admin/analytics" className="link">
                    Аналитика
                </Link>{' '}
                (таблица «Цели Яндекс.Метрики»). Проверка: в{' '}
                <a href="https://metrika.yandex.ru/" target="_blank" rel="noreferrer" className="link">
                    отчётах Метрики
                </a>{' '}
                → <strong>Конверсии</strong> → <strong>Цели</strong> — через 15–30 минут после тестового поиска или записи на сайте должны появиться
                срабатывания.
            </p>
        </div>
    );
}

function CopyValue({ value }: { value: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        void navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };

    return (
        <dd className="integration-hints__value">
            <code>{value}</code>
            <Button type="button" size="sm" variant="ghost" onClick={copy}>
                {copied ? 'Скопировано' : 'Копировать'}
            </Button>
        </dd>
    );
}

function LastCheck({ check }: { check: NonNullable<Group['last_check']> }) {
    return (
        <div className="stack">
            <Alert tone={check.ok ? 'success' : 'danger'}>
                <strong>{check.ok ? 'Проверка пройдена' : 'Проверка не пройдена'}</strong> · {check.checked_at}
                {check.checked_by ? `, ${check.checked_by}` : ''}
                <br />
                {check.message}
            </Alert>
            {check.details.length > 0 ? (
                <dl className="integration-check-details text-sm">
                    {check.details.map((d) => (
                        <div key={d.label} className={d.ok === false ? 'is-bad' : d.ok === true ? 'is-good' : undefined}>
                            <dt className="text-muted">{d.label}</dt>
                            <dd>{d.value}</dd>
                        </div>
                    ))}
                </dl>
            ) : null}
        </div>
    );
}

function FieldInput({ field, form }: { field: Field; form: ReturnType<typeof useForm<Record<string, string | boolean>>> }) {
    const value = form.data[field.name];
    const error = form.errors[field.name];
    const label = field.optional ? `${field.label} (необязательно)` : field.label;

    if (field.type === 'checkbox') {
        return <Check label={field.label} checked={Boolean(value)} onChange={(e) => form.setData(field.name, e.target.checked)} error={error} />;
    }

    if (field.type === 'select') {
        return (
            <SelectField label={label} value={String(value ?? '')} onChange={(e) => form.setData(field.name, e.target.value)} error={error} hint={field.help ?? undefined}>
                <option value="">— не выбрано —</option>
                {Object.entries(field.options ?? {}).map(([k, v]) => (
                    <option key={k} value={k}>
                        {v}
                    </option>
                ))}
            </SelectField>
        );
    }

    const savedSecretHint = field.secret && field.has_value ? `Сохранено: ${field.masked}. Оставьте пустым, чтобы не менять.` : null;

    return (
        <TextField
            label={label}
            type={field.secret ? 'password' : field.type === 'number' ? 'number' : field.type}
            step={field.type === 'number' ? 'any' : undefined}
            autoComplete={field.secret ? 'new-password' : 'off'}
            value={String(value ?? '')}
            onChange={(e) => form.setData(field.name, e.target.value)}
            error={error}
            hint={[savedSecretHint, field.help].filter(Boolean).join(' ') || undefined}
            placeholder={field.secret && field.has_value ? '••••••••' : (field.placeholder ?? undefined)}
        />
    );
}

function GroupCard({
    group,
    metrikaGoals,
    adminWebPushSubscribed,
}: {
    group: Group;
    metrikaGoals?: MetrikaGoal[];
    adminWebPushSubscribed?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [checking, setChecking] = useState(false);
    const [testingPush, setTestingPush] = useState(false);
    const initial = Object.fromEntries(
        group.fields.map((f) => [f.name, f.type === 'checkbox' ? ['1', 'true', 'on', 'yes'].includes(String(f.value).toLowerCase()) : f.value]),
    ) as Record<string, string | boolean>;
    const form = useForm<Record<string, string | boolean>>(initial);
    const hasSecret = group.fields.some((f) => f.secret && f.has_value);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.put(`/admin/integrations/${group.key}`, {
            preserveScroll: true,
            onSuccess: () => {
                const secrets = group.fields.filter((f) => f.secret).map((f) => f.name);
                secrets.forEach((name) => form.setData(name, ''));
            },
        });
    };

    const runCheck = () => {
        router.post(`/admin/integrations/${group.key}/check`, {}, { preserveScroll: true, onStart: () => setChecking(true), onFinish: () => setChecking(false) });
    };

    const generate = () => {
        if (hasSecret && !window.confirm('Ключи уже есть. После замены все браузерные подписки перестанут работать. Сгенерировать новые?')) return;
        router.post('/admin/integrations/web_push/generate', {}, { preserveScroll: true });
    };

    const sendTestPush = () => {
        router.post('/admin/integrations/web_push/test', {}, {
            preserveScroll: true,
            onStart: () => setTestingPush(true),
            onFinish: () => setTestingPush(false),
        });
    };

    const checkBadge = group.last_check ? (
        <Badge tone={group.last_check.ok ? 'success' : 'danger'}>{group.last_check.ok ? 'Проверено' : 'Ошибка проверки'}</Badge>
    ) : null;

    return (
        <article className="card stack integration-card" id={`integration-${group.key}`}>
            <div className="integration-card__head">
                <div className="integration-card__intro">
                    <h3 className="integration-card__title">{group.title}</h3>
                    <p className="text-sm text-muted">{group.description}</p>
                </div>
                <div className="integration-card__tools">
                    <Badge tone={group.status.configured ? 'success' : 'warning'}>
                        {group.status.configured ? 'Заполнено' : `Заполнено ${group.status.filled}/${group.status.total}`}
                    </Badge>
                    {checkBadge}
                    {group.docs_url ? (
                        <a href={group.docs_url} className="link text-sm" target="_blank" rel="noreferrer">
                            Документация
                        </a>
                    ) : null}
                    <Button type="button" size="sm" variant="outline" className="integration-card__toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
                        {open ? 'Свернуть' : 'Настроить'}
                    </Button>
                </div>
            </div>

            {open ? (
                <>
                    <InstructionBlock text={group.instructions} />

                    {group.key === 'yandex_metrika' && metrikaGoals ? <MetrikaGoalsSetup goals={metrikaGoals} /> : null}

                    {Object.keys(group.hints).length > 0 ? (
                        <dl className="integration-hints text-sm">
                            {Object.entries(group.hints).map(([label, value]) => (
                                <div key={label}>
                                    <dt className="text-muted">{label}</dt>
                                    <CopyValue value={value} />
                                </div>
                            ))}
                        </dl>
                    ) : null}

                    <form className="stack integration-form" onSubmit={submit} autoComplete="off">
                        {group.fields.map((field) => (
                            <FieldInput key={field.name} field={field} form={form} />
                        ))}
                        <div className="integration-form__actions">
                            <Button type="submit" disabled={form.processing} loading={form.processing}>
                                Сохранить
                            </Button>
                            {group.checkable ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={runCheck}
                                    disabled={checking || form.isDirty}
                                    loading={checking}
                                    title={form.isDirty ? 'Сначала сохраните изменения' : undefined}
                                >
                                    Проверить подключение
                                </Button>
                            ) : null}
                            {group.generatable ? (
                                <Button type="button" variant="secondary" onClick={generate}>
                                    Сгенерировать ключи
                                </Button>
                            ) : null}
                            {group.key === 'web_push' ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={sendTestPush}
                                    disabled={testingPush || form.isDirty || !adminWebPushSubscribed}
                                    loading={testingPush}
                                    title={
                                        form.isDirty
                                            ? 'Сначала сохраните изменения'
                                            : !adminWebPushSubscribed
                                              ? 'Включите push в личном кабинете → Профиль'
                                              : undefined
                                    }
                                >
                                    Отправить тестовый push
                                </Button>
                            ) : null}
                        </div>
                        {form.isDirty && group.checkable ? <p className="text-xs text-muted">Проверка выполняется по сохранённым значениям — сначала сохраните изменения.</p> : null}
                        {group.key === 'web_push' && !adminWebPushSubscribed ? (
                            <p className="text-xs text-muted">
                                Чтобы отправить тест, включите push в{' '}
                                <Link href="/account/profile" className="link">
                                    личном кабинете → Профиль
                                </Link>{' '}
                                в этом браузере.
                            </p>
                        ) : null}
                    </form>

                    {group.last_check ? <LastCheck check={group.last_check} /> : null}

                    {group.history.length > 0 ? (
                        <div className="stack">
                            <h4 className="text-sm">Журнал</h4>
                            <ul className="integration-history text-sm">
                                {group.history.map((h) => (
                                    <li key={h.id}>
                                        <span className="text-muted">
                                            {h.at} · {h.user}
                                        </span>{' '}
                                        — {h.text}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </>
            ) : group.last_check && !group.last_check.ok ? (
                <p className="text-sm integration-card__error">{group.last_check.message}</p>
            ) : null}
        </article>
    );
}

export default function AdminIntegrations({ categories, groups, app_url, yandex_metrika_goals, admin_web_push_subscribed }: Props) {
    const byCategory = Object.entries(categories)
        .map(([key, title]) => ({ key, title, groups: groups.filter((g) => g.category === key) }))
        .filter((c) => c.groups.length > 0);

    return (
        <div className="stack-lg">
            <PageHead
                title="Интеграции"
                text="Все ключи доступа хранятся в базе данных: секреты зашифрованы и не показываются после сохранения. Изменения применяются сразу, без правки .env и перезапуска."
            />

            <p className="text-sm text-muted integration-meta">
                Адрес сайта для настроек в кабинетах сервисов: <code>{app_url}</code>
            </p>

            <nav className="integration-nav" aria-label="Разделы интеграций">
                {byCategory.map((c) => {
                    const ready = c.groups.filter((g) => g.status.configured && g.last_check?.ok).length;
                    return (
                        <a key={c.key} href={`#category-${c.key}`} className="chip">
                            {c.title} · {ready}/{c.groups.length}
                        </a>
                    );
                })}
            </nav>

            {byCategory.map((c) => (
                <section key={c.key} id={`category-${c.key}`} className="stack" aria-labelledby={`category-${c.key}-title`}>
                    <h2 id={`category-${c.key}-title`} className="integration-category__title">
                        {c.title}
                    </h2>
                    {c.groups.map((group) => (
                        <GroupCard
                            key={group.key}
                            group={group}
                            metrikaGoals={group.key === 'yandex_metrika' ? yandex_metrika_goals : undefined}
                            adminWebPushSubscribed={group.key === 'web_push' ? admin_web_push_subscribed : undefined}
                        />
                    ))}
                </section>
            ))}
        </div>
    );
}
