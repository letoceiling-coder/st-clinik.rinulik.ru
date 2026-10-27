import { router } from '@inertiajs/react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import LeadModal, { type LeadTarget } from './LeadModal';

interface Ctx {
    open: (target: LeadTarget) => void;
    callback: (target: LeadTarget) => void;
}

function bookingUrl(target: LeadTarget): string {
    const q = new URLSearchParams();
    if (target.doctorId) q.set('doctor', String(target.doctorId));
    if (target.serviceId) q.set('service', String(target.serviceId));
    const qs = q.toString();

    return `/clinics/${target.slug}/booking${qs ? `?${qs}` : ''}`;
}

const LeadCtx = createContext<Ctx>({ open: () => undefined, callback: () => undefined });

export const useLead = () => useContext(LeadCtx);

export function LeadProvider({ children }: { children: ReactNode }) {
    const [target, setTarget] = useState<LeadTarget | null>(null);
    const open = useCallback((t: LeadTarget) => {
        router.visit(bookingUrl(t));
    }, []);
    const callback = useCallback((t: LeadTarget) => setTarget(t), []);
    const value = useMemo(() => ({ open, callback }), [open, callback]);

    return (
        <LeadCtx.Provider value={value}>
            {children}
            <LeadModal target={target} onClose={() => setTarget(null)} />
        </LeadCtx.Provider>
    );
}
