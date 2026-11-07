import { Link, router, useForm } from '@inertiajs/react';
import { useState, type ReactNode } from 'react';
import { PageHead, StatusBadge } from '@/components/Dash';
import Icon from '@/components/Icon';
import { ModerationCard, type ModerationItem } from '@/components/moderation/ModerationCard';
import { PhotoViewer } from '@/components/moderation/PhotoViewer';
import { DoctorArt, PhotoArt } from '@/components/PhotoArt';
import { Button, LinkButton } from '@/components/ui/Button';
import { Check, TextArea } from '@/components/ui/Fields';
import { Alert, Badge } from '@/components/ui/Misc';

type Fact = { label: string; value: string };
type Tone = 'success' | 'warning' | 'danger' | 'info' | undefined;

interface Dossier {
    id: number;
    name: string;
    slug: string;
    status: string;
    status_label: string;
    previous_note: string | null;
    created_at: string | null;
    updated_at: string | null;
    has_owner: boolean;
    organization: { name: string; facts: Fact[] } | null;
    profile: Fact[];
    map_url: string | null;
    texts: { label: string; value: string }[];
    schedule: { day: string; hours: string }[];
    features: string[];
    payment_methods: string[];
    specialties: string[];
    services: { name: string; price: string; duration: string | null; promo: boolean; note: string | null }[];
    doctors: { id: number; name: string; position: string | null; specialties: string; experience: string | null; status: string; status_label: string; photo_url: string | null; art_seed: number }[];
    photos: { id: number; url: string | null; art_seed: number; kind: string; kind_label: string; caption: string | null; status: string; status_label: string }[];
    documents: { id: number; title: string; type: string; number: string | null; issued_at: string | null; expires_at: string | null; status: string; status_label: string; view_url: string | null }[];
    readiness: { percent: number; min: number; items: { label: string; done: boolean; pending: boolean; progress: string | null; weight: number }[] };
    pending_counts: { photo: number; document: number; doctor: number };
    source: { kind: 'owner' | 'parser'; label: string; parsed_id?: number | null; yandex_url?: string | null; yandex_rating?: string | null } | null;
    yandex_prices: { name: string; price: string; service: string | null }[];
}

interface Props {
    clinic: Dossier;
    related: ModerationItem[];
    queue: { total: number; position: number | null; next_id: number | null };
}

const STATUS_TONE: Record<string, Tone> = { pending: 'warning', approved: 'success', published: 'success', rejected: 'danger', draft: undefined, hidden: 'info' };

