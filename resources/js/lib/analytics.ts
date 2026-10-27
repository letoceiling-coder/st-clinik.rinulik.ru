/** Имена целей в Яндекс.Метрике должны совпадать с этими идентификаторами. */
export const AnalyticsEvents = {
    pageView: 'page_view',
    search: 'search',
    cityPick: 'city_pick',
    clinicView: 'clinic_view',
    doctorView: 'doctor_view',
    bookingStart: 'booking_start',
    bookingSuccess: 'booking_success',
    register: 'register',
    tariffPurchase: 'tariff_purchase',
    adPurchase: 'ad_purchase',
    assistantOpen: 'assistant_open',
} as const;

declare global {
    interface Window {
        ym?: (counterId: number, action: string, ...args: unknown[]) => void;
        ymCounterId?: number;
    }
}

function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

function sessionId(): string {
    const key = 'st_analytics_sid';
    let id = sessionStorage.getItem(key);
    if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem(key, id);
    }

    return id;
}

/** Событие воронки: таблица analytics_events + цель Яндекс.Метрики (если счётчик подключён). */
export function trackAnalyticsEvent(event: string, meta?: Record<string, unknown>, citySlug?: string | null): void {
    if (typeof window === 'undefined') {
        return;
    }

    fetch('/api/v1/analytics/event', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-XSRF-TOKEN': xsrfToken(),
        },
        credentials: 'same-origin',
        keepalive: true,
        body: JSON.stringify({
            event,
            meta: meta ?? {},
            city_slug: citySlug ?? undefined,
            session_id: sessionId(),
        }),
    }).catch(() => {});

    if (window.ym && window.ymCounterId) {
        window.ym(window.ymCounterId, 'reachGoal', event, meta ?? {});
    }
}
