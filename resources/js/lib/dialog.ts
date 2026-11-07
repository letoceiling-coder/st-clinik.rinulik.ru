/**
 * Диалоги в стиле сайта вместо window.confirm / window.prompt.
 * Вызываются из любого обработчика: `if (!(await confirmDialog({ ... }))) return;`.
 * Отрисовывает их DialogHost, который подключён вместе с уведомлениями во всех макетах.
 */

export interface ConfirmOptions {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** Красная кнопка подтверждения — для удаления и необратимых действий. */
    danger?: boolean;
}

export interface PromptOptions extends ConfirmOptions {
    label?: string;
    placeholder?: string;
    defaultValue?: string;
    /** Пустой ответ не принимается. */
    required?: boolean;
    multiline?: boolean;
    inputMode?: 'text' | 'numeric' | 'decimal';
}

export type DialogRequest =
    | { id: number; kind: 'confirm'; options: ConfirmOptions; resolve: (value: boolean) => void }
    | { id: number; kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void };

let seq = 0;
let host: ((request: DialogRequest) => void) | null = null;

export function registerDialogHost(fn: (request: DialogRequest) => void) {
    host = fn;
    return () => {
        if (host === fn) host = null;
    };
}

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
        if (!host) {
            resolve(window.confirm([options.title, options.message].filter(Boolean).join('\n\n')));
            return;
        }
        host({ id: ++seq, kind: 'confirm', options, resolve });
    });
}

/** Возвращает введённый текст или null, если пользователь отменил. */
export function promptDialog(options: PromptOptions): Promise<string | null> {
    return new Promise((resolve) => {
        if (!host) {
            resolve(window.prompt(options.title, options.defaultValue ?? ''));
            return;
        }
        host({ id: ++seq, kind: 'prompt', options, resolve });
    });
}
