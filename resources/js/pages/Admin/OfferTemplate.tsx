import { useForm, useHttp } from '@inertiajs/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PageHead, Panel } from '@/components/Dash';
import { Button, LinkButton } from '@/components/ui/Button';
import { Check, PhoneField, SelectField, TextArea, TextField } from '@/components/ui/Fields';
import { Alert, Tabs } from '@/components/ui/Misc';

type Field = 'web_title' | 'web_body' | 'email_subject' | 'email_body' | 'sms_text' | 'messenger_text' | 'call_script';
type Content = Record<Field, string>;
type PreviewTab = 'web' | 'email' | 'sms' | 'messenger' | 'call';

interface Rendered {
    web_title: string;
    web_html: string;
    email_subject: string;
    email_html: string;
    email_text: string;
    sms: string;
    messenger: string;
    call_script: string | null;
    sms_segments: number;
    sms_length: number;
}

interface Props {
    template: {
        id: number;
        name: string;
        is_active: boolean;
        version: number | null;
        content: Partial<Record<Field, string | null>> | null;
        versions: { version: number; by: string | null; at: string | null; content: Partial<Record<Field, string | null>> }[];
    } | null;
    defaults: Content;
    variables: Record<string, string>;
    sample_clinics: { id: number; name: string }[];
    sms_limit: number;
}

const FIELDS: { key: Field; label: string; rows?: number; hint?: string }[] = [
    { key: 'web_title', label: 'Заголовок страницы КП' },
    { key: 'web_body', label: 'Текст страницы КП', rows: 12, hint: 'Пустая строка — новый абзац, «# » и «## » — заголовки, «- » — пункт списка, **жирный**. Ссылки становятся кликабельными.' },
    { key: 'email_subject', label: 'Тема письма' },
    { key: 'email_body', label: 'Текст письма', rows: 8, hint: 'Из него собираются HTML и текстовая версии. Ссылка на отписку добавится автоматически, если не вставить {unsubscribe_link}.' },
    { key: 'sms_text', label: 'SMS', rows: 2, hint: 'Не больше 2 SMS (134 знака кириллицей). Используйте {offer_link} — это короткая ссылка.' },
    { key: 'messenger_text', label: 'MAX, VK, Telegram, WhatsApp', rows: 5, hint: 'Менеджер копирует и отправляет вручную.' },
    { key: 'call_script', label: 'Скрипт звонка (необязательно)', rows: 5 },
];

const contentOf = (source: Props['template'], defaults: Content): Content =>
    Object.fromEntries(FIELDS.map(({ key }) => [key, source?.content?.[key] ?? (source ? '' : defaults[key])])) as Content;

