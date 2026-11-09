import { router } from '@inertiajs/react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Misc';
import { confirmDialog } from '@/lib/dialog';

export interface PendingRevision {
    id: number;
    submitted_at: string | null;
    fields: string[];
}

/** Плашка в кабинете: правка отправлена модератору, на сайте пока прежняя версия. */
export default function PendingChanges({ revision }: { revision: PendingRevision | null | undefined }) {
    if (!revision) return null;

    const withdraw = async () => {
        const ok = await confirmDialog({
            title: 'Отозвать изменения?',
            message: 'Модератор не будет их проверять, на сайте останется текущая версия.',
            confirmLabel: 'Отозвать',
        });
        if (ok) router.post(`/clinic-cabinet/revisions/${revision.id}/withdraw`, {}, { preserveScroll: true });
    };

    return (
        <Alert tone="warning" icon="clock">
            <div className="stack">
                <span>
                    <b>Изменения на модерации</b>
                    {revision.submitted_at ? ` с ${revision.submitted_at}` : ''}. Пока их не проверят, пациенты видят прежнюю версию.
                    {revision.fields.length > 0 ? ` Изменено: ${revision.fields.join(', ')}.` : ''} В форме ниже — отправленные вами значения.
                </span>
                <div>
                    <Button type="button" size="sm" variant="ghost" onClick={withdraw}>
                        Отозвать изменения
                    </Button>
                </div>
            </div>
        </Alert>
    );
}
