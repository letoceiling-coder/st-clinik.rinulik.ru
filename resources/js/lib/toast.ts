export type ToastKind = 'info' | 'error';
export interface ToastItem {
    id: number;
    text: string;
    kind: ToastKind;
}

let seq = 0;
const subs = new Set<(t: ToastItem) => void>();

export function notify(text: string, kind: ToastKind = 'info') {
    const item = { id: ++seq, text, kind };
    subs.forEach((s) => s(item));
}

export function subscribeToasts(fn: (t: ToastItem) => void) {
    subs.add(fn);
    return () => {
        subs.delete(fn);
    };
}
