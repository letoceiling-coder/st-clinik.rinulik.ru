import { usePage } from '@inertiajs/react';
import { useCallback, useState, type MouseEvent } from 'react';

type Provider = 'yandex' | 'vk' | 'max';

const ICONS: Record<Provider, string> = {
    yandex: 'https://template.cheepy.shop/images/auth/social/yandex.svg',
    vk: 'https://template.cheepy.shop/images/auth/social/vk.svg',
    max: 'https://template.cheepy.shop/images/auth/social/max.png?v=2',
};

const LABELS: Record<Provider, string> = {
    yandex: 'Яндекс ID',
    vk: 'VK ID',
    max: 'MAX',
};

const HREF: Record<Provider, string> = {
    yandex: '/auth/yandex/redirect',
    vk: '/auth/vk/redirect',
    max: '/auth/max/start',
};

export function SocialOAuthButtons({
    providers,
    showHeading = true,
}: {
    providers?: Provider[];
    showHeading?: boolean;
}) {
    const oauth = (usePage().props.oauth ?? {}) as { yandex?: boolean; vk?: boolean; max?: boolean };
    const [busy, setBusy] = useState<Provider | null>(null);

    const items: Provider[] = (providers ?? (['yandex', 'vk', 'max'] as const)).filter((key) => oauth[key]);

    const start = useCallback((e: MouseEvent<HTMLAnchorElement>, key: Provider, href: string) => {
        e.preventDefault();
        if (busy) {
            return;
        }
        setBusy(key);
        window.setTimeout(() => {
            window.location.assign(href);
        }, 80);
    }, [busy]);

    if (items.length === 0) {
        return null;
    }

    return (
        <>
            <div className="oauth stack-sm">
                {showHeading && <p className="text-sm text-muted text-center">или быстрый вход</p>}
                <div className="oauth__grid oauth__grid--icons" role="group" aria-label="Быстрый вход">
                    {items.map((key) => (
                        <a
                            key={key}
                            href={HREF[key]}
                            className={`oauth__btn oauth__btn--${key}${busy === key ? ' is-loading' : ''}`}
                            aria-label={LABELS[key]}
                            title={LABELS[key]}
                            aria-busy={busy === key || undefined}
                            onClick={(e) => start(e, key, HREF[key])}
                        >
                            <img src={ICONS[key]} alt="" className="oauth__icon" width={28} height={28} loading="eager" decoding="async" />
                            <span className="oauth__label">{LABELS[key]}</span>
                        </a>
                    ))}
                </div>
            </div>

            {busy && (
                <div className="oauth-busy" role="dialog" aria-modal="true" aria-labelledby="oauth-busy-title">
                    <div className="oauth-busy__panel card card--shadow stack">
                        <span className="spinner spinner--lg" aria-hidden="true" />
                        <p id="oauth-busy-title" className="oauth-busy__title">
                            Подключаем {LABELS[busy]}…
                        </p>
                        <p className="text-sm text-muted text-center">Сейчас откроется страница входа. Не закрывайте вкладку.</p>
                        <div className="oauth-busy__bar" aria-hidden="true">
                            <span />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
