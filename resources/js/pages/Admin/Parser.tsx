import { Link, router, useForm, usePoll } from '@inertiajs/react';
import { useEffect, useState, type FormEvent } from 'react';
import { FilterBar, Kpis, PageHead, PagerSafe, Panel } from '@/components/Dash';
import { Button, LinkButton } from '@/components/ui/Button';
import { Check, CitySearchField, SearchInput, SelectField } from '@/components/ui/Fields';
import { Alert, Badge, Tabs } from '@/components/ui/Misc';
import ParserTaskProgress, { formatEta, type CollectInfo } from '@/components/ParserTaskProgress';
import type { Paginated } from '@/lib/types';

type Tab = 'organizations' | 'tasks' | 'base';
type Tone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | undefined;

interface OrgRow {
    id: number;
    external_id: string;
    name: string;
    city: string | null;
    city_known: boolean;
    address: string | null;
    phones: string[];
    website: string | null;
    rating: number | null;
    reviews_count: number;
    status: string;
    clinic_id: number | null;
    has_full_card: boolean;
    emails_count: number;
    match: { id: number; name: string; reason: string | null } | null;
    network_size: number;
    importable: boolean;
    offerable: boolean;
    offer_id: number | null;
}

interface TaskRow extends CollectInfo {
    id: number;
    title: string;
    type: string;
    city: string | null;
    query: string | null;
    max_results: number | null;
    progress: number;
    found: number;
    created: number;
    error: string | null;
    is_final: boolean;
    by: string | null;
    at: string | null;
}

interface BaseCity {
    city: string;
    region: string | null;
    count: number;
    with_phone: number;
    with_website: number;
    avg_rating: number | null;
    updated_at: string | null;
    loaded: number;
    known: boolean;
}

interface Base {
    error: string | null;
    total?: number;
    cities: BaseCity[];
}

interface Props {
    tab: Tab;
    configured: boolean;
    counts: Record<string, number>;
    organizations: Paginated<OrgRow> | null;
    tasks: Paginated<TaskRow> | null;
    base: Base | null;
    cities: { id: number; name: string }[];
    statuses: Record<string, string>;
    search_filters: Record<string, string>;
    task_statuses: Record<string, string>;
    filters: { q?: string; status?: string; city?: string; has?: string; match?: string };
    offer_templates: { id: number; name: string }[];
}

const ORG_TONE: Record<string, Tone> = { new: 'info', reviewed: 'primary', imported: 'success', duplicate: 'warning', ignored: undefined };
const TASK_TONE: Record<string, Tone> = { queued: 'info', running: 'primary', completed: 'success', failed: 'danger', cancelled: undefined, stale: 'warning' };
/** Парсер открывает около 40 карточек в час; задача ограничена 4 часами. */
const CARDS_PER_HOUR = 40;
const AMOUNTS = [10, 20, 45, 80, 120, 150];

const organizationsOf = (city: string | null, cities: Props['cities']): string => {
    const id = cities.find((c) => c.name === city)?.id;

    return `/admin/parser?tab=organizations&status=new${id ? `&city=${id}` : ''}`;
};

const go = (tab: Tab) => router.get('/admin/parser', { tab }, { preserveState: false });

export default function AdminParser(props: Props) {
    const { tab, configured, counts } = props;

    return (
        <div className="stack-lg">
            <PageHead title="Парсер стоматологий" text="Собирает стоматологии с Яндекс Карт. Найденное не публикуется на сайте, пока вы не проверите карточку и не импортируете её в черновик." />

            {!configured ? (
                <Alert tone="warning">
                    Парсер не подключён. Укажите адрес и API-ключ в разделе{' '}
                    <Link href="/admin/integrations#integration-parser" className="link">
                        «Интеграции»
                    </Link>
                    .
                </Alert>
            ) : null}

            <Guide />

            <Kpis
                items={[
                    { label: 'Новые', value: counts.new ?? 0, hint: 'ждут проверки' },
                    { label: 'Проверены', value: counts.reviewed ?? 0 },
                    { label: 'Импортированы', value: counts.imported ?? 0, hint: 'черновики клиник' },
                    { label: 'Похожи на клиники сайта', value: counts.matches ?? 0 },
                    { label: 'Процессов идёт', value: counts.active_tasks ?? 0 },
                ]}
            />

            <Tabs<Tab>
                label="Разделы парсера"
                value={tab}
                onChange={go}
                items={[
                    { key: 'tasks', label: 'Запуск парсинга', count: counts.active_tasks || undefined },
                    { key: 'organizations', label: 'Найденные клиники', count: counts.new || undefined },
                    { key: 'base', label: 'Готовые данные' },
                ]}
            />

            {tab === 'organizations' && props.organizations ? <OrganizationsTab {...props} organizations={props.organizations} /> : null}
            {tab === 'tasks' && props.tasks ? <TasksTab {...props} tasks={props.tasks} /> : null}
            {tab === 'base' && props.base ? <BaseTab base={props.base} configured={configured} /> : null}
        </div>
    );
}

