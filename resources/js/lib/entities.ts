import { useEffect, useState } from 'react';
import type { ClinicDetailData, DoctorData, EntityType } from './types';

type Result<T> = { items: T[]; loading: boolean; error: boolean };

/** Загружает карточки по id через публичный API v1 (в localStorage гостя хранятся только id). */
export function useEntities<T = ClinicDetailData | DoctorData>(type: EntityType, ids: number[]): Result<T> {
    const key = ids.join(',');
    const [state, setState] = useState<Result<T>>({ items: [], loading: ids.length > 0, error: false });

    useEffect(() => {
        if (!key) {
            setState({ items: [], loading: false, error: false });
            return;
        }
        const ctrl = new AbortController();
        setState((s) => ({ ...s, loading: true, error: false }));
        fetch(`/api/v1/${type === 'clinic' ? 'clinics' : 'doctors'}/by-ids?ids=${key}`, {
            signal: ctrl.signal,
            headers: { Accept: 'application/json' },
        })
            .then((r) => (r.ok ? r.json() : Promise.reject(r)))
            .then((j) => setState({ items: j.data as T[], loading: false, error: false }))
            .catch((e) => {
                if (e?.name !== 'AbortError') setState({ items: [], loading: false, error: true });
            });
        return () => ctrl.abort();
    }, [type, key]);

    return state;
}
