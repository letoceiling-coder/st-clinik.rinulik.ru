import { router } from '@inertiajs/react';

/** Сколько держим предзагруженную страницу: успевает до клика и не показывает устаревшие данные. */
const PREFETCH_CACHE = '30s';
/** Пауза наведения перед предзагрузкой, чтобы не грузить всё, над чем просто провели мышью. */
const HOVER_DELAY_MS = 65;

/** Служебные и трекинговые GET-адреса: их запрос заранее засчитал бы клик, отписку или подтверждение. */
const SKIP_PREFIXES = [
    '/logout',
    '/storage',
    '/build',
    '/api',
    '/webhooks',
    '/auth/',
    '/payments',
    '/go/',
    '/o/',
    '/offer/',
    '/demo/',
    '/promotions/',
    '/broadcast/',
    '/unsubscribe/',
    '/email/verify/',
    '/account/email/confirm',
    '/invite/',
    '/password/reset',
    '/downloads',
    '/admin-demo',
    '/clinic-cabinet-demo',
];

/** Выгрузки, файлы и возвраты после оплаты внутри кабинетов. */
const SKIP_PATTERN = /\/(export|download|file|template|return|estimate)(\/|$)/;

/** Внутренняя GET-ссылка Inertia, которую безопасно запросить заранее. */
function prefetchableHref(target: EventTarget | null): string | null {
    if (!(target instanceof Element)) {
        return null;
    }
    const link = target.closest('a[href]');
    if (!(link instanceof HTMLAnchorElement)) {
        return null;
    }
    if (link.target && link.target !== '_self') {
        return null;
    }
    if (link.hasAttribute('download') || link.dataset.noPrefetch !== undefined || link.getAttribute('method')) {
        return null;
    }
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || !/^https?:$/.test(url.protocol)) {
        return null;
    }
    if (SKIP_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) || SKIP_PATTERN.test(url.pathname)) {
        return null;
    }
    if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return null;
    }

    return url.pathname + url.search;
}

function prefetch(href: string): void {
    try {
        router.prefetch(href, {}, { cacheFor: PREFETCH_CACHE });
    } catch {
        /* предзагрузка — только ускорение, ошибки не важны */
    }
}

/**
 * Делает переходы мгновенными: страница запрашивается при наведении, касании или фокусе на ссылке,
 * вместе с её JS-модулем; во время перехода показывается отклик, чтобы клик не казался «мёртвым».
 */
export function setupFastNavigation(): void {
    if (typeof window === 'undefined') {
        return;
    }

    let hoverTimer: number | undefined;
    let hoverHref: string | null = null;

    document.addEventListener(
        'mouseover',
        (event) => {
            const href = prefetchableHref(event.target);
            if (href === hoverHref) {
                return;
            }
            window.clearTimeout(hoverTimer);
            hoverHref = href;
            if (href) {
                hoverTimer = window.setTimeout(() => prefetch(href), HOVER_DELAY_MS);
            }
        },
        { passive: true },
    );

    const immediate = (event: Event): void => {
        const href = prefetchableHref(event.target);
        if (href) {
            prefetch(href);
        }
    };
    document.addEventListener('touchstart', immediate, { passive: true });
    document.addEventListener('mousedown', immediate, { passive: true });
    document.addEventListener('focusin', immediate);

    // Вместе с данными заранее грузим код страницы, иначе после клика он качается отдельным запросом.
    router.on('prefetched', (event) => {
        try {
            const page = JSON.parse(event.detail.response.data) as Parameters<typeof router.resolveComponent>[1] & { component?: string };
            if (page?.component) {
                void Promise.resolve(router.resolveComponent(page.component, page)).catch(() => undefined);
            }
        } catch {
            /* ответ не страница Inertia — пропускаем */
        }
    });

    const root = document.documentElement;
    router.on('start', (event) => {
        if (!event.detail.visit.prefetch && !event.detail.visit.async) {
            root.classList.add('is-navigating');
        }
    });
    router.on('finish', (event) => {
        if (!event.detail.visit.prefetch) {
            root.classList.remove('is-navigating');
        }
    });
}