function Guide() {
    return (
        <details className="parser-guide card">
            <summary>
                <b>Как пользоваться парсером</b>
                <span className="text-sm text-muted">4 шага</span>
            </summary>
            <ol className="parser-guide__steps">
                <li>
                    <b>Запустите парсинг.</b> Во вкладке «Запуск парсинга» выберите город и, при необходимости, направление (например, «Детская стоматология»). Ищем всегда
                    только стоматологии — другие организации отбрасываются.
                </li>
                <li>
                    <b>Следите за ходом.</b> Внизу экрана появится индикатор: этап, «собрано N из M» и сколько осталось. Парсер открывает каждую карточку, поэтому это небыстро —
                    около {CARDS_PER_HOUR} клиник в час. Страницу можно закрыть или перейти в другой раздел — по завершении придёт уведомление. Если Яндекс покажет проверку,
                    сбор встанет на паузу и индикатор об этом скажет: пройдите проверку на компьютере-исполнителе, сбор продолжится сам.
                </li>
                <li>
                    <b>Проверьте найденное.</b> Карточки появляются во вкладке «Найденные клиники» уже по ходу сбора. Откройте карточку: сверьте адрес и телефоны. Если клиника уже есть на сайте, система подскажет
                    совпадение — такую карточку отметьте «Дубликат».
                </li>
                <li>
                    <b>Импортируйте.</b> Нажмите «Импортировать» — появится черновик клиники без владельца. На сайте он не виден, пока вы не опубликуете его в разделе «Клиники».
                </li>
            </ol>
            <p className="text-sm text-muted">
                Если город уже собирали раньше, быстрее взять данные во вкладке «Готовые данные» — это бесплатно и занимает меньше минуты. Автоматического запуска нет: парсер
                работает только по вашей команде.
            </p>
        </details>
    );
}

