import { Link, router, useForm, usePage } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import Icon from '@/components/Icon';
import { Button, LinkButton } from '@/components/ui/Button';
import { Check, TextField } from '@/components/ui/Fields';
import { Alert } from '@/components/ui/Misc';
import type { SharedProps } from '@/lib/types';

interface Props {
    offer_token: string;
    clinic_name: string;
    organization_name: string;
    authenticated: boolean;
    email_verified: boolean;
    email: string | null;
    register_url: string;
    verify_url: string;
    agreement_url: string;
    trial: { enabled: boolean; days: number; reason: string | null };
    sms: { required: boolean; phone: string | null; verified: boolean };
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

export default function OfferClaim({ offer_token, clinic_name, organization_name, authenticated, email_verified, email, register_url, verify_url, agreement_url, trial, sms }: Props) {
    const { flash } = usePage<SharedProps>().props;
    const form = useForm({ confirm: false, agreement: false, publish: false, code: '' });
    const claimUrl = `/offer/${offer_token}/claim`;
    const needsCode = sms.required && !sms.verified;

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(claimUrl, { preserveScroll: true });
    };

    return (
        <div className="container narrow stack">
            <div className="card card--shadow stack claim-card">
                <h1 className="auth-card__title">Подключение клиники</h1>
                <p className="text-muted">
                    «{clinic_name}»{organization_name !== clinic_name ? ` · ${organization_name}` : ''}. Карточка уже подготовлена — осталось подтвердить, что вы представляете клинику.
                </p>
                {trial.enabled ? (
                    <div className="claim-trial">
                        <Icon name="sparkle" size={20} />
                        <span>
                            <b>{trial.days} дней бесплатно</b> — пробный период начнётся после проверки карточки модератором. Без привязки карты.
                        </span>
                    </div>
                ) : trial.reason ? (
                    <Alert tone="muted">{trial.reason} Подключение и бесплатное размещение доступны.</Alert>
                ) : null}
                {flash?.error ? <Alert tone="warning">{flash.error}</Alert> : null}
                {flash?.success ? <Alert tone="success">{flash.success}</Alert> : null}

                <ol className="claim-steps">
                    <Step n={1} done={authenticated} active={!authenticated} title="Вход в кабинет клиники">
                        <p className="text-sm text-muted">Войдите или зарегистрируйтесь — доступ к кабинету получит только этот аккаунт.</p>
                        <div className="cluster">
                            <LinkButton href={`/login?intended=${encodeURIComponent(`/offer/${offer_token}/claim`)}`}>Войти</LinkButton>
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

                    {sms.required ? (
                        <Step n={3} done={sms.verified} active={authenticated && email_verified && !sms.verified} title="Код из SMS на номер клиники">
                            <p className="text-sm text-muted">Код придёт на номер клиники {sms.phone} из её карточки — так мы убедимся, что вы представляете клинику.</p>
                            <Button type="button" variant="outline" size="sm" onClick={() => router.post(`${claimUrl}/code`, {}, { preserveScroll: true })}>
                                Получить код
                            </Button>
                        </Step>
                    ) : null}

                    <Step n={sms.required ? 4 : 3} done={false} active={authenticated && email_verified} title="Соглашение и публикация">
                        <form onSubmit={submit} className="stack">
                            {needsCode ? (
                                <TextField
                                    label="Код из SMS"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    value={form.data.code}
                                    onChange={(e) => form.setData('code', e.target.value.replace(/\D/g, ''))}
                                    error={form.errors.code}
                                />
                            ) : null}
                            <Check checked={form.data.confirm} onChange={(e) => form.setData('confirm', e.target.checked)} error={form.errors.confirm} label="Подтверждаю, что уполномочен(а) представлять эту клинику" />
                            <Check
                                checked={form.data.agreement}
                                onChange={(e) => form.setData('agreement', e.target.checked)}
                                error={form.errors.agreement}
                                label={
                                    <>
                                        Принимаю{' '}
                                        <a href={agreement_url} className="link" target="_blank" rel="noopener">
                                            соглашение с клиникой
                                        </a>
                                    </>
                                }
                            />
                            <Check
                                checked={form.data.publish}
                                onChange={(e) => form.setData('publish', e.target.checked)}
                                error={form.errors.publish}
                                label="Согласен(на) на публикацию карточки клиники в каталоге после проверки модератором"
                            />
                            <Button type="submit" block size="lg" loading={form.processing} disabled={needsCode && form.data.code.length < 6}>
                                {trial.enabled ? `Подключить и начать ${trial.days} дней бесплатно` : 'Подключить клинику'}
                            </Button>
                        </form>
                    </Step>
                </ol>

                <p className="text-sm text-center">
                    <Link href={`/offer/${offer_token}`} className="link">
                        Вернуться к предложению
                    </Link>
                </p>
            </div>
        </div>
    );
}
