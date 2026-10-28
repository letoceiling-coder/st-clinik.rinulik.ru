import { useState } from 'react';
import Icon from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Overlay';
import { usePwaInstall } from '@/lib/pwa-install';

/** variant="menu" — строка в мобильном меню вместо иконки в шапке. */
export default function InstallAppButton({ className, variant = 'icon' }: { className?: string; variant?: 'icon' | 'menu' }) {
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
            {variant === 'menu' ? (
                <button type="button" className={className ?? 'mmenu-install'} onClick={onClick}>
                    <span className="mmenu-install__icon" aria-hidden="true">
                        <Icon name="install" size={22} />
                    </span>
                    <span className="mmenu-install__text">
                        <b>Установить приложение</b>
                        <span>Запуск в один тап с главного экрана</span>
                    </span>
                    <Icon name="chevron-right" size={18} />
                </button>
            ) : (
                <button
                    type="button"
                    className={className ?? 'icon-link'}
                    aria-label="Установить приложение на рабочий стол"
                    title="Установить приложение"
                    onClick={onClick}
                >
                    <Icon name="install" size={22} />
                </button>
            )}

            <Drawer open={hintOpen} onClose={() => setHintOpen(false)} title="Установить МирКлиник">
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