export default function AdminOfferTemplate({ template, defaults, variables, sample_clinics, sms_limit }: Props) {
    const form = useForm({ name: template?.name ?? '', is_active: template?.is_active ?? true, ...contentOf(template, defaults) });
    const [focused, setFocused] = useState<Field>('web_body');
    const refs = useRef<Partial<Record<Field, HTMLInputElement | HTMLTextAreaElement | null>>>({});
    const [clinicId, setClinicId] = useState<number | ''>(sample_clinics[0]?.id ?? '');
    const [tab, setTab] = useState<PreviewTab>('web');
    const preview = useHttp<Content & { clinic_id: number | '' }, Rendered>({ ...contentOf(template, defaults), clinic_id: '' });
    const test = useForm({ channel: 'email', phone: '' });

    const content = Object.fromEntries(FIELDS.map(({ key }) => [key, form.data[key]])) as Content;
    const contentKey = JSON.stringify(content);

    useEffect(() => {
        if (clinicId === '') return;
        const timer = setTimeout(() => {
            preview.transform(() => ({ ...content, clinic_id: clinicId }));
            void preview.post('/admin/offers/templates/preview').catch(() => undefined);
        }, 400);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contentKey, clinicId]);

    const insert = (variable: string) => {
        const el = refs.current[focused];
        const value = form.data[focused];
        const start = el?.selectionStart ?? value.length;
        const end = el?.selectionEnd ?? value.length;
        form.setData(focused, value.slice(0, start) + variable + value.slice(end));
        requestAnimationFrame(() => {
            el?.focus();
            el?.setSelectionRange(start + variable.length, start + variable.length);
        });
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (template) {
            form.put(`/admin/offers/templates/${template.id}`, { preserveScroll: true });
        } else {
            form.post('/admin/offers/templates');
        }
    };

    const sendTest = () => {
        if (clinicId === '') return;
        test.transform((d) => ({ ...d, ...content, clinic_id: clinicId }));
        test.post('/admin/offers/templates/test', { preserveScroll: true });
    };

    const rendered = preview.response;

    return (
        <div className="stack-lg">
            <PageHead
                title={template ? `Шаблон: ${template.name}` : 'Новый шаблон КП'}
                text={template ? `Текущая версия v${template.version}. Каждое сохранение с изменённым текстом — новая версия; уже сформированные КП не меняются.` : 'Пример текста уже заполнен — поправьте его под себя.'}
                action={
                    <LinkButton href="/admin/offers?tab=templates" variant="ghost">
                        Все шаблоны
                    </LinkButton>
                }
            />

            <div className="offers-editor">
                <form className="stack" onSubmit={submit}>
                    <Panel>
                        <div className="offers-form-grid">
                            <TextField label="Название шаблона" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} required />
                            <div className="offers-form-grid__action">
                                <Check label="Доступен для кампаний" checked={form.data.is_active} onChange={(e) => form.setData('is_active', e.target.checked)} />
                            </div>
                        </div>
                    </Panel>

                    <Panel title="Переменные">
                        <div className="stack">
                            <p className="text-xs text-muted">Нажмите, чтобы вставить в поле, где стоит курсор. Значения подставятся для каждой клиники.</p>
                            <div className="offers-vars">
                                {Object.entries(variables).map(([key, label]) => (
                                    <button key={key} type="button" className="chip offers-vars__chip" title={label} onClick={() => insert(key)}>
                                        <code>{key}</code>
                                        <span className="text-xs text-muted">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </Panel>

                    <Panel title="Текст по каналам">
                        <div className="stack">
                            {FIELDS.map(({ key, label, rows, hint }) => {
                                const common = {
                                    label,
                                    hint,
                                    value: form.data[key],
                                    error: form.errors[key],
                                    onFocus: () => setFocused(key),
                                };
                                return rows ? (
                                    <TextArea key={key} {...common} rows={rows} ref={(el) => void (refs.current[key] = el)} onChange={(e) => form.setData(key, e.target.value)} />
                                ) : (
                                    <TextField key={key} {...common} ref={(el) => void (refs.current[key] = el)} onChange={(e) => form.setData(key, e.target.value)} />
                                );
                            })}
                        </div>
                    </Panel>

                    <div className="row offers-save">
                        <Button type="submit" loading={form.processing}>
                            {template ? 'Сохранить' : 'Создать шаблон'}
                        </Button>
                        {template && form.isDirty ? <span className="text-sm text-muted">Есть несохранённые изменения</span> : null}
                    </div>

                    {template && template.versions.length > 1 ? (
                        <Panel title="История версий">
                            <ul className="offers-versions">
                                {template.versions.map((v) => (
                                    <li key={v.version}>
                                        <span>
                                            <b>v{v.version}</b> <span className="text-sm text-muted">· {v.at} · {v.by ?? 'система'}</span>
                                        </span>
                                        {v.version !== template.version ? (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => FIELDS.forEach(({ key }) => form.setData(key, v.content[key] ?? ''))}
                                            >
                                                Взять текст
                                            </Button>
                                        ) : (
                                            <span className="text-xs text-muted">текущая</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </Panel>
                    ) : null}
                </form>

                <aside className="offers-editor__preview stack">
                    <Panel title="Предпросмотр">
                        <div className="stack">
                            <SelectField label="На примере организации" value={clinicId} onChange={(e) => setClinicId(e.target.value === '' ? '' : Number(e.target.value))}>
                                {sample_clinics.length === 0 ? <option value="">Нет клиник для примера</option> : null}
                                {sample_clinics.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </SelectField>
                            <Tabs<PreviewTab>
                                label="Канал предпросмотра"
                                value={tab}
                                onChange={setTab}
                                items={[
                                    { key: 'web', label: 'Страница' },
                                    { key: 'email', label: 'Email' },
                                    { key: 'sms', label: 'SMS' },
                                    { key: 'messenger', label: 'Чаты' },
                                    { key: 'call', label: 'Звонок' },
                                ]}
                            />
                            {!rendered ? (
                                <p className="text-sm text-muted">{preview.processing ? 'Собираем предпросмотр…' : 'Выберите организацию для предпросмотра.'}</p>
                            ) : tab === 'web' ? (
                                <div className="offers-preview">
                                    <h3>{rendered.web_title}</h3>
                                    <div className="offers-preview__body" dangerouslySetInnerHTML={{ __html: rendered.web_html }} />
                                </div>
                            ) : tab === 'email' ? (
                                <div className="offers-preview">
                                    <p className="text-sm">
                                        <span className="text-muted">Тема:</span> <b>{rendered.email_subject}</b>
                                    </p>
                                    <div className="offers-preview__body" dangerouslySetInnerHTML={{ __html: rendered.email_html.replaceAll('{unsubscribe_link}', '<i>ссылка отписки</i>') }} />
                                </div>
                            ) : tab === 'sms' ? (
                                <div className="stack">
                                    <pre className="offers-plain">{rendered.sms}</pre>
                                    <p className={`text-xs ${rendered.sms_segments > sms_limit ? 'offers-warn' : 'text-muted'}`}>
                                        {rendered.sms_length} знаков · {rendered.sms_segments} SMS{rendered.sms_segments > sms_limit ? ` — больше ${sms_limit}, сократите текст` : ''}
                                    </p>
                                </div>
                            ) : (
                                <pre className="offers-plain">{(tab === 'messenger' ? rendered.messenger : rendered.call_script) || 'Текст не задан.'}</pre>
                            )}
                            <p className="text-xs text-muted">Ссылки в предпросмотре условные — настоящие создаются вместе с КП.</p>
                        </div>
                    </Panel>

                    <Panel title="Тест себе">
                        <div className="stack">
                            <SelectField label="Канал" value={test.data.channel} onChange={(e) => test.setData('channel', e.target.value)}>
                                <option value="email">Email на мой адрес</option>
                                <option value="sms">SMS на номер</option>
                            </SelectField>
                            {test.data.channel === 'sms' ? (
                                <PhoneField label="Телефон" value={test.data.phone} onChange={(e) => test.setData('phone', e.target.value)} error={test.errors.phone} />
                            ) : null}
                            <Alert tone="muted">Отправляется текущий текст из редактора, даже несохранённый. Письмо уходит через почту для КП из раздела «Интеграции».</Alert>
                            <div>
                                <Button variant="outline" icon="send" onClick={sendTest} loading={test.processing} disabled={clinicId === ''}>
                                    Отправить тест
                                </Button>
                            </div>
                        </div>
                    </Panel>
                </aside>
            </div>
        </div>
    );
}
