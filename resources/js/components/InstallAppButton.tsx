import { useState } from 'react';
import Icon from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Overlay';
import { usePwaInstall } from '@/lib/pwa-install';

export default function InstallAppButton({ className }: { className?: string }) {
    const { canShow, ios, hasNativePrompt, install } = usePwaInstall();
    const [hintOpen, setHintOpen] = useState(false);

    if (!canShow) {
        return null;
    }

    const openHint = () => setHintOpen(true);

    const onClick = async () => {
        if (hasNativePrompt) {
            const outcome = await install();
            if (outcome === 'dismissed') {
                openHint();
            }
            return;
        }

        openHint();
    };

    return (
        <>
            <button
                type="button"
                className={className ?? 'icon-link'}
                aria-label="Установить приложение на рабочий стол"
                title="Установить приложение"
                onClick={onClick}
            >
                <Icon name="install" size={22} />
            </button>

            <Drawer open={hintOpen} onClose={() => setHintOpen(false)} title="Установить СтомКлиник">
                <div className="stack install-hint">
                    <p className="text-sm text-muted">
                        Добавьте сайт на рабочий стол или домашний экран — запуск в один тап, без адресной строки.
                    </p>

                    {ios ? (
                        <ol className="install-hint__steps text-sm">
                            <li>Нажмите «Поделиться» в Safari.</li>
                            <li>Выберите «На экран Домой».</li>
                            <li>Подтвердите установку.</li>
                        </ol>
                    ) : (
                        <ol className="install-hint__steps text-sm">
                            <li>Откройте меню браузера (⋮ или «…»).</li>
                            <li>Выберите «Установить приложение» или «Добавить на главный экран».</li>
                            <li>Подтвердите установку.</li>
                        </ol>
                    )}

                    <Button type="button" block onClick={() => setHintOpen(false)}>
                        Понятно
                    </Button>
                </div>
            </Drawer>
        </>
    );
}
