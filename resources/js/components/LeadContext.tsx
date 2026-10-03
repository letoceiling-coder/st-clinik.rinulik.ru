import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import LeadModal, { type LeadTarget } from './LeadModal';

interface Ctx {
    open: (target: LeadTarget) => void;
}

const LeadCtx = createContext<Ctx>({ open: () => undefined });

export const useLead = () => useContext(LeadCtx);

export function LeadProvider({ children }: { children: ReactNode }) {
    const [target, setTarget] = useState<LeadTarget | null>(null);
    const open = useCallback((t: LeadTarget) => setTarget(t), []);
    const value = useMemo(() => ({ open }), [open]);

    return (
        <LeadCtx.Provider value={value}>
            {children}
            <LeadModal target={target} onClose={() => setTarget(null)} />
        </LeadCtx.Provider>
    );
}