export default function ModerationClinic({ clinic: c, related, queue }: Props) {
    const [viewer, setViewer] = useState<number | null>(null);
    const viewable = c.photos.filter((p) => p.url);
    const sections = [
        ['photos', `Фото · ${c.photos.length}`],
        ['profile', 'Профиль'],
        ['schedule', 'График и условия'],
        ['services', `Услуги · ${c.services.length}`],
        ['doctors', `Врачи · ${c.doctors.length}`],
        ['documents', `Документы · ${c.documents.length}`],
        ...(related.length > 0 ? [['related', `Ещё на проверке · ${related.length}`]] : []),
        ['decision', 'Решение'],
    ];

    return (
        <div className="stack-lg">
            <PageHead
                title={c.name}
                text={
                    <>
                        <StatusBadge status={c.status} /> {queue.position ? `Клиника ${queue.position} из ${queue.total} на проверке` : `На проверке клиник: ${queue.total}`}
                        {c.updated_at ? ` · изменена ${c.updated_at}` : ''}
                    </>
                }
                action={
                    <div className="row row--wrap" style={{ gap: 8 }}>
                        <LinkButton href="/admin/moderation?type=clinic" size="sm" variant="outline">
                            К очереди
                        </LinkButton>
                        {queue.next_id && queue.next_id !== c.id ? (
                            <LinkButton href={`/admin/moderation/clinic/${queue.next_id}`} size="sm" variant="ghost" iconRight="chevron-right">
                                Следующая
                            </LinkButton>
                        ) : null}
                    </div>
                }
            />

            <nav className="mod-anchors" aria-label="Разделы проверки">
                {sections.map(([id, label]) => (
                    <a key={id} href={`#${id}`} className="chip">
                        {label}
                    </a>
                ))}
            </nav>

            {c.previous_note ? <Alert tone="warning">Прошлое отклонение: {c.previous_note}</Alert> : null}
            {c.source ? (
                <Alert tone="muted">
                    {c.source.label}.
                    {c.source.yandex_rating ? ` Рейтинг в Яндексе: ${c.source.yandex_rating} (на сайт не переносится).` : ''}{' '}
                    {c.source.yandex_url ? (
                        <a href={c.source.yandex_url} target="_blank" rel="noreferrer" className="link">
                            Открыть в Яндекс Картах <Icon name="external" size={14} />
                        </a>
                    ) : null}
                    {c.source.parsed_id ? (
                        <>
                            {' · '}
                            <Link href={`/admin/parser/organizations/${c.source.parsed_id}`} className="link">
                                Карточка парсера
                            </Link>
                        </>
                    ) : null}
                </Alert>
            ) : null}

            <div className="mod-review">
                <div className="mod-review__main stack-lg">
                    <Section id="photos" title="Фото" note={c.photos.length === 0 ? 'Фото нет — на сайте будут иллюстрации.' : 'Нажмите на фото, чтобы открыть крупно. Фото на проверке можно одобрить или отклонить прямо здесь.'}>
                        {c.photos.length > 0 ? (
                            <ul className="mod-gallery">
                                {c.photos.map((p) => {
                                    const viewIndex = viewable.findIndex((v) => v.id === p.id);

                                    return (
                                        <li key={p.id} className={`mod-gallery__item is-${p.status}`}>
                                            {p.url ? (
                                                <button type="button" className="mod-gallery__open" onClick={() => setViewer(viewIndex)} aria-label={`Открыть фото: ${p.kind_label}`}>
                                                    <img src={p.url} alt="" loading="lazy" />
                                                </button>
                                            ) : (
                                                <PhotoArt seed={p.art_seed} kind={p.kind} label={c.name} />
                                            )}
                                            <div className="mod-gallery__meta">
                                                <span className="text-xs">{p.kind_label}</span>
                                                <Badge tone={STATUS_TONE[p.status]}>{p.status_label}</Badge>
                                            </div>
                                            {p.status === 'pending' ? (
                                                <div className="mod-gallery__actions">
                                                    <Button size="sm" onClick={() => router.post(`/admin/moderation/photo/${p.id}`, { decision: 'approve' }, { preserveScroll: true })}>
                                                        Одобрить
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => router.post(`/admin/moderation/photo/${p.id}`, { decision: 'reject' }, { preserveScroll: true })}>
                                                        Отклонить
                                                    </Button>
                                                </div>
                                            ) : null}
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : null}
                    </Section>

                    <Section id="profile" title="Профиль клиники">
                        <Facts rows={c.profile} />
                        {c.map_url ? (
                            <a href={c.map_url} target="_blank" rel="noreferrer" className="link text-sm">
                                Точка на карте <Icon name="external" size={14} />
                            </a>
                        ) : (
                            <p className="mod-flags">
                                <Icon name="alert" size={16} /> Нет координат — клиника не появится на карте.
                            </p>
                        )}
                        {c.texts.length > 0 ? (
                            c.texts.map((t) => (
                                <div key={t.label} className="mod-text">
                                    <span className="mod-text__label">{t.label}</span>
                                    <p>{t.value}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted">Описания нет.</p>
                        )}
                        {c.organization ? (
                            <div className="stack">
                                <h3 className="mod-subtitle">Организация «{c.organization.name}»</h3>
                                <Facts rows={c.organization.facts} />
                            </div>
                        ) : null}
                    </Section>

                    <Section id="schedule" title="График и условия">
                        <div className="mod-columns">
                            <div className="stack">
                                <h3 className="mod-subtitle">График</h3>
                                {c.schedule.length > 0 ? (
                                    <dl className="mod-schedule">
                                        {c.schedule.map((d) => (
                                            <div key={d.day} className={d.hours === 'выходной' ? 'is-off' : undefined}>
                                                <dt>{d.day}</dt>
                                                <dd>{d.hours}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                ) : (
                                    <p className="text-sm text-muted">Не указан.</p>
                                )}
                            </div>
                            <div className="stack">
                                <h3 className="mod-subtitle">Направления</h3>
                                <Tags items={c.specialties} empty="Не выбраны." />
                                <h3 className="mod-subtitle">Особенности</h3>
                                <Tags items={c.features} empty="Не отмечены." />
                                <h3 className="mod-subtitle">Оплата</h3>
                                <Tags items={c.payment_methods} empty="Не указана." />
                            </div>
                        </div>
                    </Section>

                    <Section id="services" title="Услуги и цены">
                        {c.services.length > 0 ? (
                            <ul className="mod-services">
                                {c.services.map((s, i) => (
                                    <li key={`${s.name}-${i}`}>
                                        <span>
                                            {s.name}
                                            {s.promo ? <Badge tone="success">акция</Badge> : null}
                                            {s.note ? <span className="text-xs text-muted"> · {s.note}</span> : null}
                                        </span>
                                        <span className="mod-services__price">
                                            {s.price}
                                            {s.duration ? <span className="text-xs text-muted"> · {s.duration}</span> : null}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted">Услуг нет — клинику не найдут по запросам вроде «имплантация».</p>
                        )}
                        {c.yandex_prices.length > 0 ? (
                            <details className="mod-checklist-wrap">
                                <summary>
                                    Прайс из Яндекс Карт · {c.yandex_prices.length} позиций, сопоставлено {c.yandex_prices.filter((p) => p.service).length}
                                </summary>
                                <p className="text-xs text-muted">Цены услуг выше собраны из этих позиций: «от» — минимальная цена, «до» — если разброс небольшой. Несопоставленные позиции на сайт не попадают.</p>
                                <ul className="mod-services">
                                    {c.yandex_prices.map((p, i) => (
                                        <li key={`${p.name}-${i}`}>
                                            <span>
                                                {p.name}
                                                <span className={`text-xs ${p.service ? 'text-muted' : 'parser-warn'}`}> → {p.service ?? 'не сопоставлено'}</span>
                                            </span>
                                            <span className="mod-services__price">{p.price || '—'}</span>
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        ) : null}
                    </Section>

                    <Section id="doctors" title="Врачи">
                        {c.doctors.length > 0 ? (
                            <ul className="mod-people">
                                {c.doctors.map((d) => (
                                    <li key={d.id}>
                                        <span className="mod-people__photo">{d.photo_url ? <img src={d.photo_url} alt="" loading="lazy" /> : <DoctorArt seed={d.art_seed} name={d.name} />}</span>
                                        <span className="mod-people__text">
                                            <b>{d.name}</b>
                                            <span className="text-sm text-muted">{[d.position, d.specialties, d.experience].filter(Boolean).join(' · ') || 'без описания'}</span>
                                        </span>
                                        <Badge tone={STATUS_TONE[d.status]}>{d.status_label}</Badge>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted">Врачи не добавлены.</p>
                        )}
                    </Section>

                    <Section id="documents" title="Документы">
                        {c.documents.length > 0 ? (
                            <ul className="mod-people">
                                {c.documents.map((d) => (
                                    <li key={d.id}>
                                        <span className="mod-people__photo mod-people__photo--icon">
                                            <Icon name="file" size={22} />
                                        </span>
                                        <span className="mod-people__text">
                                            <b>
                                                {d.type}: {d.title}
                                            </b>
                                            <span className="text-sm text-muted">
                                                {[d.number ? `№ ${d.number}` : 'без номера', d.issued_at ? `выдан ${d.issued_at}` : null, d.expires_at ? `до ${d.expires_at}` : 'бессрочно'].filter(Boolean).join(' · ')}
                                            </span>
                                            {d.view_url ? (
                                                <a href={d.view_url} target="_blank" rel="noreferrer" className="link text-sm">
                                                    Открыть файл <Icon name="external" size={14} />
                                                </a>
                                            ) : (
                                                <span className="text-sm parser-warn">Файл не приложен</span>
                                            )}
                                        </span>
                                        <Badge tone={STATUS_TONE[d.status]}>{d.status_label}</Badge>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted">Документов нет. Лицензия не подтверждена — отметки «Лицензия проверена» на карточке не будет.</p>
                        )}
                    </Section>

                    {related.length > 0 ? (
                        <Section id="related" title="Ещё на проверке у этой клиники" note="Врачи, документы и отзывы этой клиники из общей очереди.">
                            <div className="stack">
                                {related.map((item) => (
                                    <ModerationCard key={`${item.type}-${item.id}`} item={item} compact />
                                ))}
                            </div>
                        </Section>
                    ) : null}
                </div>

                <aside className="mod-review__aside">
                    <Decision c={c} />
                </aside>
            </div>

            <PhotoViewer photos={viewable.map((p) => ({ url: p.url!, caption: p.kind_label }))} index={viewer} onIndex={setViewer} title={c.name} />
        </div>
    );
}

function Decision({ c }: { c: Dossier }) {
    const pendingPhotos = c.pending_counts.photo;
    const form = useForm({ decision: 'approve', note: '', publish: false, approve_photos: pendingPhotos > 0, next: true });
    const send = (decision: 'approve' | 'reject', publish = false) => {
        form.transform((d) => ({ ...d, decision, publish }));
        form.post(`/admin/moderation/clinic/${c.id}`, { preserveScroll: true });
    };
    const ready = c.readiness.percent >= c.readiness.min;

    return (
        <section id="decision" className="card stack mod-decision" aria-label="Решение по клинике">
            <div className="stack">
                <div className="row row--between">
                    <h2 className="card-title" style={{ margin: 0 }}>
                        Профиль заполнен на {c.readiness.percent}%
                    </h2>
                    <Badge tone={ready ? 'success' : 'warning'}>{ready ? 'достаточно' : `нужно ${c.readiness.min}%`}</Badge>
                </div>
                <div className="mod-progress" role="progressbar" aria-valuenow={c.readiness.percent} aria-valuemin={0} aria-valuemax={100}>
                    <span style={{ width: `${Math.min(c.readiness.percent, 100)}%` }} />
                </div>
            </div>

            {c.status !== 'pending' ? (
                <Alert tone="info">Решение уже принято: «{c.status_label}».</Alert>
            ) : (
                <>
                    {pendingPhotos > 0 ? <Check label={`Одобрить и фото на проверке (${pendingPhotos})`} checked={form.data.approve_photos} onChange={(e) => form.setData('approve_photos', e.target.checked)} /> : null}
                    <TextArea
                        label="Причина отклонения (её увидит клиника)"
                        value={form.data.note}
                        maxLength={500}
                        rows={3}
                        onChange={(e) => form.setData('note', e.target.value)}
                        error={form.errors.note}
                    />
                    <div className="stack">
                        {!c.has_owner ? (
                            <Button block loading={form.processing} onClick={() => send('approve', true)}>
                                <Icon name="check" size={16} /> Одобрить и опубликовать
                            </Button>
                        ) : null}
                        <Button block variant={c.has_owner ? 'primary' : 'outline'} loading={form.processing} onClick={() => send('approve')}>
                            {c.has_owner ? 'Одобрить' : 'Только одобрить'}
                        </Button>
                        <Button block variant="danger" loading={form.processing} onClick={() => send('reject')}>
                            Отклонить
                        </Button>
                    </div>
                    <p className="text-xs text-muted">
                        {c.has_owner
                            ? 'После одобрения владелец получит уведомление и сам опубликует клинику из кабинета.'
                            : 'У клиники нет владельца: «Одобрить и опубликовать» сразу покажет её в каталоге.'}{' '}
                        После решения откроется следующая клиника из очереди.
                    </p>
                </>
            )}
            <details className="mod-checklist-wrap">
                <summary>Чек-лист профиля · {c.readiness.items.filter((i) => i.done).length} из {c.readiness.items.length}</summary>
                <ul className="mod-checklist">
                    {c.readiness.items.map((i) => (
                        <li key={i.label} className={i.done ? 'is-done' : i.pending ? 'is-pending' : undefined}>
                            <Icon name={i.done ? 'check-circle' : i.pending ? 'clock' : 'alert'} size={16} />
                            <span>
                                {i.label}
                                {i.progress && !i.done ? <span className="text-muted"> · {i.progress}</span> : null}
                                {i.pending ? <span className="text-muted"> · на проверке</span> : null}
                            </span>
                        </li>
                    ))}
                </ul>
            </details>
            <div className="row row--wrap" style={{ gap: 12 }}>
                <Link href={`/admin/clinics/${c.id}`} className="link text-sm">
                    Редактировать в админке
                </Link>
                <a href={`/clinics/${c.slug}`} target="_blank" rel="noreferrer" className="link text-sm">
                    Как увидят пациенты <Icon name="external" size={14} />
                </a>
            </div>
        </section>
    );
}

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
    return (
        <section id={id} className="card stack mod-section" aria-labelledby={`${id}-title`}>
            <h2 id={`${id}-title`} className="card-title" style={{ margin: 0 }}>
                {title}
            </h2>
            {note ? <p className="text-sm text-muted">{note}</p> : null}
            {children}
        </section>
    );
}

function Facts({ rows }: { rows: Fact[] }) {
    return rows.length > 0 ? (
        <dl className="mod-facts">
            {rows.map((f) => (
                <div key={f.label}>
                    <dt>{f.label}</dt>
                    <dd>{f.value}</dd>
                </div>
            ))}
        </dl>
    ) : null;
}

function Tags({ items, empty }: { items: string[]; empty: string }) {
    return items.length > 0 ? (
        <div className="mod-tags">
            {items.map((t) => (
                <span key={t} className="chip chip--static">
                    {t}
                </span>
            ))}
        </div>
    ) : (
        <p className="text-sm text-muted">{empty}</p>
    );
}
