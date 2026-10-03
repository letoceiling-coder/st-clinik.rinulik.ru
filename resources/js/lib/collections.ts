import { router, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { notify } from './toast';
import type { CollectionKind, CollectionState, EntityType, SharedProps } from './types';

const KEY = 'stk.collections.v1';
export const COMPARE_LIMIT = 4;

const empty = (): CollectionState => ({
    favorite: { clinic: [], doctor: [] },
    compare: { clinic: [], doctor: [] },
});

const EMPTY = empty();
let guest: CollectionState | null = null;
const listeners = new Set<() => void>();

function load(): CollectionState {
    if (guest) return guest;
    try {
        const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
        const base = empty();
        (['favorite', 'compare'] as CollectionKind[]).forEach((k) =>
            (['clinic', 'doctor'] as EntityType[]).forEach((t) => {
                const list = raw?.[k]?.[t];
                if (Array.isArray(list)) base[k][t] = list.map(Number).filter(Boolean);
            }),
        );
        guest = base;
    } catch {
        guest = empty();
    }
    return guest;
}

function save(next: CollectionState) {
    guest = next;
    try {
        localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
        /* приватный режим: храним только в памяти */
    }
    listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
    listeners.add(cb);
    const onStorage = (e: StorageEvent) => {
        if (e.key === KEY) {
            guest = null;
            cb();
        }
    };
    window.addEventListener('storage', onStorage);
    return () => {
        listeners.delete(cb);
        window.removeEventListener('storage', onStorage);
    };
}

export function guestHasItems(): boolean {
    const s = load();
    return (['favorite', 'compare'] as CollectionKind[]).some((k) => s[k].clinic.length + s[k].doctor.length > 0);
}

export function guestSnapshot(): CollectionState {
    return load();
}

export function clearGuest() {
    save(empty());
}

export function useCollections() {
    const { props } = usePage<SharedProps>();
    const user = props.auth.user;
    const guestState = useSyncExternalStore(subscribe, load, () => EMPTY);
    const state: CollectionState = user ? (props.collections ?? EMPTY) : guestState;

    const has = useCallback((kind: CollectionKind, type: EntityType, id: number) => state[kind][type].includes(id), [state]);
    const count = useCallback((kind: CollectionKind) => state[kind].clinic.length + state[kind].doctor.length, [state]);

    const toggle = useCallback(
        (kind: CollectionKind, type: EntityType, id: number) => {
            const label = kind === 'favorite' ? 'избранное' : 'сравнение';
            if (user) {
                router.post(
                    '/collections/toggle',
                    { kind, entity_type: type, entity_id: id },
                    { preserveScroll: true, preserveState: true, only: ['collections', 'flash', 'errors'] },
                );
                return;
            }
            const s = load();
            const list = s[kind][type];
            const exists = list.includes(id);
            if (!exists && kind === 'compare' && list.length >= COMPARE_LIMIT) {
                notify(`В сравнение можно добавить не более ${COMPARE_LIMIT} позиций.`, 'error');
                return;
            }
            const next: CollectionState = {
                ...s,
                [kind]: { ...s[kind], [type]: exists ? list.filter((i) => i !== id) : [...list, id] },
            };
            save(next);
            notify(exists ? `Убрано из раздела «${label}»` : `Добавлено в раздел «${label}»`);
        },
        [user],
    );

    return { state, has, count, toggle, isGuest: !user };
}

/** После входа переносит гостевые избранное/сравнение в аккаунт. */
export function useGuestSync() {
    const { props } = usePage<SharedProps>();
    const userId = props.auth.user?.id;
    useEffect(() => {
        if (!userId || !guestHasItems()) return;
        router.post('/collections/sync', guestSnapshot() as never, {
            preserveScroll: true,
            preserveState: true,
            only: ['collections', 'flash'],
            onSuccess: () => clearGuest(),
        });
    }, [userId]);
}
