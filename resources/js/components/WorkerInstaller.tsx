import { useState } from 'react';
import { AnchorButton, Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Overlay';
import { Alert } from '@/components/ui/Misc';

interface InstallLinks {
    workerId: string;
    expiresAt: string;
    maxUses: number;
    pageUrl: string;
    windowsUrl: string;
    macUrl: string;
    macCommand: string;
}

/** Кнопка «Установщик воркера»: выдаёт ссылки для Windows и macOS — скачал, запустил, ПК подключён. */
export default function WorkerInstaller({ disabled = false }: { disabled?: boolean }) {
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [links, setLinks] = useState<InstallLinks | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const create = async () => {
        setBusy(true);
        setError(null);
        try {
            const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const res = await fetch('/admin/parser/installer', {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': token ?? '', Accept: 'application/json' },
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(body.message ?? 'Не удалось получить ссылку установки.');
                return;
            }
            setLinks(body as InstallLinks);
        } catch {
            setError('Нет связи с сервером. Повторите попытку.');
        } finally {
            setBusy(false);
        }
    };

    const show = () => {
        setOpen(true);
        if (!links && !busy) void create();
    };

    const copyMac = async () => {
        if (!links) return;
        try {
            await navigator.clipboard.writeText(links.macCommand);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            /* буфер обмена недоступен — команду видно на экране */
        }
    };

    return (
        <>
            <Button type="button" variant="outline" icon="file" onClick={show} disabled={disabled}>
                Установщик воркера
            </Button>
            <Modal open={open} onClose={() => setOpen(false)} title="Подключить компьютер к парсеру" wide>
                <div className="stack">
                    <p className="text-muted">
                        Скачайте установщик на компьютер, который будет собирать данные, и запустите. Он сам установит всё нужное, подключит компьютер к
                        парсеру, настроит автозапуск, восстановление после сбоев и ежечасное обновление.
                    </p>
                    {busy ? <p className="text-muted">Создаю ссылку установки…</p> : null}
                    {error ? (
                        <Alert tone="danger">
                            {error}{' '}
                            <button type="button" className="link" onClick={() => void create()}>
                                Повторить
                            </button>
                        </Alert>
                    ) : null}
                    {links ? (
                        <>
                            <div className="row row--wrap" style={{ gap: 8 }}>
                                <AnchorButton href={links.windowsUrl} icon="file">
                                    Скачать для Windows
                                </AnchorButton>
                                <AnchorButton href={links.pageUrl} target="_blank" rel="noreferrer" variant="outline">
                                    Страница установки (Windows + Mac)
                                </AnchorButton>
                            </div>
                            <div className="stack">
                                <strong>macOS — вставьте в «Терминал» и нажмите Return:</strong>
                                <code className="worker-install-cmd">{links.macCommand}</code>
                                <div>
                                    <Button type="button" variant="outline" onClick={() => void copyMac()}>
                                        {copied ? 'Скопировано' : 'Скопировать команду'}
                                    </Button>
                                </div>
                            </div>
                            <p className="text-sm text-muted">
                                Имя компьютера в парсере: <b>{links.workerId}</b>. Ссылка действует до {new Date(links.expiresAt).toLocaleString('ru-RU')} и
                                ограничена {links.maxUses} запусками — не передавайте её посторонним. Подключение видно на странице установки в реальном
                                времени.
                            </p>
                        </>
                    ) : null}
                </div>
            </Modal>
        </>
    );
}
