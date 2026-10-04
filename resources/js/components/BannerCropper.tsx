import Cropper from 'cropperjs';
import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import Icon from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';
import type { BannerSpec } from '@/lib/banner-specs';
import { cx } from '@/lib/format';

function pickImage(files: FileList | null | undefined): File | null {
    const file = files?.[0];
    if (!file?.type.startsWith('image/')) {
        return null;
    }

    return file;
}

function canvasToFile(canvas: HTMLCanvasElement, fileName: string): Promise<File> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error('Не удалось обработать изображение.'));
                    return;
                }
                resolve(new File([blob], fileName.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg', lastModified: Date.now() }));
            },
            'image/jpeg',
            0.92,
        );
    });
}

export default function BannerCropper({
    spec,
    value,
    onChange,
    label = 'Изображение баннера',
    error,
}: {
    spec: BannerSpec;
    value: File | null;
    onChange: (file: File | null) => void;
    label?: string;
    error?: string;
}) {
    const id = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const cropperRef = useRef<Cropper | null>(null);
    const [dragging, setDragging] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [sourceFile, setSourceFile] = useState<File | null>(null);
    const [sourceUrl, setSourceUrl] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!value) {
            setPreviewUrl(null);
            return undefined;
        }
        const url = URL.createObjectURL(value);
        setPreviewUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [value]);

    useEffect(() => {
        if (!sourceUrl) {
            return undefined;
        }

        return () => URL.revokeObjectURL(sourceUrl);
    }, [sourceUrl]);

    useEffect(() => {
        if (!modalOpen || !sourceUrl || !imageRef.current) {
            return undefined;
        }

        const image = imageRef.current;
        const init = () => {
            cropperRef.current?.destroy();
            cropperRef.current = new Cropper(image, {
                aspectRatio: spec.aspectRatio,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 1,
                responsive: true,
                restore: false,
                guides: true,
                center: true,
                highlight: true,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });
        };

        if (image.complete) {
            init();
        } else {
            image.addEventListener('load', init);
        }

        return () => {
            image.removeEventListener('load', init);
            cropperRef.current?.destroy();
            cropperRef.current = null;
        };
    }, [modalOpen, sourceUrl, spec.aspectRatio]);

    const openCropper = (file: File) => {
        setSourceFile(file);
        setSourceUrl(URL.createObjectURL(file));
        setModalOpen(true);
    };

    const closeCropper = () => {
        setModalOpen(false);
        setSourceFile(null);
        setSourceUrl(null);
        cropperRef.current?.destroy();
        cropperRef.current = null;
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    const applyCrop = async () => {
        const cropper = cropperRef.current;
        if (!cropper || !sourceFile) {
            return;
        }

        setProcessing(true);
        try {
            const canvas = cropper.getCroppedCanvas({
                width: spec.outputWidth,
                height: spec.outputHeight,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });
            const cropped = await canvasToFile(canvas, sourceFile.name);
            onChange(cropped);
            closeCropper();
        } finally {
            setProcessing(false);
        }
    };

    const onPick = (file: File | null) => {
        if (!file) {
            return;
        }
        openCropper(file);
    };

    const onInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        onPick(pickImage(event.target.files));
    };

    const onDrop = (event: DragEvent) => {
        event.preventDefault();
        setDragging(false);
        onPick(pickImage(event.dataTransfer.files));
    };

    return (
        <div className={cx('field', 'banner-cropper', error && 'is-invalid')}>
            <label className="field__label" htmlFor={id}>
                {label}
            </label>
            <p className="field__hint">{spec.hint}</p>
            <div
                className={cx('file-dropzone', dragging && 'is-dragover', previewUrl && 'has-file', error && 'is-invalid')}
                onDragEnter={(e) => {
                    e.preventDefault();
                    setDragging(true);
                }}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                }}
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
            >
                <input ref={inputRef} id={id} type="file" accept="image/jpeg,image/png,image/webp" className="file-dropzone__input" onChange={onInputChange} />
                {previewUrl ? (
                    <div className="file-dropzone__preview">
                        <img src={previewUrl} alt="" />
                        <div className="file-dropzone__overlay">
                            <Icon name="upload" size={20} />
                            <span>Заменить и обрезать</span>
                        </div>
                    </div>
                ) : (
                    <div className="file-dropzone__body">
                        <span className="file-dropzone__icon" aria-hidden="true">
                            <Icon name="upload" size={22} />
                        </span>
                        <span className="file-dropzone__title">{dragging ? 'Отпустите файл' : 'Загрузите изображение баннера'}</span>
                        <span className="file-dropzone__text">После загрузки откроется обрезка под формат {spec.slot === 'home' ? '21:9' : '5:2'}</span>
                    </div>
                )}
            </div>
            {value ? (
                <button
                    type="button"
                    className="file-dropzone__clear link text-sm"
                    onClick={(event) => {
                        event.stopPropagation();
                        onChange(null);
                        if (inputRef.current) {
                            inputRef.current.value = '';
                        }
                    }}
                >
                    Убрать изображение
                </button>
            ) : null}
            {error ? (
                <p className="field__error" role="alert">
                    {error}
                </p>
            ) : null}

            <Modal
                open={modalOpen}
                onClose={closeCropper}
                title={`Обрезка баннера · ${spec.placementLabel}`}
                wide
                footer={
                    <div className="row row--wrap" style={{ gap: 8, justifyContent: 'flex-end' }}>
                        <Button type="button" variant="outline" onClick={closeCropper} disabled={processing}>
                            Отмена
                        </Button>
                        <Button type="button" onClick={applyCrop} disabled={processing}>
                            {processing ? 'Обработка…' : 'Применить обрезку'}
                        </Button>
                    </div>
                }
            >
                <p className="text-sm text-muted banner-cropper__hint">
                    Перетащите и масштабируйте изображение. Область обрезки соответствует пропорциям баннера на сайте ({spec.outputWidth}×{spec.outputHeight} px).
                </p>
                <div className="banner-cropper__stage">
                    {sourceUrl ? <img ref={imageRef} src={sourceUrl} alt="" className="banner-cropper__image" /> : null}
                </div>
            </Modal>
        </div>
    );
}
