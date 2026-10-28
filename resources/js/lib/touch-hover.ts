/** Устройство управляется пальцем: наведения нет, а :hover «залипает» после касания или прокрутки. */
const TOUCH_QUERY = '(hover: none) and (pointer: coarse)';

/** Нажатие подсвечиваем только у явных кнопок, а не у карточек и блоков, которых касаются при прокрутке. */
const PRESS_FEEDBACK = /btn|button|chip|tabbar|assistant|fab|toggle|switch/i;

const processed = new WeakSet<CSSStyleSheet>();

function shouldDropSelector(selector: string): boolean {
    if (selector.includes(':hover')) {
        return true;
    }

    return selector.includes(':active') && !PRESS_FEEDBACK.test(selector);
}

function cleanRules(list: CSSRuleList, owner: CSSStyleSheet | CSSGroupingRule): void {
    for (let i = list.length - 1; i >= 0; i--) {
        const rule = list[i];
        if (rule instanceof CSSStyleRule) {
            if (!rule.selectorText.includes(':hover') && !rule.selectorText.includes(':active')) {
                if (rule.cssRules?.length) {
                    cleanRules(rule.cssRules, rule as unknown as CSSGroupingRule);
                }
                continue;
            }
            const kept = rule.selectorText
                .split(/,(?![^(]*\))/)
                .map((part) => part.trim())
                .filter((part) => !shouldDropSelector(part));
            if (kept.length === 0) {
                owner.deleteRule(i);
            } else if (kept.length !== rule.selectorText.split(/,(?![^(]*\))/).length) {
                rule.selectorText = kept.join(', ');
            }
        } else if ('cssRules' in rule && (rule as CSSGroupingRule).cssRules) {
            cleanRules((rule as CSSGroupingRule).cssRules, rule as CSSGroupingRule);
        }
    }
}

function cleanSheet(sheet: CSSStyleSheet): void {
    if (processed.has(sheet)) {
        return;
    }
    try {
        cleanRules(sheet.cssRules, sheet);
        processed.add(sheet);
    } catch {
        /* чужой стиль без CORS (например, карты): не трогаем */
    }
}

function cleanAll(): void {
    Array.from(document.styleSheets).forEach(cleanSheet);
}

/**
 * На телефонах и планшетах убирает эффекты наведения и подсветку блоков при касании:
 * при прокрутке ничего не меняет цвет и не «залипает», отклик на нажатие остаётся только у кнопок.
 */
export function setupTouchHover(): void {
    if (typeof window === 'undefined' || !window.matchMedia(TOUCH_QUERY).matches) {
        return;
    }

    document.documentElement.classList.add('is-touch');
    cleanAll();

    // Стили страниц подгружаются по мере переходов — обрабатываем и их.
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach((node) => {
                if (node instanceof HTMLLinkElement) {
                    node.addEventListener('load', cleanAll, { once: true });
                } else if (node instanceof HTMLStyleElement) {
                    cleanAll();
                }
            });
        }
    });
    observer.observe(document.head, { childList: true });
    window.addEventListener('load', cleanAll, { once: true });
}
