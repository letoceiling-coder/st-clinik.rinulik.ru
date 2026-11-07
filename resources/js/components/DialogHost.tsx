import { useEffect, useState, type FormEvent } from 'react';
import { registerDialogHost, type DialogRequest } from '@/lib/dialog';
import { Button } from './ui/Button';
import { TextArea, TextField } from './ui/Fields';
import { Modal } from './ui/Overlay';

/** Очередь диалогов подтверждения и ввода: показывает по одному, остальные ждут. */
export default function DialogHost() {
    const [queue, setQueue] = useState<DialogRequest[]>([]);
    const [value, setValue] = useState('');
    const current = queue[0] ?? null;

    useEffect(() => registerDialogHost((request) => setQueue((q) => [...q, request])), []);
    useEffect(() => {
        if (current?.kind === 'prompt') setValue(current.options.defaultValue ?? '');
    }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!current) return null;

    const { options } = current;
    const close = (confirmed: boolean) => {
        if (current.kind === 'confirm') {
            current.resolve(confirmed);
        } else {
            current.resolve(confirmed ? value.trim() : null);
        }
        setQueue((q) => q.slice(1));
    };
    const blocked = current.kind === 'prompt' && current.options.required === true && value.trim() === '';
    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!blocked) close(true);
    };

    return (
        <Modal
            key={current.id}
            open
            sheet={false}
            onClose={() => close(false)}
            title={options.title}
            footer={
                <>
                    <Button variant="ghost" onClick={() => close(false)} data-autofocus={current.kind === 'confirm' && options.danger ? '' : undefined}>
                        {options.cancelLabel ?? 'Отмена'}
                    </Button>
                    <Button
                        type="submit"
                        form={`dialog-${current.id}`}
                        variant={options.danger ? 'danger' : 'primary'}
                        disabled={blocked}
                        data-autofocus={current.kind === 'confirm' && !options.danger ? '' : undefined}
                    >
                        {options.confirmLabel ?? (current.kind === 'prompt' ? 'Сохранить' : 'Подтвердить')}
                    </Button>
                </>
            }
        >
            <form id={`dialog-${current.id}`} className="dialog" onSubmit={submit}>
                {options.message ? <p className="dialog__message">{options.message}</p> : null}
                {current.kind === 'prompt' ? (
                    current.options.multiline ? (
                        <TextArea
                            label={current.options.label}
                            placeholder={current.options.placeholder}
                            value={value}
                            rows={4}
                            maxLength={2000}
                            required={current.options.required}
                            data-autofocus=""
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(e);
                            }}
                        />
                    ) : (
                        <TextField
                            label={current.options.label}
                            placeholder={current.options.placeholder}
                            value={value}
                            inputMode={current.options.inputMode}
                            required={current.options.required}
                            data-autofocus=""
                            onChange={(e) => setValue(e.target.value)}
                        />
                    )
                ) : null}
            </form>
        </Modal>
    );
}
