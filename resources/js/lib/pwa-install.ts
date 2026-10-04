import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isStandaloneMode(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIosDevice(): boolean {
    if (typeof navigator === 'undefined') {
        return false;
    }

    return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function registerServiceWorker(): void {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
        return;
    }

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            /* PWA install may still work in some browsers without SW. */
        });
    });
}

export function usePwaInstall() {
    const [installed, setInstalled] = useState(isStandaloneMode);
    const [ios, setIos] = useState(false);
    const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        setIos(isIosDevice());
        setInstalled(isStandaloneMode());

        const onBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            setPromptEvent(event as BeforeInstallPromptEvent);
        };

        const onInstalled = () => {
            setInstalled(true);
            setPromptEvent(null);
        };

        const onDisplayModeChange = () => setInstalled(isStandaloneMode());

        window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        window.addEventListener('appinstalled', onInstalled);
        window.matchMedia('(display-mode: standalone)').addEventListener('change', onDisplayModeChange);

        return () => {
            window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
            window.removeEventListener('appinstalled', onInstalled);
            window.matchMedia('(display-mode: standalone)').removeEventListener('change', onDisplayModeChange);
        };
    }, []);

    const canShow = !installed;

    const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'manual'> => {
        if (promptEvent) {
            await promptEvent.prompt();
            const choice = await promptEvent.userChoice;
            if (choice.outcome === 'accepted') {
                setInstalled(true);
                setPromptEvent(null);
            }

            return choice.outcome;
        }

        return 'manual';
    }, [promptEvent]);

    return {
        canShow,
        ios,
        hasNativePrompt: promptEvent !== null,
        install,
    };
}
