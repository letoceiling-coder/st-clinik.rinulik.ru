import { Link, router, useForm, usePage } from '@inertiajs/react';
import { useState, type FormEvent, type ReactNode } from 'react';
import Icon from '@/components/Icon';
import { Button, LinkButton } from '@/components/ui/Button';
import { Check, PhoneField, TextArea, TextField } from '@/components/ui/Fields';
import FileDropzone from '@/components/ui/FileDropzone';
import { Alert, Tabs } from '@/components/ui/Misc';
import type { SharedProps } from '@/lib/types';

interface Props {
    clinic: { name: string; slug: string; address: string | null; city: string | null };
    authenticated: boolean;
    email_verified: boolean;
    email: string | null;
    blocked_reason: string | null;
    register_url: string;
    verify_url: string;
    agreement_url: string;
    privacy_url: string;
    trial: { enabled: boolean; days: number };
    sms: { available: boolean; phone: string | null };
    pending: { submitted_at: string | null; position: string; has_document: boolean } | null;
}

function Step({ n, done, active, title, children }: { n: number; done: boolean; active: boolean; title: string; children?: ReactNode }) {
    return (
        <li className={`claim-step${done ? ' is-done' : ''}${active ? ' is-active' : ''}`}>
            <span className="claim-step__n" aria-hidden="true">
                {done ? <Icon name="check" size={16} /> : n}
            </span>
            <div className="claim-step__body">
                <b>{title}</b>
                {active ? children : null}
            </div>
        </li>
    );
}

function AgreementChecks({ authority, agreement, errors, onChange, agreementUrl }: {
    authority: boolean;
    agreement: boolean;
    errors: Partial<Record<'authority' | 'agreement', string>>;
    onChange: (key: 'authority' | 'agreement', value: boolean) => void;
    agreementUrl: string;
}) {
    return (
        <>
            <Check checked={authority} onChange={(e) => onChange('authority', e.target.checked)} error={errors.authority} label="Подтверждаю, что уполномочен(а) представлять эту клинику" />
            <Check
                checked={agreement}
                onChange={(e) => onChange('agreement', e.target.checked)}
                error={errors.agreement}
                label={
                    <>
                        Принимаю{' '}
                        <a href={agreementUrl} className="link" target="_blank" rel="noopener">
                            соглашение с клиникой
                        </a>
                    </>
                }
            />
        </>
    );
}

