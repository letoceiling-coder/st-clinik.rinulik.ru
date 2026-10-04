import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import type { SharedProps } from './types';

function upsert(selector: string, create: () => HTMLElement, attr: string, value?: string) {
    let el = document.head.querySelector<HTMLElement>(selector);
    if (!value) {
        el?.remove();
        return;
    }
    if (!el) {
        el = create();
        document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
}

/**
 * Первый HTML-ответ уже содержит SEO из Blade (в том числе SSR).
 * Этот хук обновляет теги только при клиентской навигации.
 */
export function useClientSeo() {
    const { seo, app } = usePage<SharedProps>().props;

    useEffect(() => {
        if (!seo) return;
        if (seo.title) document.title = seo.title;

        upsert('meta[name="description"]', () => Object.assign(document.createElement('meta'), { name: 'description' }), 'content', seo.description);
        upsert('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), 'href', seo.canonical);

        const robots = seo.robots ?? (app?.noindex ? 'noindex, nofollow' : 'index, follow');
        upsert('meta[name="robots"]', () => Object.assign(document.createElement('meta'), { name: 'robots' }), 'content', robots);
    }, [seo?.title, seo?.description, seo?.canonical, seo?.robots, app?.noindex]); // eslint-disable-line react-hooks/exhaustive-deps
}
