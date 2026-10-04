import { useForm } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';
import { PageHead } from '@/components/Dash';
import { Button } from '@/components/ui/Button';
import { Check, TextField } from '@/components/ui/Fields';
import { Badge } from '@/components/ui/Misc';

interface Field {
    name: string;
    label: string;
    type: string;
    secret: boolean;
    value: string;
    masked: string | null;
    has_value: boolean;
}

interface Group {
    key: string;
    title: string;
    description: string;
    docs_url: string | null;
    instructions: string;
    fields: Field[];
    status: { configured: boolean; filled: number; total: number };
    hints: Record<string, string>;
}

interface Props {
    groups: Group[];
    yookassa_ready: boolean;
    app_url: string;
}

function InstructionBlock({ text }: { text: string }) {
    if (!text) return null;

    return (
        <div className="integration-instructions">
            {text.split('\n').map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <br key={i} />;
                const html = trimmed
                    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="link">$1</a>')
                    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                    .replace(/`([^`]+)`/g, '<code>$1</code>');
                if (/^\d+\./.test(trimmed)) {
                    return <p key={i} className="text-sm" dangerouslySetInnerHTML={{ __html: html }} />;
                }
                return (
                    <p key={i} className="text-sm text-muted" dangerouslySetInnerHTML={{ __html: html }} />
                );
            })}
        </div>
    );
}

function GroupCard({ group }: { group: Group }) {
    const [open, setOpen] = useState(!group.status.configured);
    const initial = Object.fromEntries(group.fields.map((f) => [f.name, f.type === 'checkbox' ? f.value === '1' : f.value]));
    const form = useForm(initial);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.put(`/admin/integrations/${group.key}`, { preserveScroll: true });
    };

    return (
        <article className="card stack integration-card">
            <div className="row row--wrap row--between integration-card__head">
                <div>
                    <h2 className="integration-card__title">{group.title}</h2>
                    <p className="text-sm text-muted">{group.description}</p>
                </div>
                <div className="row row--wrap integration-card__tools">
                    <Badge tone={group.status.configured ? 'success' : 'warning'}>
                        {group.status.configured ? 'Настроено' : `Заполнено ${group.status.filled}/${group.status.total}`}
                    </Badge>
                    {group.docs_url ? (
                        <a href={group.docs_url} className="link text-sm" target="_blank" rel="noreferrer">
                            Документация
                        </a>
                    ) : null}
                    <Button type="button" size="sm" variant="outline" className="integration-card__toggle" onClick={() => setOpen((v) => !v)}>
                        {open ? 'Свернуть' : 'Настроить'}
                    </Button>
                </div>
            </div>

            {open ? (
                <>
                    <InstructionBlock text={group.instructions} />

                    {Object.keys(group.hints).length > 0 ? (
                        <dl className="integration-hints text-sm">
                            {Object.entries(group.hints).map(([k, v]) => (
                                <div key={k}>
                                    <dt className="text-muted">{k}</dt>
                                    <dd>
                                        <code>{v}</code>
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    ) : null}

                    <form className="stack integration-form" onSubmit={submit}>
                        {group.fields.map((field) =>
                            field.type === 'checkbox' ? (
                                <Check
                                    key={field.name}
                                    label={field.label}
                                    checked={Boolean(form.data[field.name])}
                                    onChange={(e) => form.setData(field.name, e.target.checked)}
                                />
                            ) : (
                                <TextField
                                    key={field.name}
                                    label={field.label}
                                    type={field.secret ? 'password' : field.type === 'url' ? 'url' : 'text'}
                                    value={String(form.data[field.name] ?? '')}
                                    onChange={(e) => form.setData(field.name, e.target.value)}
                                    error={form.errors[field.name]}
                                    hint={
                                        field.secret && field.has_value
                                            ? `Сохранено: ${field.masked}. Оставьте пустым, чтобы не менять.`
                                            : undefined
                                    }
                                    placeholder={field.secret && field.has_value ? '••••••••' : undefined}
                                />
                            ),
                        )}
                        <div className="integration-form__actions">
                            <Button type="submit" block disabled={form.processing}>
                                Сохранить
                            </Button>
                        </div>
                    </form>
                </>
            ) : null}
        </article>
    );
}

export default function AdminIntegrations({ groups, yookassa_ready, app_url }: Props) {
    return (
        <div className="stack-lg">
            <PageHead
                title="Интеграции"
                text="Ключи API, OAuth и платёжные сервисы. Значения хранятся в базе и применяются без правки .env на сервере."
            />

            <p className="text-sm text-muted integration-meta">
                Базовый URL сайта: <code>{app_url}</code>
                {yookassa_ready ? (
                    <>
                        {' '}
                        · <Badge tone="success">ЮKassa активна</Badge>
                    </>
                ) : null}
            </p>

            <div className="stack-lg">
                {groups.map((group) => (
                    <GroupCard key={group.key} group={group} />
                ))}
            </div>
        </div>
    );
}
