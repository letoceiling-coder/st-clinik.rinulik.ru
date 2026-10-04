import { useEffect, useId, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import Icon from '@/components/Icon';
import { cx } from '@/lib/format';

function pickFile(files: FileList | null | undefined, accept: string): File | null {
    const file = files?.[0];
    if (!file) {
        return null;
    }
    if (accept === 'image/*' && !file.type.startsWith('image/')) {
        return null;
    }

    return file;
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
}) {
    const id = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [dragging, setDragging] = useState(false);
    const [localPreview, setLocalPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!value) {
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
                            <Icon name="upload" size={22} />
                        </span>
                        <span className="file-dropzone__title">
                            {dragging ? 'Отпустите файл' : 'Перетащите фото сюда'}
                        </span>
                        <span className="file-dropzone__text">или нажмите, чтобы выбрать</span>
                        {value ? <span className="file-dropzone__name">{value.name}</span> : null}
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
