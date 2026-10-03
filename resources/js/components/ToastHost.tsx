import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { notify, subscribeToasts, type ToastItem } from '@/lib/toast';
import type { SharedProps } from '@/lib/types';
import Icon from './Icon';

export default function ToastHost() {
    const [items, setItems] = useState<ToastItem[]>([]);
    const { flash } = usePage<SharedProps>().props;

    useEffect(
        () =>
            subscribeToasts((t) => {
                setItems((prev) => [...prev.slice(-2), t]);
                window.setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== t.id)), t.kind === 'error' ? 7000 : 4500);
            }),
        [],
    );

    useEffect(() => {
        if (flash?.success) notify(flash.success);
    }, [flash?.success]);
    useEffect(() => {
        if (flash?.error) notify(flash.error, 'error');
    }, [flash?.error]);

    return (
        <div className="toasts" aria-live="polite" aria-atomic="false">
            {items.map((t) => (
                <div key={t.id} className={`toast toast--${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
                    <Icon name={t.kind === 'error' ? 'alert' : 'check-circle'} size={20} />
                    <span>{t.text}</span>
                    <button className="toast__close" aria-label="Закрыть уведомление" onClick={() => setItems((prev) => prev.filter((i) => i.id !== t.id))}>
                        <Icon name="x" size={18} />
                    </button>
                </div>
            ))}
        </div>
    );
}