function TasksTab({ tasks, cities, search_filters, task_statuses, configured }: Props & { tasks: Paginated<TaskRow> }) {
    const hasActive = tasks.data.some((t) => !t.is_final);
    const { start, stop } = usePoll(4000, { only: ['tasks', 'counts'] }, { autoStart: false });
    useEffect(() => {
        if (hasActive) {
            start();
        } else {
            stop();
        }

        return stop;
    }, [hasActive, start, stop]);

    const form = useForm({ city: '', query: '', count: 45 });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/admin/parser/tasks', { preserveScroll: true });
    };

    return (
        <div className="stack">
            <Panel title="Новый парсинг">
                <form className="stack" onSubmit={submit}>
                    <div className="parser-form-grid">
                        <SelectField label="Город" value={form.data.city} onChange={(e) => form.setData('city', e.target.value)} error={form.errors.city} required>
                            <option value="">Выберите город</option>
                            {cities.map((c) => (
                                <option key={c.id} value={c.name}>
                                    {c.name}
                                </option>
                            ))}
                        </SelectField>
                        <SelectField label="Направление" value={form.data.query} onChange={(e) => form.setData('query', e.target.value)} error={form.errors.query}>
                            {Object.entries(search_filters).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </SelectField>
                        <SelectField
                            label="Сколько клиник собрать"
                            value={String(form.data.count)}
                            onChange={(e) => form.setData('count', Number(e.target.value))}
                            error={form.errors.count}
                        >
                            {AMOUNTS.map((n) => (
                                <option key={n} value={n}>
                                    {n} — {formatEta((n / CARDS_PER_HOUR) * 3600)}
                                </option>
                            ))}
                        </SelectField>
                    </div>
                    <div className="parser-form-actions">
                        <Button type="submit" loading={form.processing} disabled={!configured || form.processing || form.data.city === ''}>
                            Запустить парсинг
                        </Button>
                        <span className="text-xs text-muted">
                            Парсер открывает каждую карточку на Яндекс Картах и забирает всё: адрес, телефоны, сайт, соцсети, график, услуги и цены, фото, координаты. Около{' '}
                            {CARDS_PER_HOUR} клиник в час — карточки появляются во вкладке «Найденные клиники» по ходу сбора.
                        </span>
                    </div>
                </form>
            </Panel>

            <Panel title="История запусков">
                {tasks.data.length === 0 ? (
                    <p className="text-muted">Парсинг ещё не запускали. Выберите город выше и нажмите «Запустить парсинг».</p>
                ) : (
                    <ul className="parser-list">
                        {tasks.data.map((t) => (
                            <li key={t.id} className={`parser-item${!t.is_final ? ' is-active' : ''}`}>
                                <div className="parser-item__main">
                                    <div className="parser-item__title">
                                        <b>{t.title}</b>
                                        <Badge tone={TASK_TONE[t.status]}>{task_statuses[t.status] ?? t.status}</Badge>
                                    </div>
                                    {!t.is_final ? (
                                        <ParserTaskProgress task={t} />
                                    ) : (
                                        <p className={`text-sm${t.status === 'failed' || t.status === 'stale' ? ' parser-warn' : ''}`}>{t.stage}</p>
                                    )}
                                    <p className="text-xs text-muted">
                                        #{t.id} · {t.by ?? 'система'} · {t.at}
                                        {t.max_results ? ` · лимит ${t.max_results}` : ''}
                                    </p>
                                </div>
                                <div className="parser-item__actions">
                                    {!t.is_final && t.type !== 'base.sync' ? (
                                        <>
                                            <Button size="sm" variant="outline" onClick={() => router.post(`/admin/parser/tasks/${t.id}/refresh`, {}, { preserveScroll: true })}>
                                                Проверить сейчас
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => window.confirm('Остановить парсинг?') && router.post(`/admin/parser/tasks/${t.id}/cancel`, {}, { preserveScroll: true })}
                                            >
                                                Остановить
                                            </Button>
                                        </>
                                    ) : null}
                                    {t.found > 0 ? (
                                        <LinkButton href={organizationsOf(t.city, cities)} size="sm" variant="outline">
                                            Смотреть клиники
                                        </LinkButton>
                                    ) : null}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                <PagerSafe page={tasks} />
            </Panel>
        </div>
    );
}

function OrganizationsTab({ organizations, cities, statuses, filters, offer_templates }: Props & { organizations: Paginated<OrgRow> }) {
    const [selected, setSelected] = useState<number[]>([]);
    const [busy, setBusy] = useState(false);
    const [templateId, setTemplateId] = useState<number | ''>(offer_templates[0]?.id ?? '');
    const importable = organizations.data.filter((o) => o.importable || o.offerable).map((o) => o.id);
    const selectedImportable = organizations.data.filter((o) => o.importable && selected.includes(o.id)).map((o) => o.id);
    const selectedOfferable = organizations.data.filter((o) => o.offerable && selected.includes(o.id)).map((o) => o.id);
    const allSelected = importable.length > 0 && importable.every((id) => selected.includes(id));

    const toggle = (id: number) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
    const bulk = (url: string, data: Record<string, unknown>, confirmText: string) => {
        if (!window.confirm(confirmText)) return;
        router.post(url, { ids: selected, ...data } as never, {
            preserveScroll: true,
            onStart: () => setBusy(true),
            onFinish: () => setBusy(false),
            onSuccess: () => setSelected([]),
        });
    };

    return (
        <div className="stack">
            <FilterBar>
                <input type="hidden" name="tab" value="organizations" />
                <SearchInput name="q" defaultValue={filters.q} placeholder="Название, адрес или id Яндекса" />
                <SelectField name="status" label="Статус" defaultValue={filters.status ?? ''}>
                    <option value="">Все, кроме скрытых</option>
                    {Object.entries(statuses).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </SelectField>
                <CitySearchField cities={cities} defaultValue={filters.city ?? ''} />
                <SelectField name="has" label="Данные" defaultValue={filters.has ?? ''}>
                    <option value="">Любые</option>
                    <option value="website">Есть сайт</option>
                    <option value="no_website">Нет сайта</option>
                    <option value="email">Найден email</option>
                    <option value="messenger">Есть мессенджер или VK</option>
                    <option value="full">Полная карточка</option>
                </SelectField>
                <SelectField name="match" label="Совпадения" defaultValue={filters.match ?? ''}>
                    <option value="">Все</option>
                    <option value="yes">Похожа на клинику сайта</option>
                    <option value="network">Входит в сеть</option>
                </SelectField>
            </FilterBar>

            <div className="parser-toolbar">
                {importable.length > 0 ? (
                    <Check label={`Выбрать все на странице (${importable.length})`} checked={allSelected} onChange={() => setSelected(allSelected ? [] : importable)} />
                ) : (
                    <span className="text-sm text-muted">На странице нет карточек для импорта или КП</span>
                )}
                <span className="text-sm text-muted">
                    Найдено: {organizations.total}
                </span>
            </div>

            {organizations.data.length === 0 ? (
                <Panel>
                    <p className="text-muted">
                        Здесь пока пусто. Запустите парсинг во вкладке{' '}
                        <button type="button" className="link" onClick={() => go('tasks')}>
                            «Запуск парсинга»
                        </button>{' '}
                        или возьмите город из{' '}
                        <button type="button" className="link" onClick={() => go('base')}>
                            «Готовых данных»
                        </button>
                        .
                    </p>
                </Panel>
            ) : (
                <ul className="parser-list">
                    {organizations.data.map((o) => (
                        <li key={o.id} className={`parser-item parser-item--org${selected.includes(o.id) ? ' is-selected' : ''}`}>
                            <label className="check parser-item__check">
                                <input
                                    type="checkbox"
                                    aria-label={`Выбрать «${o.name}»`}
                                    disabled={!o.importable && !o.offerable}
                                    checked={selected.includes(o.id)}
                                    onChange={() => toggle(o.id)}
                                />
                            </label>
                            <div className="parser-item__main">
                                <div className="parser-item__title">
                                    <Link href={`/admin/parser/organizations/${o.id}`} className="link">
                                        <b>{o.name}</b>
                                    </Link>
                                    <Badge tone={ORG_TONE[o.status]}>{statuses[o.status] ?? o.status}</Badge>
                                </div>
                                <p className="text-sm text-muted">
                                    {o.city ?? 'город не указан'}
                                    {o.address ? `, ${o.address}` : ''}
                                </p>
                                <div className="parser-item__meta text-xs">
                                    <span>{o.phones.length > 0 ? `${o.phones[0]}${o.phones.length > 1 ? ` +${o.phones.length - 1}` : ''}` : 'нет телефона'}</span>
                                    <span>{o.website ? 'есть сайт' : 'без сайта'}</span>
                                    {o.emails_count > 0 ? <span>email: {o.emails_count}</span> : null}
                                    <span>
                                        ★ {o.rating ? o.rating.toFixed(1) : '—'} · {o.reviews_count} отз.
                                    </span>
                                    {o.network_size > 1 ? <span>сеть: {o.network_size} филиала</span> : null}
                                </div>
                                {!o.city_known ? <p className="text-xs parser-warn">Города нет в справочнике — сначала добавьте его в «Города», иначе импорт недоступен.</p> : null}
                                {o.match ? (
                                    <p className="text-xs parser-warn">
                                        Похожа на{' '}
                                        <Link href={`/admin/clinics/${o.match.id}`} className="link">
                                            «{o.match.name}»
                                        </Link>
                                        {o.match.reason ? ` — ${o.match.reason}` : ''}
                                    </p>
                                ) : null}
                            </div>
                            <div className="parser-item__actions">
                                {o.offer_id ? (
                                    <LinkButton href={`/admin/offers/${o.offer_id}`} size="sm" variant="ghost">
                                        КП
                                    </LinkButton>
                                ) : null}
                                <LinkButton href={`/admin/parser/organizations/${o.id}`} size="sm" variant="outline">
                                    Открыть
                                </LinkButton>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {selected.length > 0 ? (
                <div className="parser-bulk" role="region" aria-label="Действия с выбранными">
                    <div className="parser-bulk__head">
                        <span className="parser-bulk__count">Выбрано: {selected.length}</span>
                        <button type="button" className="parser-bulk__clear" disabled={busy} onClick={() => setSelected([])}>
                            Снять выбор
                        </button>
                    </div>
                    <div className="parser-bulk__actions">
                        {selectedOfferable.length > 0 && offer_templates.length > 0 ? (
                            <span className="parser-bulk__offer">
                                <select aria-label="Шаблон КП" className="select select--sm" value={templateId} onChange={(e) => setTemplateId(Number(e.target.value))}>
                                    {offer_templates.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    size="sm"
                                    icon="file"
                                    loading={busy}
                                    onClick={() =>
                                        bulk('/admin/offers/bulk', { ids: selectedOfferable, template_id: templateId }, `Сформировать КП для ${selectedOfferable.length} клиник? Новые карточки будут импортированы в черновики.`)
                                    }
                                >
                                    Сформировать КП ({selectedOfferable.length})
                                </Button>
                            </span>
                        ) : null}
                        {selectedImportable.length > 0 ? (
                            <Button size="sm" variant="outline" loading={busy} onClick={() => bulk('/admin/parser/organizations/import', { ids: selectedImportable, photos: true }, `Импортировать ${selectedImportable.length} карточек в черновики клиник?`)}>
                                Импортировать ({selectedImportable.length})
                            </Button>
                        ) : null}
                        <Button size="sm" variant="outline" disabled={busy} onClick={() => bulk('/admin/parser/organizations/status', { status: 'reviewed' }, 'Отметить выбранные как проверенные?')}>
                            Проверены
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busy} onClick={() => bulk('/admin/parser/organizations/status', { status: 'ignored' }, 'Скрыть выбранные карточки?')}>
                            Скрыть
                        </Button>
                    </div>
                </div>
            ) : null}

            <PagerSafe page={organizations} />
        </div>
    );
}

function BaseTab({ base, configured }: { base: Base; configured: boolean }) {
    const [loading, setLoading] = useState<string | null>(null);
    const sync = (city: string) => {
        router.post('/admin/parser/sync', { city }, { preserveScroll: true, onStart: () => setLoading(city), onFinish: () => setLoading(null) });
    };

    if (base.error) {
        return <Alert tone="warning">{base.error}</Alert>;
    }

    return (
        <div className="stack">
            <Alert tone="muted">
                Стоматологии, которые парсер уже собирал раньше (всего {base.total ?? 0}). Кнопка «Загрузить» переносит их к нам в «Найденные клиники» без нового парсинга — быстро и
                бесплатно. Повторная загрузка обновит данные, ваши решения по карточкам сохранятся.
            </Alert>

            {base.cities.length === 0 ? (
                <Panel>
                    <p className="text-muted">Готовых данных по стоматологиям пока нет — запустите парсинг во вкладке «Запуск парсинга».</p>
                </Panel>
            ) : (
                <ul className="parser-list">
                    {base.cities.map((c) => (
                        <li key={c.city} className="parser-item">
                            <div className="parser-item__main">
                                <div className="parser-item__title">
                                    <b>{c.city}</b>
                                    {c.region ? <span className="text-xs text-muted">{c.region}</span> : null}
                                </div>
                                <div className="parser-item__meta text-xs">
                                    <span>
                                        <b>{c.count}</b> клиник
                                    </span>
                                    <span>с телефоном: {c.with_phone}</span>
                                    <span>с сайтом: {c.with_website}</span>
                                    <span>★ {c.avg_rating ?? '—'}</span>
                                    <span>обновлено: {c.updated_at ?? '—'}</span>
                                    <span>у нас: {c.loaded}</span>
                                </div>
                                {!c.known ? <p className="text-xs parser-warn">Города нет в справочнике — загрузить можно, но импорт будет недоступен.</p> : null}
                            </div>
                            <div className="parser-item__actions">
                                <Button size="sm" variant={c.loaded > 0 ? 'outline' : 'primary'} disabled={!configured || loading !== null} loading={loading === c.city} onClick={() => sync(c.city)}>
                                    {c.loaded > 0 ? 'Обновить' : 'Загрузить'}
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
