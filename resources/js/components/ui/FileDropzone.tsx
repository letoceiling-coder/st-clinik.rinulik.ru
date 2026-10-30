import { useEffect, useId, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import Icon from '@/components/Icon';
import { cx } from '@/lib/format';

/** Подходит ли файл под accept: расширения (.csv), точные MIME-типы и шаблоны вида image/*. */
function matchesAccept(file: File, accept: string): boolean {
    const rules = accept.split(',').map((rule) => rule.trim().toLowerCase()).filter(Boolean);
    if (rules.length === 0) {
        return true;
    }
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();

    return rules.some((rule) => {
        if (rule.startsWith('.')) {
            return name.endsWith(rule);
        }
        if (rule.endsWith('/*')) {
            return type.startsWith(rule.slice(0, -1));
        }

        return type === rule;
    });
}

function pickFile(files: FileList | null | undefined, accept: string): File | null {
    const file = files?.[0];

    return file && matchesAccept(file, accept) ? file : null;
}

function formatSize(bytes: number): string {
    return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} КБ` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`;
}

export default function FileDropzone({
    label = 'Файл',
    hint,
    error,
    accept = 'image/*',
    value,
    onChange,
    previewUrl,
    compact = false,
    className,
    title,
}: {
    label?: string;
    hint?: string;
    error?: string;
    accept?: string;
    value: File | null;
    onChange: (file: File | null) => void;
    previewUrl?: string | null;
    compact?: boolean;
    className?: string;
    /** Заголовок в пустом поле; по умолчанию — про фото или про файл, в зависимости от accept. */
    title?: string;
}) {
    const id = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [localPreview, setLocalPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!value || !value.type.startsWith('image/')) {
            setLocalPreview(null);
            return undefined;
        }
        const url = URL.createObjectURL(value);
        setLocalPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [value]);

    const preview = localPreview ?? previewUrl ?? null;

    const setFile = (file: File | null) => {
        onChange(file);
    };

    const onDrop = (event: DragEvent) => {
        event.preventDefault();
        setDragging(false);
        setFile(pickFile(event.dataTransfer.files, accept));
    };

    const onDragOver = (event: DragEvent) => {
        event.preventDefault();
        setDragging(true);
    };

    return (
        <div className={cx('field', className)}>
            {label ? (
                <label className="field__label" htmlFor={id}>
                    {label}
                </label>
            ) : null}
            <div
                className={cx(
                    'file-dropzone',
                    compact && 'file-dropzone--compact',
                    dragging && 'is-dragover',
                    (value || preview) && 'has-file',
                    error && 'is-invalid',
                )}
                onDragEnter={onDragOver}
                onDragOver={onDragOver}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        inputRef.current?.click();
                    }
                }}
                role="button"
                tabIndex={0}
                aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
            >
                <input
                    ref={inputRef}
                    id={id}
                    type="file"
                    accept={accept}
                    className="file-dropzone__input"
                    onChange={(event) => setFile(pickFile(event.target.files, accept))}
                />
                {preview ? (
                    <div className="file-dropzone__preview">
                        <img src={preview} alt="" />
                        <div className="file-dropzone__overlay">
                            <Icon name="upload" size={20} />
                            <span>{value ? value.name : 'Заменить файл'}</span>
                        </div>
                    </div>
                ) : (
                    <div className="file-dropzone__body">
                        <span className="file-dropzone__icon" aria-hidden="true">
                            <Icon name={value ? 'file' : 'upload'} size={22} />
                        </span>
                        <span className="file-dropzone__title">
                            {dragging ? 'Отпустите файл' : value ? value.name : (title ?? (accept.startsWith('image/') ? 'Перетащите фото сюда' : 'Перетащите файл сюда'))}
                        </span>
                        <span className="file-dropzone__text">
                            {value ? `${formatSize(value.size)} · нажмите, чтобы заменить` : 'или нажмите, чтобы выбрать'}
                        </span>
                    </div>
                )}
            </div>
            {value ? (
                <button
                    type="button"
                    className="file-dropzone__clear link text-sm"
                    onClick={(event) => {
                        event.stopPropagation();
                        setFile(null);
                        if (inputRef.current) {
                            inputRef.current.value = '';
                        }
                    }}
                >
                    Убрать файл
                </button>
            ) : null}
            {error ? (
                <p className="field__error" id={`${id}-err`} role="alert">
                    {error}
                </p>
            ) : hint ? (
                <p className="field__hint" id={`${id}-hint`}>
                    {hint}
                </p>
            ) : null}
        </div>
    );
}
