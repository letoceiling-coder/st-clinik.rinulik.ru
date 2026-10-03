import { Link } from '@inertiajs/react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useCity } from '@/lib/city';
import { COMPARE_LIMIT, useCollections } from '@/lib/collections';
import { useEntities } from '@/lib/entities';
import { cx, doctorsWord, money, priceFrom, reviewsWord, yearsWord } from '@/lib/format';
import type { ClinicDetailData, DoctorData, EntityType } from '@/lib/types';
import ClinicCard, { ClinicCardSkeleton } from './ClinicCard';
import DoctorCard from './DoctorCard';
import Icon from './Icon';
import { Button, IconButton, LinkButton } from './ui/Button';
import { Alert, EmptyState, ErrorState, Skeleton, Tabs } from './ui/Misc';

function useKinds(kind: 'favorite' | 'compare') {
    const { state } = useCollections();
    const clinicIds = state[kind].clinic;
    const doctorIds = state[kind].doctor;
    const [type, setType] = useState<EntityType>(clinicIds.length || !doctorIds.length ? 'clinic' : 'doctor');
    return { type, setType, clinicIds, doctorIds, ids: type === 'clinic' ? clinicIds : doctorIds };
}

function Empty({ kind, type }: { kind: 'favorite' | 'compare'; type: EntityType }) {
    const city = useCity();
    const what = type === 'clinic' ? 'клиник' : 'врачей';
    return (
        <EmptyState
            icon={kind === 'favorite' ? 'heart' : 'scale'}
            title={kind === 'favorite' ? `Здесь появятся избранные ${what}` : `Добавьте ${what} к сравнению`}
            text={kind === 'favorite' ? 'Нажмите на сердечко в карточке, чтобы вернуться к варианту позже.' : `Выберите от 2 до ${COMPARE_LIMIT} позиций, чтобы увидеть различия в цене, рейтинге и условиях.`}
            action={<LinkButton href={city.path(type === 'clinic' ? 'clinics' : 'doctors')}>Перейти в каталог</LinkButton>}
        />
    );
}

export function FavoritesView() {
    const { type, setType, clinicIds, doctorIds, ids } = useKinds('favorite');
    const { items, loading, error } = useEntities<ClinicDetailData | DoctorData>(type, ids);
    const { isGuest } = useCollections();

    return (
        <div className="stack-lg">
            <Tabs
                label="Тип избранного"
                value={type}
                onChange={setType}
                items={[
                    { key: 'clinic', label: 'Клиники', count: clinicIds.length },
                    { key: 'doctor', label: 'Врачи', count: doctorIds.length },
                ]}
            />
            {isGuest ? (
                <Alert tone="muted" icon="info">
                    Избранное хранится в этом браузере. <Link href="/login" className="link">Войдите</Link>, чтобы сохранить его в аккаунте.
                </Alert>
            ) : null}
            {ids.length === 0 ? (
                <Empty kind="favorite" type={type} />
            ) : error ? (
                <ErrorState title="Не удалось загрузить избранное" text="Проверьте соединение и повторите попытку." action={<Button onClick={() => window.location.reload()}>Обновить</Button>} />
            ) : loading && items.length === 0 ? (
                <div className="stack-lg">
                    <ClinicCardSkeleton />
                    <ClinicCardSkeleton />
                </div>
            ) : type === 'clinic' ? (
                <div className="stack-lg">
                    {(items as ClinicDetailData[]).map((c) => (
                        <ClinicCard key={c.id} clinic={c} />
                    ))}
                </div>
            ) : (
                <div className="grid grid--doctors grid--2">
                    {(items as DoctorData[]).map((d) => (
                        <DoctorCard key={d.id} doctor={d} />
                    ))}
                </div>
            )}
        </div>
    );
}

function Cell({ yes }: { yes: boolean }) {
    return yes ? (
        <span className="yes">
            <Icon name="check-circle" size={20} /> Да
        </span>
    ) : (
        <span className="no">Нет</span>
    );
}

interface Row<T> {
    label: string;
    render: (item: T) => ReactNode;
    best?: (items: T[]) => number | null;
}

function bestIndex<T>(items: T[], pick: (i: T) => number, dir: 'max' | 'min'): number | null {
    const values = items.map(pick);
    const valid = values.filter((v) => v > 0);
    if (items.length < 2 || valid.length === 0) return null;
    const target = dir === 'max' ? Math.max(...valid) : Math.min(...valid);
    const idx = values.indexOf(target);
    return values.filter((v) => v === target).length === items.length ? null : idx;
}

