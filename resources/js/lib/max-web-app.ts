import { router, usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import type { SharedProps } from '@/lib/types';

declare global {
    interface Window {
        WebApp?: {
            initData?: string;
            initDataUnsafe?: {
                start_param?: string;
            };
            ready?: () => void;
            expand?: () => void;
            BackButton?: {
                show?: () => void;
                hide?: () => void;
                onClick?: (handler: () => void) => void;
                offClick?: (handler: () => void) => void;
            };
        };
    }
}

function startParamDeepLink(param: string | undefined): string | null {
    if (!param || param.startsWith('login_')) {
        return null;
    }
    if (param.startsWith('clinic_')) {
        const slug = param.slice(7);
        return slug ? `/max/clinics/${slug}` : null;
    }
    if (param.startsWith('follow_')) {
        const slug = param.slice(7);
        return slug ? `/max/clinics/${slug}` : null;
    }
    if (param.startsWith('city_')) {
        const slug = param.slice(5);
        return slug ? `/max/clinics?city=${encodeURIComponent(slug)}` : null;
    }
    if (param.startsWith('book_')) {
        const rest = param.slice(5);
        const clinicSlug = rest.split('_')[0] ?? '';
        return clinicSlug ? `/clinics/${clinicSlug}/booking` : null;
    }

    return null;
}

export function useMaxWebAppAuth(): void {
    const { auth } = usePage<SharedProps>().props;
    const authSent = useRef(false);
    const deepLinkHandled = useRef(false);

    useEffect(() => {
        const tryAuth = () => {
            const initData = window.WebApp?.initData;
            if (!initData || authSent.current || auth?.user) {
                return;
            }
            authSent.current = true;
            router.post(
                '/max/session',
                { init_data: initData },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        const param = window.WebApp?.initDataUnsafe?.start_param;
                        const href = startParamDeepLink(param);
                        if (href && !deepLinkHandled.current) {
                            deepLinkHandled.current = true;
                            router.visit(href, { preserveState: true });
                        }
                    },
                    onError: () => {
                        authSent.current = false;
                    },
                },
            );
        };

        window.WebApp?.ready?.();
        window.WebApp?.expand?.();

        if (auth?.user) {
            const param = window.WebApp?.initDataUnsafe?.start_param;
            const href = startParamDeepLink(param);
            if (href && !deepLinkHandled.current && window.location.pathname === '/max') {
                deepLinkHandled.current = true;
                router.visit(href);
            }
        }

        if (window.WebApp?.initData) {
            tryAuth();
            return;
        }

        const timer = window.setInterval(() => {
            if (window.WebApp?.initData) {
                window.clearInterval(timer);
                tryAuth();
            }
        }, 200);

        return () => window.clearInterval(timer);
    }, [auth?.user]);
}

export function useMaxBackButton(fallbackHref: string): void {
    useEffect(() => {
        const back = window.WebApp?.BackButton;
        if (!back?.show) {
            return;
        }

        const handler = () => {
            router.visit(fallbackHref);
        };

        back.show();
        back.onClick?.(handler);

        return () => {
            back.offClick?.(handler);
            back.hide?.();
        };
    }, [fallbackHref]);
}
