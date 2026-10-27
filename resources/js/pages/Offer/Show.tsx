import { Link, useForm, usePage } from '@inertiajs/react';
import type { FormEvent } from 'react';
import ClinicCard from '@/components/ClinicCard';
import { AnchorButton, Button } from '@/components/ui/Button';
import { Check, PhoneField, TextArea, TextField } from '@/components/ui/Fields';
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
    demo_url: string | null;
    claim_url: string | null;
    manager: { name?: string; phone?: string; email?: string };
}

export default function OfferShow({ offer, clinic, stats, tariffs, demo_url, claim_url, manager }: Props) {
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
                        {demo_url ? (
                            <AnchorButton href={demo_url} size="lg" icon="eye">
                                Открыть демо-кабинет
                            </AnchorButton>
                        ) : null}
                        {claim_url ? (
                            <AnchorButton href={claim_url} size="lg" variant={demo_url ? 'outline' : 'primary'}>
                                Забрать черновик
                            </AnchorButton>
                        ) : (
                            <AnchorButton href="#connect" size="lg" variant={demo_url ? 'outline' : 'primary'}>
                                Подключиться
                            </AnchorButton>
                        )}
                    </div>
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
                <Stat label="Клиник уже на СтомКлиник" value={String(stats.platform_clinics)} hint="в этом городе" />
                <Stat label="Просмотров карточек клиник" value={stats.platform_views} hint="в этом городе" />
            </section>

            {offer.html ? <article className="offer-body card" dangerouslySetInnerHTML={{ __html: offer.html }} /> : null}

            {tariffs.length > 0 ? (
                <section className="stack">
                    <h2 className="offer-section-title">Тарифы продвижения</h2>
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
                    <p className="text-xs text-muted">Базовое размещение карточки бесплатно. Цены указаны для вашего города.</p>
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