export default function ClinicClaim({ clinic, authenticated, email_verified, email, blocked_reason, register_url, verify_url, agreement_url, privacy_url, trial, sms, pending }: Props) {
    const { flash } = usePage<SharedProps>().props;
    const base = `/clinics/${clinic.slug}/claim`;
    const ready = authenticated && email_verified && blocked_reason === null;
    const [mode, setMode] = useState<'sms' | 'document'>(sms.available ? 'sms' : 'document');

    const smsForm = useForm({ code: '', authority: false, agreement: false });
    const docForm = useForm<{ position: string; phone: string; comment: string; document: File | null; authority: boolean; agreement: boolean; consent: boolean }>({
        position: pending?.position ?? '',
        phone: '',
        comment: '',
        document: null,
        authority: false,
        agreement: false,
        consent: false,
    });

    const submitSms = (e: FormEvent) => {
        e.preventDefault();
        smsForm.post(`${base}/sms`, { preserveScroll: true });
    };
    const submitDocument = (e: FormEvent) => {
        e.preventDefault();
        docForm.post(base, { preserveScroll: true, forceFormData: true });
    };

    return (
        <div className="container narrow stack">
            <div className="card card--shadow stack claim-card">
                <h1 className="auth-card__title">Это ваша клиника?</h1>
                <p className="text-muted">
                    «{clinic.name}»{clinic.address ? `, ${clinic.address}` : ''}. Подтвердите, что представляете клинику, — и управляйте карточкой сами: цены, врачи, фото, ответы на отзывы и заявки пациентов.
                </p>
                {trial.enabled ? (
                    <div className="claim-trial">
                        <Icon name="sparkle" size={20} />
                        <span>
                            <b>{trial.days} дней бесплатно</b> — расширенный тариф включится сразу после подтверждения прав. Без привязки карты.
                        </span>
                    </div>
                ) : null}
                {flash?.error ? <Alert tone="warning">{flash.error}</Alert> : null}
                {flash?.success ? <Alert tone="success">{flash.success}</Alert> : null}
                {authenticated && blocked_reason ? <Alert tone="warning">{blocked_reason}</Alert> : null}

                <ol className="claim-steps">
                    <Step n={1} done={authenticated} active={!authenticated} title="Вход в кабинет клиники">
                        <p className="text-sm text-muted">Войдите или зарегистрируйтесь — доступ к карточке получит только этот аккаунт.</p>
                        <div className="cluster">
                            <LinkButton href={`/login?intended=${encodeURIComponent(base)}`}>Войти</LinkButton>
                            <LinkButton href={register_url} variant="outline">
                                Зарегистрироваться
                            </LinkButton>
                        </div>
                    </Step>

                    <Step n={2} done={authenticated && email_verified} active={authenticated && !email_verified} title="Подтверждение e-mail">
                        <p className="text-sm text-muted">Мы отправили письмо на {email ?? 'ваш e-mail'}. Перейдите по ссылке из письма — вы вернётесь сюда.</p>
                        <LinkButton href={verify_url} variant="outline">
                            Отправить письмо ещё раз
                        </LinkButton>
                    </Step>

                    <Step n={3} done={false} active={ready} title="Подтверждение прав">
                        {pending ? (
                            <Alert tone="info" icon="clock">
                                Заявка на проверке с {pending.submitted_at}. Модератор сверит документ и сообщит о решении. Можно отправить уточнённые данные — заявка обновится.
                            </Alert>
                        ) : null}

                        {sms.available ? (
                            <Tabs
                                label="Способ подтверждения"
                                value={mode}
                                onChange={setMode}
                                items={[
                                    { key: 'sms', label: 'Код по SMS — сразу' },
                                    { key: 'document', label: 'Документ — модератору' },
                                ]}
                            />
                        ) : null}

                        {sms.available && mode === 'sms' ? (
                            <form onSubmit={submitSms} className="stack">
                                <p className="text-sm text-muted">Код придёт на номер {sms.phone} из карточки клиники. Права откроются сразу после ввода кода.</p>
                                <Button type="button" variant="outline" size="sm" onClick={() => router.post(`${base}/code`, {}, { preserveScroll: true })}>
                                    Получить код
                                </Button>
                                <TextField
                                    label="Код из SMS"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    value={smsForm.data.code}
                                    onChange={(e) => smsForm.setData('code', e.target.value.replace(/\D/g, ''))}
                                    error={smsForm.errors.code}
                                />
                                <AgreementChecks
                                    authority={smsForm.data.authority}
                                    agreement={smsForm.data.agreement}
                                    errors={smsForm.errors}
                                    onChange={(key, value) => smsForm.setData(key, value)}
                                    agreementUrl={agreement_url}
                                />
                                <Button type="submit" block loading={smsForm.processing} disabled={smsForm.data.code.length < 6}>
                                    Подтвердить и перейти в кабинет
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={submitDocument} className="stack" noValidate>
                                <p className="text-sm text-muted">
                                    Приложите документ, подтверждающий полномочия: выписку из ЕГРЮЛ, где вы указаны руководителем, или доверенность от клиники. Документ увидит только модератор.
                                </p>
                                <TextField label="Ваша должность" required autoComplete="organization-title" value={docForm.data.position} onChange={(e) => docForm.setData('position', e.target.value)} error={docForm.errors.position} />
                                <PhoneField label="Телефон для связи с модератором" required value={docForm.data.phone} onChange={(e) => docForm.setData('phone', e.target.value)} error={docForm.errors.phone} />
                                <FileDropzone
                                    label="Документ"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    hint="PDF, JPG или PNG, до 8 МБ"
                                    value={docForm.data.document}
                                    onChange={(file) => docForm.setData('document', file)}
                                    error={docForm.errors.document}
                                />
                                <TextArea label="Комментарий" hint="Необязательно" rows={3} maxLength={1000} value={docForm.data.comment} onChange={(e) => docForm.setData('comment', e.target.value)} error={docForm.errors.comment} />
                                <AgreementChecks
                                    authority={docForm.data.authority}
                                    agreement={docForm.data.agreement}
                                    errors={docForm.errors}
                                    onChange={(key, value) => docForm.setData(key, value)}
                                    agreementUrl={agreement_url}
                                />
                                <Check
                                    checked={docForm.data.consent}
                                    onChange={(e) => docForm.setData('consent', e.target.checked)}
                                    error={docForm.errors.consent}
                                    label={
                                        <>
                                            Согласен(на) на{' '}
                                            <a href={privacy_url} className="link" target="_blank" rel="noopener">
                                                обработку персональных данных
                                            </a>
                                        </>
                                    }
                                />
                                <Button type="submit" block loading={docForm.processing}>
                                    {pending ? 'Обновить заявку' : 'Отправить на проверку'}
                                </Button>
                            </form>
                        )}
                    </Step>
                </ol>

                <p className="text-sm text-center">
                    <Link href={`/clinics/${clinic.slug}`} className="link">
                        Вернуться к карточке клиники
                    </Link>
                </p>
            </div>
        </div>
    );
}
