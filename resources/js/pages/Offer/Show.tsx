import { Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import ClinicCard from '@/components/ClinicCard';
import { AnchorButton, Button } from '@/components/ui/Button';
import { Check, PhoneField, TextArea, TextField } from '@/components/ui/Fields';
import Icon from '@/components/Icon';
import { Alert } from '@/components/ui/Misc';
import { money } from '@/lib/format';
import type { ClinicCardData, SharedProps } from '@/lib/types';

interface Props {
    offer: { title: string; html: string; token: string; applied: boolean };
    clinic: ClinicCardData;
    stats: {
        city: string | null;
        yandex_rating: number | null;
        yandex_reviews: number;
        competitors: number;
        platform_clinics: number;
        platform_views: string;
    };
    tariffs: { name: string; description: string | null; price: number | null; days: number }[];
    plans: { name: string; description: string | null; price: number; days: number; is_free: boolean; limits: string[]; features: string[] }[];
    prepared: { label: string; value: string | null; done: boolean }[];
    extra_html: string | null;
    trial: { enabled: boolean; days: number };
    preview_url: string;
    about_url: string;
    demo_url: string | null;
    claim_url: string | null;
    manager: { name?: string; phone?: string; email?: string };
}

export default function OfferShow({ offer, clinic, stats, tariffs, plans, prepared, extra_html, trial, preview_url, about_url, demo_url, claim_url, manager }: Props) {
    const { flash } = usePage<SharedProps>().props;
    const form = useForm({ name: '', phone: '', email: '', position: '', comment: '', consent: false });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(`/offer/${offer.token}/apply`, { preserveScroll: true, onSuccess: () => form.reset() });
    };
    const sent = offer.applied || Boolean(flash?.success);

    return (
        <div className="container offer-page">
            <section className="offer-hero card">
                <div className="offer-hero__text stack">
                    <span className="offer-hero__eyebrow text-sm">Персональное предложение{stats.city ? ` · ${stats.city}` : ''}</span>
                    <h1 className="offer-hero__title">{offer.title}</h1>
                    <div className="offer-hero__actions">
                        {claim_url ? (
                            <AnchorButton href={claim_url} size="lg">
                                {trial.enabled ? `Попробовать бесплатно ${trial.days} дней` : 'Подключить клинику'}
                            </AnchorButton>
                        ) : (
                            <AnchorButton href="#connect" size="lg">
                                Подключиться
                            </AnchorButton>
                        )}
                        {demo_url ? (
                            <AnchorButton href={demo_url} size="lg" variant="outline" icon="eye">
                                Демо-кабинет клиники
                            </AnchorButton>
                        ) : null}
                    </div>
                    <ul className="offer-links">
                        <li>
                            <a className="link" href={preview_url} target="_blank" rel="noopener">
                                <Icon name="globe" size={16} /> Как будет выглядеть страница клиники
                            </a>
                        </li>
                        <li>
                            <a className="link" href={about_url} target="_blank" rel="noopener">
                                <Icon name="file" size={16} /> Подробнее о сервисе и возможностях
                            </a>
                        </li>
                    </ul>
                    <p className="text-xs text-muted">Демо-кабинет открывается без регистрации и только для просмотра — данные заявок в нём примерные.</p>
                </div>
                <div className="offer-hero__preview" aria-label="Так клиника выглядит в каталоге">
                    <span className="text-xs text-muted">Так «{clinic.name}» увидят пациенты</span>
                    <ClinicCard clinic={clinic} layout="tile" interactive={false} />
                </div>
            </section>

            {flash?.error ? <Alert tone="warning">{flash.error}</Alert> : null}

            <section className="offer-stats" aria-label="Клиника и город">
                <Stat label="Рейтинг на Яндекс Картах" value={stats.yandex_rating ? stats.yandex_rating.toFixed(1).replace('.', ',') : '—'} hint={`${stats.yandex_reviews} отзывов`} />
                <Stat label={`Стоматологий${stats.city ? ` в городе ${stats.city}` : ''}`} value={String(stats.competitors)} hint="ваши конкуренты за пациента" />
                <Stat label="Клиник уже на МирКлиник" value={String(stats.platform_clinics)} hint="в этом городе" />
                <Stat label="Просмотров карточек клиник" value={stats.platform_views} hint="в этом городе" />
            </section>

            {offer.html ? <article className="offer-body card" dangerouslySetInnerHTML={{ __html: offer.html }} /> : null}

            {extra_html ? (
                <section className="offer-extra card" aria-label="Специальное предложение">
                    <span className="offer-extra__badge">
                        <Icon name="sparkle" size={16} /> Специально для вас
                    </span>
                    <div className="offer-body" dangerouslySetInnerHTML={{ __html: extra_html }} />
                </section>
            ) : null}

            <section className="stack">
                <h2 className="offer-section-title">Мы уже подготовили вашу карточку</h2>
                <p className="text-sm text-muted">Данные собраны из открытых источников. После подключения вы сможете проверить и дополнить их в кабинете.</p>
                <ul className="offer-prepared">
                    {prepared.map((item) => (
                        <li key={item.label} className={item.done ? 'is-done' : ''}>
                            <Icon name={item.done ? 'check-circle' : 'plus'} size={20} />
                            <span>
                                <b>{item.label}</b>
                                <span className="text-sm text-muted">{item.done ? (item.value ?? 'заполнено') : 'добавите в кабинете'}</span>
                            </span>
                        </li>
                    ))}
                </ul>
            </section>

            {plans.length > 0 ? (
                <section className="stack">
                    <h2 className="offer-section-title">Тарифы</h2>
                    {trial.enabled ? (
                        <p className="text-sm">
                            <b>Первые {trial.days} дней — бесплатно</b> с полным набором возможностей, без привязки карты.
                        </p>
                    ) : null}
                    <div className="offer-tariffs">
                        {plans.map((t) => (
                            <div key={t.name} className="offer-tariff card">
                                <b>{t.name}</b>
                                {t.description ? <p className="text-sm text-muted">{t.description}</p> : null}
                                <div className="offer-tariff__price">
                                    {t.is_free ? 'Бесплатно' : money(t.price)}
                                    {t.is_free ? null : <span className="text-sm text-muted"> / {t.days} дн.</span>}
                                </div>
                                <ul className="offer-tariff__list">
                                    {[...t.features, ...t.limits].map((f) => (
                                        <li key={f}>
                                            <Icon name="check" size={16} /> {f}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </section>
            ) : null}

            {tariffs.length > 0 ? (
                <section className="stack">
                    <h2 className="offer-section-title">Продвижение в каталоге</h2>
                    <div className="offer-tariffs">
                        {tariffs.map((t) => (
                            <div key={t.name} className="offer-tariff card">
                                <b>{t.name}</b>
                                {t.description ? <p className="text-sm text-muted">{t.description}</p> : null}
                                <div className="offer-tariff__price">
                                    {t.price !== null ? money(t.price) : 'по запросу'}
                                    <span className="text-sm text-muted"> / {t.days} дн.</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted">Дополнительные пакеты поднимают карточку в выдаче. Цены указаны для вашего города.</p>
                </section>
            ) : null}

            <section id="connect" className="offer-connect card">
                <div className="stack">
                    <h2 className="offer-section-title">Подключиться</h2>
                    <p className="text-sm text-muted">
                        {claim_url
                            ? 'Можно сразу забрать черновик в кабинет (кнопка выше) или оставить заявку — менеджер поможет с подключением.'
                            : 'Оставьте контакты — менеджер подтвердит, что вы представляете клинику, и передаст доступ к кабинету. Карточка уже заполнена, останется проверить данные.'}
                    </p>
                    {manager.name || manager.phone ? (
                        <p className="text-sm">
                            Ваш менеджер: <b>{manager.name}</b>
                            {manager.phone ? (
                                <>
                                    {' · '}
                                    <a className="link" href={`tel:${manager.phone.replace(/[^\d+]/g, '')}`}>
                                        {manager.phone}
                                    </a>
                                </>
                            ) : null}
                        </p>
                    ) : null}
                </div>
                {sent ? (
                    <Alert tone="success" icon="check-circle">
                        Заявка отправлена. Менеджер свяжется с вами в рабочее время.
                    </Alert>
                ) : (
                    <form className="offer-connect__form" onSubmit={submit} noValidate>
                        <TextField label="Имя" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} error={form.errors.name} required autoComplete="name" />
                        <PhoneField label="Телефон" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} error={form.errors.phone} required />
                        <TextField label="Email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} error={form.errors.email} autoComplete="email" />
                        <TextField label="Должность" autoComplete="organization-title" value={form.data.position} onChange={(e) => form.setData('position', e.target.value)} error={form.errors.position} placeholder="Главный врач, администратор…" />
                        <TextArea label="Комментарий" className="offer-connect__wide" rows={3} maxLength={2000} value={form.data.comment} onChange={(e) => form.setData('comment', e.target.value)} error={form.errors.comment} />
                        <Check
                            className="offer-connect__wide"
                            checked={form.data.consent}
                            onChange={(e) => form.setData('consent', e.target.checked)}
                            error={form.errors.consent}
                            label={
                                <>
                                    Согласен на обработку персональных данных (имя, телефон, email) для связи по подключению —{' '}
                                    <Link href="/consent" className="link" target="_blank">
                                        согласие
                                    </Link>
                                </>
                            }
                        />
                        <div className="offer-connect__wide">
                            <Button type="submit" size="lg" loading={form.processing}>
                                Отправить заявку
                            </Button>
                        </div>
                    </form>
                )}
            </section>
        </div>
    );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <div className="offer-stat card">
            <span className="text-sm text-muted">{label}</span>
            <b className="offer-stat__value">{value}</b>
            {hint ? <span className="text-xs text-muted">{hint}</span> : null}
        </div>
    );
}