const CLINIC_ROWS: Row<ClinicDetailData>[] = [
    { label: 'Рейтинг', render: (c) => (c.reviews_count ? <span className="rating"><Icon name="star" size={16} />{c.rating.toFixed(1).replace('.', ',')}</span> : '—'), best: (i) => bestIndex(i, (c) => (c.reviews_count ? c.rating : 0), 'max') },
    { label: 'Отзывов', render: (c) => reviewsWord(c.reviews_count), best: (i) => bestIndex(i, (c) => c.reviews_count, 'max') },
    { label: 'Услуги от', render: (c) => priceFrom(c.min_price), best: (i) => bestIndex(i, (c) => c.min_price ?? 0, 'min') },
    { label: 'Врачей', render: (c) => doctorsWord(c.doctors_count) },
    { label: 'Адрес', render: (c) => c.address },
    { label: 'Район', render: (c) => c.district ?? '—' },
    { label: 'Сегодня', render: (c) => c.today },
    { label: 'Круглосуточно', render: (c) => <Cell yes={c.is_24_7} /> },
    { label: 'Запись на сегодня', render: (c) => <Cell yes={c.same_day} /> },
    { label: 'Дети', render: (c) => (c.accepts_children ? (c.children_age_from ? `С ${c.children_age_from} лет` : 'Да') : <Cell yes={false} />) },
    { label: 'Рассрочка', render: (c) => (c.has_installment ? (c.installment_months ? `До ${c.installment_months} мес.` : 'Да') : <Cell yes={false} />) },
    { label: 'ДМС', render: (c) => <Cell yes={c.accepts_dms} /> },
    { label: 'Седация', render: (c) => <Cell yes={c.has_sedation} /> },
    { label: 'Наркоз', render: (c) => <Cell yes={c.has_anesthesia} /> },
    { label: 'Микроскоп', render: (c) => <Cell yes={c.has_microscope} /> },
    { label: 'КТ', render: (c) => <Cell yes={c.has_ct} /> },
    { label: 'Лицензия проверена', render: (c) => <Cell yes={c.license.confirmed} /> },
    { label: 'Оплата', render: (c) => (c.payment_methods.length ? c.payment_methods.join(', ') : '—') },
];

const DOCTOR_ROWS: Row<DoctorData>[] = [
    { label: 'Должность', render: (d) => d.position },
    { label: 'Рейтинг', render: (d) => (d.reviews_count ? <span className="rating"><Icon name="star" size={16} />{d.rating.toFixed(1).replace('.', ',')}</span> : '—'), best: (i) => bestIndex(i, (d) => (d.reviews_count ? d.rating : 0), 'max') },
    { label: 'Отзывов', render: (d) => reviewsWord(d.reviews_count), best: (i) => bestIndex(i, (d) => d.reviews_count, 'max') },
    { label: 'Стаж', render: (d) => yearsWord(d.experience_years), best: (i) => bestIndex(i, (d) => d.experience_years, 'max') },
    { label: 'Приём от', render: (d) => (d.consult_price ? money(d.consult_price) : 'По запросу'), best: (i) => bestIndex(i, (d) => d.consult_price ?? 0, 'min') },
    { label: 'Клиника', render: (d) => d.clinic?.name ?? '—' },
    { label: 'Адрес', render: (d) => d.clinic?.address ?? '—' },
    { label: 'Дети', render: (d) => (d.accepts_children ? (d.children_age_from ? `С ${d.children_age_from} лет` : 'Да') : <Cell yes={false} />) },
    { label: 'Специализация', render: (d) => d.specialties.map((s) => s.name).join(', ') || '—' },
    { label: 'Проверен', render: (d) => <Cell yes={d.is_verified} /> },
];

export function CompareView() {
    const { type, setType, clinicIds, doctorIds, ids } = useKinds('compare');
    const { toggle } = useCollections();
    const { items, loading, error } = useEntities<ClinicDetailData | DoctorData>(type, ids);
    const [onlyDiff, setOnlyDiff] = useState(false);

    const rows = (type === 'clinic' ? CLINIC_ROWS : DOCTOR_ROWS) as Row<ClinicDetailData | DoctorData>[];
    const visible = onlyDiff
        ? rows.filter((r) => {
              const set = new Set(items.map((i) => JSON.stringify(r.render(i), (_k, v) => (typeof v === 'function' ? undefined : v))));
              return set.size > 1;
          })
        : rows;

    return (
        <div className="stack-lg">
            <Tabs
                label="Тип сравнения"
                value={type}
                onChange={setType}
                items={[
                    { key: 'clinic', label: 'Клиники', count: clinicIds.length },
                    { key: 'doctor', label: 'Врачи', count: doctorIds.length },
                ]}
            />

            {ids.length === 0 ? (
                <Empty kind="compare" type={type} />
            ) : error ? (
                <ErrorState title="Не удалось загрузить сравнение" action={<Button onClick={() => window.location.reload()}>Обновить</Button>} />
            ) : loading && items.length === 0 ? (
                <Skeleton h={360} r={20} />
            ) : (
                <>
                    {ids.length < 2 ? (
                        <Alert tone="muted" icon="info">
                            Добавьте ещё хотя бы одну позицию — тогда лучшие значения будут подсвечены.
                        </Alert>
                    ) : (
                        <label className="switch">
                            <input type="checkbox" role="switch" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} />
                            <span>Показывать только отличия</span>
                        </label>
                    )}
                    <div className="compare-wrap">
                        <table className="compare">
                            <thead>
                                <tr>
                                    <th scope="col" className="compare__corner">
                                        <span className="visually-hidden">Параметр</span>
                                    </th>
                                    {items.map((i) => {
                                        const href = type === 'clinic' ? `/clinics/${i.slug}` : `/doctors/${i.slug}`;
                                        return (
                                            <th scope="col" key={i.id}>
                                                <div className="compare__head">
                                                    <IconButton icon="x" label={`Убрать «${i.name}» из сравнения`} variant="secondary" round onClick={() => toggle('compare', type, i.id)} className="compare__remove" />
                                                    <Link href={href} className="compare__name">
                                                        {i.name}
                                                    </Link>
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {visible.map((r) => {
                                    const best = r.best?.(items) ?? null;
                                    return (
                                        <tr key={r.label}>
                                            <th scope="row">{r.label}</th>
                                            {items.map((i, idx) => (
                                                <td key={i.id} className={cx(best === idx && 'is-best')}>
                                                    {r.render(i)}
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-muted">Цены «от»; итоговая стоимость определяется после осмотра. Лучшие значения выделены цветом.</p>
                </>
            )}
        </div>
    );
}
