import { t as Icon } from "./assets/Icon-_sloiNX5.js";
import { a as formatRuPhone, n as cx, o as initials$1 } from "./assets/format-BP5psl3Q.js";
import { i as LinkButton, n as Button, r as IconButton } from "./assets/Button-C2BxTtRt.js";
import { Head, Link, createInertiaApp, router, useForm, usePage } from "@inertiajs/react";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { createPortal } from "react-dom";
import createServer from "@inertiajs/react/server";
import { renderToString } from "react-dom/server";
//#region resources/js/lib/fast-navigation.ts
/** Сколько держим предзагруженную страницу: успевает до клика и не показывает устаревшие данные. */
var PREFETCH_CACHE = "30s";
/** Пауза наведения перед предзагрузкой, чтобы не грузить всё, над чем просто провели мышью. */
var HOVER_DELAY_MS = 65;
/** Служебные и трекинговые GET-адреса: их запрос заранее засчитал бы клик, отписку или подтверждение. */
var SKIP_PREFIXES = [
	"/logout",
	"/storage",
	"/build",
	"/api",
	"/webhooks",
	"/auth/",
	"/payments",
	"/go/",
	"/o/",
	"/offer/",
	"/demo/",
	"/promotions/",
	"/broadcast/",
	"/unsubscribe/",
	"/email/verify/",
	"/account/email/confirm",
	"/invite/",
	"/password/reset",
	"/downloads",
	"/admin-demo",
	"/clinic-cabinet-demo"
];
/** Выгрузки, файлы и возвраты после оплаты внутри кабинетов. */
var SKIP_PATTERN = /\/(export|download|file|template|return|estimate)(\/|$)/;
/** Внутренняя GET-ссылка Inertia, которую безопасно запросить заранее. */
function prefetchableHref(target) {
	if (!(target instanceof Element)) return null;
	const link = target.closest("a[href]");
	if (!(link instanceof HTMLAnchorElement)) return null;
	if (link.target && link.target !== "_self") return null;
	if (link.hasAttribute("download") || link.dataset.noPrefetch !== void 0 || link.getAttribute("method")) return null;
	const url = new URL(link.href, window.location.href);
	if (url.origin !== window.location.origin || !/^https?:$/.test(url.protocol)) return null;
	if (SKIP_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) || SKIP_PATTERN.test(url.pathname)) return null;
	if (url.pathname === window.location.pathname && url.search === window.location.search) return null;
	return url.pathname + url.search;
}
function prefetch(href) {
	try {
		router.prefetch(href, {}, { cacheFor: PREFETCH_CACHE });
	} catch {}
}
/**
* Делает переходы мгновенными: страница запрашивается при наведении, касании или фокусе на ссылке,
* вместе с её JS-модулем; во время перехода показывается отклик, чтобы клик не казался «мёртвым».
*/
function setupFastNavigation() {
	if (typeof window === "undefined") return;
	let hoverTimer;
	let hoverHref = null;
	document.addEventListener("mouseover", (event) => {
		const href = prefetchableHref(event.target);
		if (href === hoverHref) return;
		window.clearTimeout(hoverTimer);
		hoverHref = href;
		if (href) hoverTimer = window.setTimeout(() => prefetch(href), HOVER_DELAY_MS);
	}, { passive: true });
	const immediate = (event) => {
		const href = prefetchableHref(event.target);
		if (href) prefetch(href);
	};
	document.addEventListener("touchstart", immediate, { passive: true });
	document.addEventListener("mousedown", immediate, { passive: true });
	document.addEventListener("focusin", immediate);
	router.on("prefetched", (event) => {
		try {
			const page = JSON.parse(event.detail.response.data);
			if (page?.component) Promise.resolve(router.resolveComponent(page.component, page)).catch(() => void 0);
		} catch {}
	});
	const root = document.documentElement;
	router.on("start", (event) => {
		if (!event.detail.visit.prefetch && !event.detail.visit.async) root.classList.add("is-navigating");
	});
	router.on("finish", (event) => {
		if (!event.detail.visit.prefetch) requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("is-navigating")));
	});
}
//#endregion
//#region resources/js/lib/pwa-install.ts
function isStandaloneMode() {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function isIosDevice() {
	if (typeof navigator === "undefined") return false;
	return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function registerServiceWorker() {
	if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/sw.js").catch(() => {});
	});
}
function usePwaInstall() {
	const [installed, setInstalled] = useState(isStandaloneMode);
	const [ios, setIos] = useState(false);
	const [promptEvent, setPromptEvent] = useState(null);
	useEffect(() => {
		setIos(isIosDevice());
		setInstalled(isStandaloneMode());
		const onBeforeInstallPrompt = (event) => {
			event.preventDefault();
			setPromptEvent(event);
		};
		const onInstalled = () => {
			setInstalled(true);
			setPromptEvent(null);
		};
		const onDisplayModeChange = () => setInstalled(isStandaloneMode());
		window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
		window.addEventListener("appinstalled", onInstalled);
		window.matchMedia("(display-mode: standalone)").addEventListener("change", onDisplayModeChange);
		return () => {
			window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
			window.removeEventListener("appinstalled", onInstalled);
			window.matchMedia("(display-mode: standalone)").removeEventListener("change", onDisplayModeChange);
		};
	}, []);
	const canShow = !installed;
	const install = useCallback(async () => {
		if (promptEvent) {
			await promptEvent.prompt();
			const choice = await promptEvent.userChoice;
			if (choice.outcome === "accepted") {
				setInstalled(true);
				setPromptEvent(null);
			}
			return choice.outcome;
		}
		return "manual";
	}, [promptEvent]);
	return {
		canShow,
		ios,
		hasNativePrompt: promptEvent !== null,
		install
	};
}
//#endregion
//#region resources/js/lib/touch-hover.ts
/** Устройство управляется пальцем: наведения нет, а :hover «залипает» после касания или прокрутки. */
var TOUCH_QUERY = "(hover: none) and (pointer: coarse)";
/** Нажатие подсвечиваем только у явных кнопок, а не у карточек и блоков, которых касаются при прокрутке. */
var PRESS_FEEDBACK = /btn|button|chip|tabbar|assistant|fab|toggle|switch/i;
var processed = /* @__PURE__ */ new WeakSet();
function shouldDropSelector(selector) {
	if (selector.includes(":hover")) return true;
	return selector.includes(":active") && !PRESS_FEEDBACK.test(selector);
}
function cleanRules(list, owner) {
	for (let i = list.length - 1; i >= 0; i--) {
		const rule = list[i];
		if (rule instanceof CSSStyleRule) {
			if (!rule.selectorText.includes(":hover") && !rule.selectorText.includes(":active")) {
				if (rule.cssRules?.length) cleanRules(rule.cssRules, rule);
				continue;
			}
			const kept = rule.selectorText.split(/,(?![^(]*\))/).map((part) => part.trim()).filter((part) => !shouldDropSelector(part));
			if (kept.length === 0) owner.deleteRule(i);
			else if (kept.length !== rule.selectorText.split(/,(?![^(]*\))/).length) rule.selectorText = kept.join(", ");
		} else if ("cssRules" in rule && rule.cssRules) cleanRules(rule.cssRules, rule);
	}
}
function cleanSheet(sheet) {
	if (processed.has(sheet)) return;
	try {
		cleanRules(sheet.cssRules, sheet);
		processed.add(sheet);
	} catch {}
}
function cleanAll() {
	Array.from(document.styleSheets).forEach(cleanSheet);
}
/**
* На телефонах и планшетах убирает эффекты наведения и подсветку блоков при касании:
* при прокрутке ничего не меняет цвет и не «залипает», отклик на нажатие остаётся только у кнопок.
*/
function setupTouchHover() {
	if (typeof window === "undefined" || !window.matchMedia(TOUCH_QUERY).matches) return;
	document.documentElement.classList.add("is-touch");
	cleanAll();
	new MutationObserver((mutations) => {
		for (const mutation of mutations) mutation.addedNodes.forEach((node) => {
			if (node instanceof HTMLLinkElement) node.addEventListener("load", cleanAll, { once: true });
			else if (node instanceof HTMLStyleElement) cleanAll();
		});
	}).observe(document.head, { childList: true });
	window.addEventListener("load", cleanAll, { once: true });
}
//#endregion
//#region resources/js/lib/analytics.ts
/** Имена целей в Яндекс.Метрике должны совпадать с этими идентификаторами. */
var AnalyticsEvents = {
	pageView: "page_view",
	search: "search",
	cityPick: "city_pick",
	clinicView: "clinic_view",
	doctorView: "doctor_view",
	bookingStart: "booking_start",
	bookingSuccess: "booking_success",
	register: "register",
	tariffPurchase: "tariff_purchase",
	adPurchase: "ad_purchase",
	assistantOpen: "assistant_open"
};
function xsrfToken$3() {
	const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
	return match ? decodeURIComponent(match[1]) : "";
}
function sessionId() {
	const key = "st_analytics_sid";
	let id = sessionStorage.getItem(key);
	if (!id) {
		id = crypto.randomUUID();
		sessionStorage.setItem(key, id);
	}
	return id;
}
/** Событие воронки: таблица analytics_events + цель Яндекс.Метрики (если счётчик подключён). */
function trackAnalyticsEvent(event, meta, citySlug) {
	if (typeof window === "undefined") return;
	fetch("/api/v1/analytics/event", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json",
			"X-XSRF-TOKEN": xsrfToken$3()
		},
		credentials: "same-origin",
		keepalive: true,
		body: JSON.stringify({
			event,
			meta: meta ?? {},
			city_slug: citySlug ?? void 0,
			session_id: sessionId()
		})
	}).catch(() => {});
	if (window.ym && window.ymCounterId) window.ym(window.ymCounterId, "reachGoal", event, meta ?? {});
}
//#endregion
//#region resources/js/components/ui/Overlay.tsx
var FOCUSABLE = "a[href],button:not([disabled]),input:not([disabled]):not([type=\"hidden\"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex=\"-1\"])";
/** Фокус-ловушка, Esc, блокировка прокрутки и возврат фокуса. */
function useOverlay(open, onClose, panel) {
	useEffect(() => {
		if (!open) return;
		const previous = document.activeElement;
		const html = document.documentElement;
		const prevOverflow = html.style.overflow;
		html.style.overflow = "hidden";
		const focusables = () => Array.from(panel.current?.querySelectorAll(FOCUSABLE) ?? []);
		(focusables().find((el) => el.dataset.autofocus !== void 0) ?? focusables()[0] ?? panel.current)?.focus();
		const onKey = (e) => {
			if (e.key === "Escape") {
				e.stopPropagation();
				onClose();
			}
			if (e.key === "Tab") {
				const items = focusables();
				if (!items.length) return;
				const a = items[0];
				const b = items[items.length - 1];
				if (e.shiftKey && document.activeElement === a) {
					e.preventDefault();
					b.focus();
				} else if (!e.shiftKey && document.activeElement === b) {
					e.preventDefault();
					a.focus();
				}
			}
		};
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("keydown", onKey);
			html.style.overflow = prevOverflow;
			previous?.focus?.();
		};
	}, [open]);
}
function Portal({ children }) {
	if (typeof document === "undefined") return null;
	return createPortal(children, document.body);
}
function Modal({ open, onClose, title, children, footer, wide, sheet = true }) {
	const ref = useRef(null);
	const titleId = useId();
	useOverlay(open, onClose, ref);
	if (!open) return null;
	return /* @__PURE__ */ jsx(Portal, { children: /* @__PURE__ */ jsx("div", {
		className: cx("overlay", sheet && "overlay--sheet"),
		onMouseDown: (e) => {
			if (e.target === e.currentTarget) onClose();
		},
		children: /* @__PURE__ */ jsxs("div", {
			ref,
			className: cx("modal", wide && "modal--wide"),
			role: "dialog",
			"aria-modal": "true",
			"aria-labelledby": titleId,
			tabIndex: -1,
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "modal__head",
					children: [/* @__PURE__ */ jsx("h2", {
						id: titleId,
						children: title
					}), /* @__PURE__ */ jsx(IconButton, {
						icon: "x",
						label: "Закрыть",
						onClick: onClose,
						variant: "secondary",
						round: true
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "modal__body",
					children
				}),
				footer ? /* @__PURE__ */ jsx("div", {
					className: "modal__foot",
					children: footer
				}) : null
			]
		})
	}) });
}
function Drawer({ open, onClose, title, children, side = "right", footer }) {
	const ref = useRef(null);
	const titleId = useId();
	useOverlay(open, onClose, ref);
	if (!open) return null;
	return /* @__PURE__ */ jsx(Portal, { children: /* @__PURE__ */ jsx("div", {
		className: "overlay",
		style: { padding: 0 },
		onMouseDown: (e) => e.target === e.currentTarget && onClose(),
		children: /* @__PURE__ */ jsxs("div", {
			ref,
			className: cx("drawer", `drawer--${side}`),
			role: "dialog",
			"aria-modal": "true",
			"aria-labelledby": titleId,
			tabIndex: -1,
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "modal__head",
					children: [/* @__PURE__ */ jsx("h2", {
						id: titleId,
						children: title
					}), /* @__PURE__ */ jsx(IconButton, {
						icon: "x",
						label: "Закрыть",
						onClick: onClose,
						variant: "secondary",
						round: true
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "modal__body",
					children
				}),
				footer ? /* @__PURE__ */ jsx("div", {
					className: "modal__foot",
					children: footer
				}) : null
			]
		})
	}) });
}
/** Полноэкранный просмотр изображений с кнопкой закрытия, Esc и кликом по фону. */
function Lightbox({ open, onClose, title, children }) {
	const ref = useRef(null);
	useOverlay(open, onClose, ref);
	if (!open) return null;
	return /* @__PURE__ */ jsx(Portal, { children: /* @__PURE__ */ jsxs("div", {
		ref,
		className: "lightbox",
		role: "dialog",
		"aria-modal": "true",
		"aria-label": title ?? "Просмотр фото",
		tabIndex: -1,
		onMouseDown: (e) => {
			if (e.target === e.currentTarget) onClose();
		},
		children: [
			/* @__PURE__ */ jsx(IconButton, {
				className: "lightbox__close",
				icon: "x",
				label: "Закрыть",
				onClick: onClose,
				variant: "secondary",
				round: true
			}),
			title ? /* @__PURE__ */ jsx("p", {
				className: "lightbox__title",
				children: title
			}) : null,
			children
		]
	}) });
}
/** Закрытие по клику вне элемента и Esc (для поповеров). */
function useDismiss(open, onClose, ref) {
	useEffect(() => {
		if (!open) return;
		const down = (e) => {
			if (ref.current && !ref.current.contains(e.target)) onClose();
		};
		const key = (e) => e.key === "Escape" && onClose();
		document.addEventListener("mousedown", down);
		document.addEventListener("touchstart", down);
		document.addEventListener("keydown", key);
		return () => {
			document.removeEventListener("mousedown", down);
			document.removeEventListener("touchstart", down);
			document.removeEventListener("keydown", key);
		};
	}, [open]);
}
//#endregion
//#region resources/js/components/ui/Fields.tsx
function Wrap({ id, label, hint, error, required, className, children }) {
	return /* @__PURE__ */ jsxs("div", {
		className: cx("field", className),
		children: [
			label ? /* @__PURE__ */ jsxs("label", {
				className: "field__label",
				htmlFor: id,
				children: [label, required ? /* @__PURE__ */ jsx("span", {
					className: "req",
					"aria-hidden": "true",
					children: " *"
				}) : null]
			}) : null,
			children,
			error ? /* @__PURE__ */ jsx("p", {
				className: "field__error",
				id: `${id}-err`,
				role: "alert",
				children: error
			}) : hint ? /* @__PURE__ */ jsx("p", {
				className: "field__hint",
				id: `${id}-hint`,
				children: hint
			}) : null
		]
	});
}
var describe = (id, error, hint) => error ? `${id}-err` : hint ? `${id}-hint` : void 0;
function TextField({ label, hint, error, className, inputClassName, ...rest }) {
	const id = useId();
	return /* @__PURE__ */ jsx(Wrap, {
		id,
		label,
		hint,
		error,
		required: rest.required,
		className,
		children: /* @__PURE__ */ jsx("input", {
			id,
			className: cx("input", inputClassName),
			"aria-invalid": error ? true : void 0,
			"aria-describedby": describe(id, error, hint),
			...rest
		})
	});
}
/**
* Поле телефона с маской «+7 (900) 000-00-00». Подходит для автозаполнения браузера
* (autocomplete="tel") и вставки номера в любом виде.
*/
function PhoneField({ onChange, onFocus, onBlur, placeholder, ...rest }) {
	const lastValue = useRef(String(rest.value ?? ""));
	const external = String(rest.value ?? "");
	useEffect(() => {
		lastValue.current = external;
	}, [external]);
	const emit = (e, value) => {
		e.target.value = value;
		lastValue.current = value;
		onChange?.(e);
	};
	return /* @__PURE__ */ jsx(TextField, {
		type: "tel",
		inputMode: "tel",
		autoComplete: "tel",
		placeholder: placeholder ?? "+7 (900) 000-00-00",
		...rest,
		onFocus: (e) => {
			if (e.target.value === "" && !rest.readOnly) emit(e, "+7 (");
			onFocus?.(e);
		},
		onBlur: (e) => {
			if (e.target.value.replace(/\D/g, "") === "7") emit(e, "");
			onBlur?.(e);
		},
		onChange: (e) => {
			const raw = e.target.value;
			const prevDigits = lastValue.current.replace(/\D/g, "");
			let digits = raw.replace(/\D/g, "");
			if (digits.length > 11) {
				if (prevDigits.length <= 2) {
					const pasted = digits.slice(prevDigits.length);
					digits = "7" + (/^[78]/.test(pasted) && pasted.length >= 11 ? pasted.slice(1, 11) : pasted.slice(0, 10));
				} else digits = prevDigits;
			} else if (prevDigits === "7" && digits === "77") digits = "7";
			else if (prevDigits === "78" && digits === "789") digits = "79";
			emit(e, digits === "7" || digits === "" ? raw.length < 4 ? "" : "+7 (" : formatRuPhone(digits));
		}
	});
}
function TextArea({ label, hint, error, className, ...rest }) {
	const id = useId();
	const max = typeof rest.maxLength === "number" ? rest.maxLength : null;
	const length = typeof rest.value === "string" ? rest.value.length : 0;
	return /* @__PURE__ */ jsxs(Wrap, {
		id,
		label,
		hint,
		error,
		required: rest.required,
		className,
		children: [/* @__PURE__ */ jsx("textarea", {
			id,
			className: "textarea",
			"aria-invalid": error ? true : void 0,
			"aria-describedby": describe(id, error, hint),
			...rest
		}), max ? /* @__PURE__ */ jsxs("span", {
			className: cx("field__counter", length >= max * .9 && "is-near"),
			"aria-live": "polite",
			children: [
				length,
				" / ",
				max
			]
		}) : null]
	});
}
function SelectField({ label, hint, error, className, children, ...rest }) {
	const id = useId();
	return /* @__PURE__ */ jsx(Wrap, {
		id,
		label,
		hint,
		error,
		required: rest.required,
		className,
		children: /* @__PURE__ */ jsx("select", {
			id,
			className: "select",
			"aria-invalid": error ? true : void 0,
			"aria-describedby": describe(id, error, hint),
			...rest,
			children
		})
	});
}
function Check({ label, error, className, type = "checkbox", ...rest }) {
	return /* @__PURE__ */ jsxs("div", {
		className,
		children: [/* @__PURE__ */ jsxs("label", {
			className: cx("check", error && "is-invalid"),
			children: [/* @__PURE__ */ jsx("input", {
				type,
				"aria-invalid": error ? true : void 0,
				...rest
			}), /* @__PURE__ */ jsx("span", { children: label })]
		}), error ? /* @__PURE__ */ jsx("p", {
			className: "field__error",
			role: "alert",
			style: { marginTop: 6 },
			children: error
		}) : null]
	});
}
function SearchInput({ value, onChange, placeholder, label = "Поиск", ...rest }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "input-group",
		children: [/* @__PURE__ */ jsx(Icon, {
			name: "search",
			className: "icon-left",
			size: 20
		}), /* @__PURE__ */ jsx("input", {
			type: "search",
			className: "input",
			"aria-label": label,
			placeholder,
			...value === void 0 ? {} : {
				value,
				onChange
			},
			...rest
		})]
	});
}
function CitySearchField({ cities, name = "city", label = "Город", defaultValue = "" }) {
	const id = useId();
	const rootRef = useRef(null);
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [selected, setSelected] = useState(String(defaultValue));
	useEffect(() => {
		setSelected(String(defaultValue));
	}, [defaultValue]);
	useDismiss(open, () => setOpen(false), rootRef);
	const selectedCity = cities.find((c) => String(c.id) === selected);
	const displayValue = open ? query : selectedCity?.name ?? "";
	const options = useMemo(() => {
		const needle = query.trim().toLowerCase();
		return (needle ? cities.filter((c) => c.name.toLowerCase().includes(needle)) : cities).slice(0, 30);
	}, [cities, query]);
	const pick = (value, labelText) => {
		setSelected(value);
		setQuery(labelText);
		setOpen(false);
	};
	return /* @__PURE__ */ jsxs("div", {
		ref: rootRef,
		className: "field city-search",
		children: [
			/* @__PURE__ */ jsx("label", {
				className: "field__label",
				htmlFor: id,
				children: label
			}),
			/* @__PURE__ */ jsx("input", {
				type: "hidden",
				name,
				value: selected
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "input-group",
				children: [/* @__PURE__ */ jsx(Icon, {
					name: "search",
					className: "icon-left",
					size: 20
				}), /* @__PURE__ */ jsx("input", {
					id,
					type: "search",
					className: "input",
					placeholder: "Начните вводить город",
					value: displayValue,
					autoComplete: "off",
					onFocus: () => {
						setOpen(true);
						setQuery(selectedCity?.name ?? "");
					},
					onChange: (e) => {
						setQuery(e.target.value);
						setOpen(true);
						if (e.target.value === "") setSelected("");
					}
				})]
			}),
			open ? /* @__PURE__ */ jsxs("ul", {
				className: "city-search__list",
				role: "listbox",
				children: [/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("button", {
					type: "button",
					className: cx("city-search__option", selected === "" && "is-active"),
					onMouseDown: (e) => e.preventDefault(),
					onClick: () => pick("", ""),
					children: "Все города"
				}) }), options.length === 0 ? /* @__PURE__ */ jsx("li", {
					className: "city-search__empty",
					children: "Город не найден"
				}) : options.map((c) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx("button", {
					type: "button",
					className: cx("city-search__option", String(c.id) === selected && "is-active"),
					onMouseDown: (e) => e.preventDefault(),
					onClick: () => pick(String(c.id), c.name),
					children: c.name
				}) }, c.id))]
			}) : null
		]
	});
}
//#endregion
//#region resources/js/components/ui/Misc.tsx
function Badge$1({ children, tone, icon }) {
	return /* @__PURE__ */ jsxs("span", {
		className: cx("badge", tone && `badge--${tone}`),
		title: typeof children === "string" ? children : void 0,
		children: [icon ? /* @__PURE__ */ jsx(Icon, {
			name: icon,
			size: 14
		}) : null, /* @__PURE__ */ jsx("span", {
			className: "badge__text",
			children
		})]
	});
}
function Stars({ value, size = 16 }) {
	return /* @__PURE__ */ jsx("span", {
		className: "stars",
		role: "img",
		"aria-label": `Оценка ${value} из 5`,
		children: [
			1,
			2,
			3,
			4,
			5
		].map((i) => /* @__PURE__ */ jsx("span", {
			className: i <= Math.round(value) ? "" : "off",
			children: /* @__PURE__ */ jsx(Icon, {
				name: "star",
				size
			})
		}, i))
	});
}
function Skeleton({ w, h = 16, r, className }) {
	return /* @__PURE__ */ jsx("span", {
		className: cx("skeleton", className),
		style: {
			width: w ?? "100%",
			height: h,
			borderRadius: r
		},
		"aria-hidden": "true"
	});
}
function EmptyState({ icon = "search", title, text, action }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "state",
		role: "status",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "state__icon",
				children: /* @__PURE__ */ jsx(Icon, {
					name: icon,
					size: 32
				})
			}),
			/* @__PURE__ */ jsx("h3", { children: title }),
			text ? /* @__PURE__ */ jsx("p", { children: text }) : null,
			action
		]
	});
}
function ErrorState({ title = "Что-то пошло не так", text, action }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "state state--error",
		role: "alert",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "state__icon",
				children: /* @__PURE__ */ jsx(Icon, {
					name: "alert",
					size: 32
				})
			}),
			/* @__PURE__ */ jsx("h3", { children: title }),
			text ? /* @__PURE__ */ jsx("p", { children: text }) : null,
			action
		]
	});
}
function Alert({ tone, icon, children }) {
	const defaultIcon = tone === "warning" || tone === "danger" ? "alert" : tone === "success" ? "check-circle" : "info";
	return /* @__PURE__ */ jsxs("div", {
		className: cx("alert", tone && `alert--${tone}`),
		role: tone === "danger" ? "alert" : void 0,
		children: [/* @__PURE__ */ jsx(Icon, {
			name: icon ?? defaultIcon,
			size: 20
		}), /* @__PURE__ */ jsx("div", { children })]
	});
}
function Breadcrumbs({ items }) {
	if (!items?.length) return null;
	return /* @__PURE__ */ jsx("nav", {
		"aria-label": "Хлебные крошки",
		className: "container",
		children: /* @__PURE__ */ jsx("ol", {
			className: "breadcrumbs",
			children: items.map(([label, href], i) => {
				const last = i === items.length - 1;
				const path = href.replace(/^https?:\/\/[^/]+/, "") || "/";
				return /* @__PURE__ */ jsxs("li", { children: [last ? /* @__PURE__ */ jsx("span", {
					"aria-current": "page",
					children: label
				}) : /* @__PURE__ */ jsx(Link, {
					href: path,
					children: label
				}), last ? null : /* @__PURE__ */ jsx(Icon, {
					name: "chevron-right",
					size: 14
				})] }, href + i);
			})
		})
	});
}
function scrollToBlock(target) {
	const el = typeof target === "string" ? document.querySelector(target) : target();
	if (!el) return;
	const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
	el.scrollIntoView({
		behavior,
		block: "start"
	});
}
function Pagination({ page, only, keepScroll, param = "page", scrollTo }) {
	const { current_page: current, last_page: last } = page;
	if (last <= 1) return null;
	const go = (n) => {
		if (n === current) return;
		const url = new URL(window.location.href);
		if (param !== "page") url.searchParams.delete("page");
		else url.searchParams.delete("reviews_page");
		if (n <= 1) url.searchParams.delete(param);
		else url.searchParams.set(param, String(n));
		router.get(url.pathname + url.search, {}, {
			preserveScroll: scrollTo ? false : keepScroll ?? false,
			only,
			preserveState: true,
			replace: true,
			onSuccess: () => {
				if (scrollTo) scrollToBlock(scrollTo);
			}
		});
	};
	const nums = [];
	for (let i = 1; i <= last; i++) if (i === 1 || i === last || Math.abs(i - current) <= 1) nums.push(i);
	else if (nums[nums.length - 1] !== "…") nums.push("…");
	return /* @__PURE__ */ jsxs("nav", {
		className: "pagination",
		"aria-label": "Страницы",
		children: [
			/* @__PURE__ */ jsx("button", {
				className: cx("page-btn", current === 1 && "is-disabled"),
				onClick: () => go(current - 1),
				"aria-label": "Предыдущая страница",
				disabled: current === 1,
				children: /* @__PURE__ */ jsx(Icon, {
					name: "chevron-left",
					size: 18
				})
			}),
			nums.map((n, i) => n === "…" ? /* @__PURE__ */ jsx("span", {
				className: "text-muted",
				"aria-hidden": "true",
				children: "…"
			}, `d${i}`) : /* @__PURE__ */ jsx("button", {
				className: cx("page-btn", n === current && "is-active"),
				onClick: () => go(n),
				"aria-current": n === current ? "page" : void 0,
				"aria-label": `Страница ${n}`,
				children: n
			}, n)),
			/* @__PURE__ */ jsx("button", {
				className: cx("page-btn", current === last && "is-disabled"),
				onClick: () => go(current + 1),
				"aria-label": "Следующая страница",
				disabled: current === last,
				children: /* @__PURE__ */ jsx(Icon, {
					name: "chevron-right",
					size: 18
				})
			})
		]
	});
}
function Avatar({ name }) {
	return /* @__PURE__ */ jsx("span", {
		className: "avatar",
		"aria-hidden": "true",
		children: initials$1(name)
	});
}
function Tabs({ value, items, onChange, label }) {
	return /* @__PURE__ */ jsx("div", {
		className: "tabs",
		role: "tablist",
		"aria-label": label,
		children: items.map((i) => /* @__PURE__ */ jsxs("button", {
			role: "tab",
			"aria-selected": value === i.key,
			className: cx("tab", value === i.key && "is-active"),
			onClick: () => onChange(i.key),
			children: [i.label, i.count !== void 0 ? /* @__PURE__ */ jsx("span", {
				className: "tab__count",
				children: i.count
			}) : null]
		}, i.key))
	});
}
function SectionHead({ title, text, action }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "section-head",
		children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", { children: title }), text ? /* @__PURE__ */ jsx("p", { children: text }) : null] }), action ? /* @__PURE__ */ jsx("div", {
			className: "section-head__action",
			children: action
		}) : null]
	});
}
//#endregion
//#region resources/js/components/LeadModal.tsx
var today = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
var maxDate = () => new Date(Date.now() + 50976e5).toISOString().slice(0, 10);
function LeadModal({ target, onClose }) {
	const { auth } = usePage().props;
	const form = useForm({
		clinic: "",
		name: auth.user?.name ?? "",
		phone: "",
		preferred_date: "",
		preferred_time: "",
		service_id: "",
		doctor_id: "",
		concern_id: "",
		comment: "",
		is_child: false,
		consent: false,
		website: "",
		source: "clinic_page"
	});
	useEffect(() => {
		if (target) {
			form.setData((d) => ({
				...d,
				clinic: target.slug,
				doctor_id: target.doctorId ?? "",
				service_id: target.serviceId ?? "",
				concern_id: target.concernId ?? "",
				source: target.source ?? "clinic_page"
			}));
			form.clearErrors();
		}
	}, [
		target?.slug,
		target?.doctorId,
		target?.serviceId
	]);
	if (!target) return null;
	const submit = (e) => {
		e.preventDefault();
		form.post("/leads", {
			preserveScroll: true,
			onSuccess: () => {
				form.reset("comment", "consent", "preferred_date", "preferred_time");
				onClose();
			}
		});
	};
	return /* @__PURE__ */ jsx(Modal, {
		open: true,
		onClose,
		title: `Перезвоните мне · «${target.name}»`,
		footer: /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Button, {
			variant: "ghost",
			onClick: onClose,
			children: "Отмена"
		}), /* @__PURE__ */ jsx(Button, {
			type: "submit",
			form: "lead-form",
			loading: form.processing,
			children: "Отправить заявку"
		})] }),
		children: /* @__PURE__ */ jsxs("form", {
			id: "lead-form",
			onSubmit: submit,
			noValidate: true,
			className: "stack",
			children: [
				/* @__PURE__ */ jsx("p", {
					className: "text-muted text-sm",
					children: "Клиника перезвонит и подтвердит время. Стоимость указана «от» — итоговую назовёт врач после осмотра."
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "form-grid",
					children: [
						/* @__PURE__ */ jsx(TextField, {
							label: "Ваше имя",
							required: true,
							autoComplete: "name",
							maxLength: 60,
							value: form.data.name,
							onChange: (e) => form.setData("name", e.target.value),
							error: form.errors.name,
							"data-autofocus": true
						}),
						/* @__PURE__ */ jsx(PhoneField, {
							label: "Телефон",
							required: true,
							value: form.data.phone,
							onChange: (e) => form.setData("phone", e.target.value),
							error: form.errors.phone
						}),
						/* @__PURE__ */ jsx(TextField, {
							label: "Желаемая дата",
							type: "date",
							min: today(),
							max: maxDate(),
							value: form.data.preferred_date,
							onChange: (e) => form.setData("preferred_date", e.target.value),
							error: form.errors.preferred_date
						}),
						/* @__PURE__ */ jsxs(SelectField, {
							label: "Удобное время",
							value: form.data.preferred_time,
							onChange: (e) => form.setData("preferred_time", e.target.value),
							error: form.errors.preferred_time,
							children: [
								/* @__PURE__ */ jsx("option", {
									value: "",
									children: "Любое"
								}),
								/* @__PURE__ */ jsx("option", {
									value: "утро",
									children: "Утро (до 12:00)"
								}),
								/* @__PURE__ */ jsx("option", {
									value: "день",
									children: "День (12:00–17:00)"
								}),
								/* @__PURE__ */ jsx("option", {
									value: "вечер",
									children: "Вечер (после 17:00)"
								})
							]
						}),
						target.services?.length ? /* @__PURE__ */ jsxs(SelectField, {
							label: "Услуга",
							value: form.data.service_id,
							onChange: (e) => form.setData("service_id", e.target.value),
							error: form.errors.service_id,
							children: [/* @__PURE__ */ jsx("option", {
								value: "",
								children: "Пока не знаю"
							}), target.services.map((s) => /* @__PURE__ */ jsx("option", {
								value: s.id,
								children: s.name
							}, s.id))]
						}) : null,
						target.doctors?.length ? /* @__PURE__ */ jsxs(SelectField, {
							label: "Врач",
							value: form.data.doctor_id,
							onChange: (e) => form.setData("doctor_id", e.target.value),
							error: form.errors.doctor_id,
							children: [/* @__PURE__ */ jsx("option", {
								value: "",
								children: "Любой свободный"
							}), target.doctors.map((d) => /* @__PURE__ */ jsx("option", {
								value: d.id,
								children: d.name
							}, d.id))]
						}) : null
					]
				}),
				/* @__PURE__ */ jsx(TextArea, {
					label: "Комментарий (необязательно)",
					maxLength: 300,
					rows: 3,
					value: form.data.comment,
					onChange: (e) => form.setData("comment", e.target.value),
					error: form.errors.comment,
					hint: "Не указывайте диагнозы, номера документов и результаты анализов."
				}),
				/* @__PURE__ */ jsx(Check, {
					label: "Запись нужна ребёнку",
					checked: form.data.is_child,
					onChange: (e) => form.setData("is_child", e.target.checked)
				}),
				/* @__PURE__ */ jsx("div", {
					"aria-hidden": "true",
					style: {
						position: "absolute",
						left: "-9999px",
						width: 1,
						height: 1,
						overflow: "hidden"
					},
					children: /* @__PURE__ */ jsxs("label", { children: ["Сайт", /* @__PURE__ */ jsx("input", {
						type: "text",
						tabIndex: -1,
						autoComplete: "off",
						value: form.data.website,
						onChange: (e) => form.setData("website", e.target.value)
					})] })
				}),
				/* @__PURE__ */ jsx(Check, {
					required: true,
					checked: form.data.consent,
					onChange: (e) => form.setData("consent", e.target.checked),
					error: form.errors.consent,
					label: /* @__PURE__ */ jsxs(Fragment, { children: [
						"Согласен на обработку персональных данных (имя, телефон) для записи в клинику — см.",
						" ",
						/* @__PURE__ */ jsx(Link, {
							href: "/consent",
							className: "link",
							target: "_blank",
							children: "согласие"
						}),
						" ",
						"и",
						" ",
						/* @__PURE__ */ jsx(Link, {
							href: "/privacy",
							className: "link",
							target: "_blank",
							children: "политику конфиденциальности"
						}),
						"."
					] })
				}),
				Object.keys(form.errors).length > 0 && !form.errors.name && !form.errors.phone && !form.errors.consent && !form.errors.comment && !form.errors.preferred_date ? /* @__PURE__ */ jsx(Alert, {
					tone: "danger",
					children: "Проверьте поля формы и попробуйте ещё раз."
				}) : null
			]
		})
	});
}
//#endregion
//#region resources/js/components/LeadContext.tsx
function bookingUrl(target) {
	const q = new URLSearchParams();
	if (target.doctorId) q.set("doctor", String(target.doctorId));
	if (target.serviceId) q.set("service", String(target.serviceId));
	const qs = q.toString();
	return `/clinics/${target.slug}/booking${qs ? `?${qs}` : ""}`;
}
var LeadCtx = createContext({
	open: () => void 0,
	callback: () => void 0
});
var useLead = () => useContext(LeadCtx);
function LeadProvider({ children }) {
	const [target, setTarget] = useState(null);
	const open = useCallback((t) => {
		router.visit(bookingUrl(t));
	}, []);
	const callback = useCallback((t) => setTarget(t), []);
	const value = useMemo(() => ({
		open,
		callback
	}), [open, callback]);
	return /* @__PURE__ */ jsxs(LeadCtx.Provider, {
		value,
		children: [children, /* @__PURE__ */ jsx(LeadModal, {
			target,
			onClose: () => setTarget(null)
		})]
	});
}
//#endregion
//#region resources/js/components/SearchBox.tsx
var GROUPS = [
	{
		key: "concerns",
		title: "Что беспокоит",
		icon: "pain"
	},
	{
		key: "services",
		title: "Услуги",
		icon: "tooth"
	},
	{
		key: "specialties",
		title: "Направления",
		icon: "sparkle"
	},
	{
		key: "clinics",
		title: "Клиники",
		icon: "building"
	},
	{
		key: "doctors",
		title: "Врачи",
		icon: "user"
	},
	{
		key: "cities",
		title: "Города",
		icon: "pin"
	}
];
function SearchBox({ variant = "header", placeholder = "Клиника, врач, услуга или что беспокоит", autoFocus, onDone }) {
	const { city } = usePage().props;
	const [q, setQ] = useState("");
	const [data, setData] = useState({});
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [active, setActive] = useState(-1);
	const wrap = useRef(null);
	const listId = useId();
	const flat = useMemo(() => GROUPS.flatMap((g) => (data[g.key] ?? []).map((item) => ({
		...item,
		group: g
	}))), [data]);
	useEffect(() => {
		const query = q.trim();
		if (query.length < 2) {
			setData({});
			setLoading(false);
			return;
		}
		setLoading(true);
		const ctrl = new AbortController();
		const t = window.setTimeout(() => {
			const params = new URLSearchParams({ q: query });
			if (city?.slug) params.set("city", city.slug);
			fetch(`/api/v1/search/suggest?${params}`, {
				signal: ctrl.signal,
				headers: { Accept: "application/json" }
			}).then((r) => r.ok ? r.json() : Promise.reject(r)).then((j) => {
				setData(j.data ?? {});
				setActive(-1);
				setLoading(false);
			}).catch((e) => {
				if (e?.name !== "AbortError") setLoading(false);
			});
		}, 200);
		return () => {
			window.clearTimeout(t);
			ctrl.abort();
		};
	}, [q, city?.slug]);
	useEffect(() => {
		const onDoc = (e) => {
			if (!wrap.current?.contains(e.target)) setOpen(false);
		};
		document.addEventListener("mousedown", onDoc);
		return () => document.removeEventListener("mousedown", onDoc);
	}, []);
	const go = (url) => {
		setOpen(false);
		onDone?.();
		router.visit(url);
	};
	const submit = () => {
		const query = q.trim();
		if (!query) return;
		setOpen(false);
		onDone?.();
		trackAnalyticsEvent(AnalyticsEvents.search, { q: query }, city?.slug ?? null);
		router.get("/search", { q: query });
	};
	const onKey = (e) => {
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setOpen(true);
			setActive((a) => Math.min(flat.length - 1, a + 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActive((a) => Math.max(-1, a - 1));
		} else if (e.key === "Enter") {
			e.preventDefault();
			if (active >= 0 && flat[active]) go(flat[active].url);
			else submit();
		} else if (e.key === "Escape") setOpen(false);
	};
	const showList = open && q.trim().length >= 2;
	let index = -1;
	return /* @__PURE__ */ jsxs("div", {
		className: cx("searchbox", `searchbox--${variant}`),
		ref: wrap,
		children: [/* @__PURE__ */ jsxs("form", {
			role: "search",
			className: "searchbox__form",
			onSubmit: (e) => {
				e.preventDefault();
				submit();
			},
			children: [
				/* @__PURE__ */ jsx(Icon, {
					name: "search",
					size: 22,
					className: "searchbox__icon"
				}),
				/* @__PURE__ */ jsx("input", {
					type: "search",
					className: "searchbox__input",
					placeholder,
					"aria-label": "Поиск по клиникам, врачам, услугам",
					role: "combobox",
					"aria-expanded": showList,
					"aria-controls": listId,
					"aria-autocomplete": "list",
					"aria-activedescendant": active >= 0 ? `${listId}-${active}` : void 0,
					autoComplete: "off",
					autoFocus,
					value: q,
					onFocus: () => setOpen(true),
					onChange: (e) => {
						setQ(e.target.value);
						setOpen(true);
					},
					onKeyDown: onKey
				}),
				variant === "hero" ? /* @__PURE__ */ jsx("button", {
					type: "submit",
					className: "btn btn--primary searchbox__submit",
					children: "Найти"
				}) : null
			]
		}), showList ? /* @__PURE__ */ jsxs("div", {
			className: "searchbox__popover",
			id: listId,
			role: "listbox",
			"aria-label": "Подсказки",
			children: [
				flat.length === 0 && !loading ? /* @__PURE__ */ jsxs("p", {
					className: "searchbox__empty",
					children: [
						"Ничего не найдено по запросу «",
						q.trim(),
						"». Попробуйте иначе: «пломба», «брекеты», «болит зуб»."
					]
				}) : null,
				loading && flat.length === 0 ? /* @__PURE__ */ jsx("p", {
					className: "searchbox__empty",
					children: "Ищем…"
				}) : null,
				GROUPS.map((g) => {
					const items = data[g.key] ?? [];
					if (!items.length) return null;
					return /* @__PURE__ */ jsxs("div", {
						role: "group",
						"aria-label": g.title,
						children: [/* @__PURE__ */ jsx("div", {
							className: "searchbox__group",
							children: g.title
						}), items.map((item) => {
							index += 1;
							const i = index;
							return /* @__PURE__ */ jsxs("a", {
								id: `${listId}-${i}`,
								role: "option",
								"aria-selected": active === i,
								href: item.url,
								className: cx("searchbox__item", active === i && "is-active"),
								onMouseEnter: () => setActive(i),
								onClick: (e) => {
									e.preventDefault();
									go(item.url);
								},
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "searchbox__item-icon",
										children: /* @__PURE__ */ jsx(Icon, {
											name: g.icon,
											size: 18
										})
									}),
									/* @__PURE__ */ jsxs("span", {
										className: "grow",
										children: [/* @__PURE__ */ jsx("b", { children: item.name }), item.hint ? /* @__PURE__ */ jsx("span", {
											className: "searchbox__hint",
											children: item.hint
										}) : null]
									}),
									item.rating ? /* @__PURE__ */ jsxs("span", {
										className: "rating",
										children: [/* @__PURE__ */ jsx(Icon, {
											name: "star",
											size: 14
										}), item.rating.toFixed(1).replace(".", ",")]
									}) : null
								]
							}, item.url + item.name);
						})]
					}, g.key);
				}),
				flat.length > 0 ? /* @__PURE__ */ jsxs("button", {
					type: "button",
					className: "searchbox__all",
					onClick: submit,
					children: [
						"Все результаты по «",
						q.trim(),
						"»",
						/* @__PURE__ */ jsx(Icon, {
							name: "arrow-right",
							size: 16
						})
					]
				}) : null
			]
		}) : null]
	});
}
//#endregion
//#region resources/js/lib/toast.ts
var seq = 0;
var subs = /* @__PURE__ */ new Set();
function notify(text, kind = "info") {
	const item = {
		id: ++seq,
		text,
		kind
	};
	subs.forEach((s) => s(item));
}
function subscribeToasts(fn) {
	subs.add(fn);
	return () => {
		subs.delete(fn);
	};
}
//#endregion
//#region resources/js/components/ToastHost.tsx
function ToastHost() {
	const [items, setItems] = useState([]);
	const { flash } = usePage().props;
	useEffect(() => subscribeToasts((t) => {
		setItems((prev) => [...prev.slice(-2), t]);
		window.setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== t.id)), t.kind === "error" ? 7e3 : 4500);
	}), []);
	useEffect(() => {
		if (flash?.success) notify(flash.success);
	}, [flash?.success]);
	useEffect(() => {
		if (flash?.error) notify(flash.error, "error");
	}, [flash?.error]);
	return /* @__PURE__ */ jsx("div", {
		className: "toasts",
		"aria-live": "polite",
		"aria-atomic": "false",
		children: items.map((t) => /* @__PURE__ */ jsxs("div", {
			className: `toast toast--${t.kind}`,
			role: t.kind === "error" ? "alert" : "status",
			children: [
				/* @__PURE__ */ jsx(Icon, {
					name: t.kind === "error" ? "alert" : "check-circle",
					size: 20
				}),
				/* @__PURE__ */ jsx("span", { children: t.text }),
				/* @__PURE__ */ jsx("button", {
					className: "toast__close",
					"aria-label": "Закрыть уведомление",
					onClick: () => setItems((prev) => prev.filter((i) => i.id !== t.id)),
					children: /* @__PURE__ */ jsx(Icon, {
						name: "x",
						size: 18
					})
				})
			]
		}, t.id))
	});
}
//#endregion
//#region resources/js/lib/auth.ts
var can = (user, permission) => !!user && (user.permissions.includes("*") || user.permissions.includes(permission));
var isStaff = (user) => !!user && user.permissions.length > 0;
var isOwner = (user) => !!user && user.role === "clinic_owner";
function accountHome(user) {
	if (isStaff(user)) return "/admin";
	if (isOwner(user)) return "/clinic-cabinet";
	return "/account";
}
function accountLabel(user) {
	if (isStaff(user)) return "Админ-панель";
	if (isOwner(user)) return "Кабинет клиники";
	return "Личный кабинет";
}
//#endregion
//#region resources/js/lib/city.ts
function useCity() {
	const { city, cities, max_app: maxApp } = usePage().props;
	const slug = city?.slug ?? cities?.[0]?.slug ?? "moskva";
	return {
		city,
		slug,
		name: city?.name ?? "Москва",
		/** Уже с предлогом: «в Москве», «в Санкт-Петербурге» */
		nameIn: city?.name_in ?? (city?.name ? `в ${city.name}` : "в Москве"),
		path: (section, query) => {
			const qs = query ? "?" + new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)])).toString() : "";
			if (maxApp && section === "clinics") return `/max/clinics${qs}`;
			return `/${slug}/${section}${qs}`;
		},
		direction: (specialty) => `/${slug}/directions/${specialty}`,
		concern: (concern) => `/${slug}/concerns/${concern}`
	};
}
//#endregion
//#region resources/js/lib/collections.ts
var KEY = "stk.collections.v1";
var empty = () => ({
	favorite: {
		clinic: [],
		doctor: []
	},
	compare: {
		clinic: [],
		doctor: []
	}
});
var EMPTY = empty();
var guest = null;
var listeners = /* @__PURE__ */ new Set();
function load() {
	if (guest) return guest;
	try {
		const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
		const base = empty();
		["favorite", "compare"].forEach((k) => ["clinic", "doctor"].forEach((t) => {
			const list = raw?.[k]?.[t];
			if (Array.isArray(list)) base[k][t] = list.map(Number).filter(Boolean);
		}));
		guest = base;
	} catch {
		guest = empty();
	}
	return guest;
}
function save(next) {
	guest = next;
	try {
		localStorage.setItem(KEY, JSON.stringify(next));
	} catch {}
	listeners.forEach((l) => l());
}
function subscribe(cb) {
	listeners.add(cb);
	const onStorage = (e) => {
		if (e.key === KEY) {
			guest = null;
			cb();
		}
	};
	window.addEventListener("storage", onStorage);
	return () => {
		listeners.delete(cb);
		window.removeEventListener("storage", onStorage);
	};
}
function guestHasItems() {
	const s = load();
	return ["favorite", "compare"].some((k) => s[k].clinic.length + s[k].doctor.length > 0);
}
function guestSnapshot() {
	return load();
}
function clearGuest() {
	save(empty());
}
function useCollections() {
	const { props } = usePage();
	const user = props.auth.user;
	const guestState = useSyncExternalStore(subscribe, load, () => EMPTY);
	const state = user ? props.collections ?? EMPTY : guestState;
	return {
		state,
		has: useCallback((kind, type, id) => state[kind][type].includes(id), [state]),
		count: useCallback((kind) => state[kind].clinic.length + state[kind].doctor.length, [state]),
		toggle: useCallback((kind, type, id) => {
			const label = kind === "favorite" ? "избранное" : "сравнение";
			if (user) {
				router.post("/collections/toggle", {
					kind,
					entity_type: type,
					entity_id: id
				}, {
					preserveScroll: true,
					preserveState: true,
					only: [
						"collections",
						"flash",
						"errors"
					]
				});
				return;
			}
			const s = load();
			const list = s[kind][type];
			const exists = list.includes(id);
			if (!exists && kind === "compare" && list.length >= 4) {
				notify(`В сравнение можно добавить не более 4 позиций.`, "error");
				return;
			}
			save({
				...s,
				[kind]: {
					...s[kind],
					[type]: exists ? list.filter((i) => i !== id) : [...list, id]
				}
			});
			notify(exists ? `Убрано из раздела «${label}»` : `Добавлено в раздел «${label}»`);
		}, [user]),
		isGuest: !user
	};
}
/** После входа переносит гостевые избранное/сравнение в аккаунт. */
function useGuestSync() {
	const { props } = usePage();
	const userId = props.auth.user?.id;
	useEffect(() => {
		if (!userId || !guestHasItems()) return;
		router.post("/collections/sync", guestSnapshot(), {
			preserveScroll: true,
			preserveState: true,
			only: ["collections", "flash"],
			onSuccess: () => clearGuest()
		});
	}, [userId]);
}
//#endregion
//#region resources/js/lib/seo.ts
function upsert(selector, create, attr, value) {
	let el = document.head.querySelector(selector);
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
function useClientSeo() {
	const { seo, app } = usePage().props;
	useEffect(() => {
		if (!seo) return;
		if (seo.title) document.title = seo.title;
		upsert("meta[name=\"description\"]", () => Object.assign(document.createElement("meta"), { name: "description" }), "content", seo.description);
		upsert("link[rel=\"canonical\"]", () => Object.assign(document.createElement("link"), { rel: "canonical" }), "href", seo.canonical);
		upsert("meta[name=\"robots\"]", () => Object.assign(document.createElement("meta"), { name: "robots" }), "content", seo.robots ?? (app?.noindex ? "noindex, nofollow" : "index, follow"));
	}, [
		seo?.title,
		seo?.description,
		seo?.canonical,
		seo?.robots,
		app?.noindex
	]);
}
//#endregion
//#region resources/js/components/AssistantLeadPanel.tsx
function xsrfToken$2() {
	const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
	return match ? decodeURIComponent(match[1]) : "";
}
function slugFromClinicUrl(url) {
	return url.match(/\/clinics\/([^/?#]+)/)?.[1] ?? null;
}
function clinicChoicesFromMessages(messages) {
	const map = /* @__PURE__ */ new Map();
	for (const msg of messages) for (const link of msg.links ?? []) {
		const slug = slugFromClinicUrl(link.url);
		if (slug && !map.has(slug)) map.set(slug, link.label);
	}
	return [...map.entries()].map(([slug, label]) => ({
		slug,
		label
	}));
}
function AssistantLeadPanel({ conversationId, clinics, onClose, onSuccess }) {
	const { auth } = usePage().props;
	const [clinic, setClinic] = useState(clinics[0]?.slug ?? "");
	const [name, setName] = useState(auth.user?.name ?? "");
	const [phone, setPhone] = useState("");
	const [comment, setComment] = useState("");
	const [consent, setConsent] = useState(false);
	const [broadcast, setBroadcast] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(null);
	const clinicOptions = useMemo(() => clinics, [clinics]);
	const submit = async (e) => {
		e.preventDefault();
		if (!conversationId) {
			setError("Сначала задайте вопрос ассистенту, чтобы начать диалог.");
			return;
		}
		if (!broadcast && !clinic) {
			setError("Выберите клинику из списка или отметьте «Любая клиника города».");
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const res = await fetch("/api/v1/assistant/lead", {
				method: "POST",
				credentials: "same-origin",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
					"X-XSRF-TOKEN": xsrfToken$2()
				},
				body: JSON.stringify({
					conversation_id: conversationId,
					clinic: broadcast ? clinic || void 0 : clinic,
					broadcast,
					name,
					phone,
					comment: comment || void 0,
					consent: consent ? true : void 0
				})
			});
			const data = await res.json();
			if (!res.ok) {
				const first = data.errors ? Object.values(data.errors).flat()[0] : data.message;
				throw new Error(first ?? "Не удалось отправить заявку");
			}
			onSuccess(data.message ?? "Заявка отправлена.");
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Ошибка сети");
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ jsxs("form", {
		className: "assistant-lead",
		onSubmit: (e) => void submit(e),
		children: [
			/* @__PURE__ */ jsx("p", {
				className: "text-sm text-muted",
				children: "Клиника перезвонит для подтверждения. Для выбора времени сразу — онлайн-запись в карточке клиники."
			}),
			/* @__PURE__ */ jsx(Check, {
				label: "Любая подходящая клиника города (заявку получат несколько клиник)",
				checked: broadcast,
				onChange: (e) => setBroadcast(e.target.checked)
			}),
			clinicOptions.length && !broadcast ? /* @__PURE__ */ jsx(SelectField, {
				label: "Клиника",
				value: clinic,
				onChange: (e) => setClinic(e.target.value),
				required: true,
				children: clinicOptions.map((c) => /* @__PURE__ */ jsx("option", {
					value: c.slug,
					children: c.label
				}, c.slug))
			}) : !broadcast ? /* @__PURE__ */ jsx(TextField, {
				label: "Slug клиники",
				value: clinic,
				onChange: (e) => setClinic(e.target.value),
				placeholder: "из ссылки каталога",
				required: true
			}) : null,
			/* @__PURE__ */ jsx(TextField, {
				label: "Имя",
				value: name,
				onChange: (e) => setName(e.target.value),
				required: true,
				autoComplete: "name"
			}),
			/* @__PURE__ */ jsx(PhoneField, {
				label: "Телефон",
				value: phone,
				onChange: (e) => setPhone(e.target.value),
				required: true
			}),
			/* @__PURE__ */ jsx(TextArea, {
				label: "Комментарий",
				value: comment,
				onChange: (e) => setComment(e.target.value),
				rows: 2,
				maxLength: 300
			}),
			/* @__PURE__ */ jsx(Check, {
				label: broadcast ? "Согласие: контакты будут переданы нескольким клиникам города для обратного звонка" : "Согласие на обработку персональных данных",
				checked: consent,
				onChange: (e) => setConsent(e.target.checked)
			}),
			error ? /* @__PURE__ */ jsx("p", {
				className: "text-sm assistant-lead__error",
				children: error
			}) : null,
			/* @__PURE__ */ jsxs("div", {
				className: "assistant-lead__actions",
				children: [/* @__PURE__ */ jsx(Button, {
					type: "button",
					variant: "ghost",
					size: "sm",
					onClick: onClose,
					children: "Отмена"
				}), /* @__PURE__ */ jsx(Button, {
					type: "submit",
					size: "sm",
					disabled: busy || !consent,
					children: "Отправить"
				})]
			})
		]
	});
}
//#endregion
//#region resources/js/lib/assistant-stream.ts
function parseSseBlock(block) {
	const lines = block.split("\n");
	let event = "message";
	let data = "";
	for (const line of lines) if (line.startsWith("event:")) event = line.slice(6).trim();
	else if (line.startsWith("data:")) data += line.slice(5).trim();
	if (data === "") return null;
	return {
		event,
		data
	};
}
async function postAssistantMessageStream(url, body, headers, onChunk) {
	const res = await fetch(url, {
		method: "POST",
		credentials: "same-origin",
		headers: {
			Accept: "text/event-stream",
			"Content-Type": "application/json",
			...headers
		},
		body: JSON.stringify(body)
	});
	if (!res.ok) {
		const err = await res.json().catch(() => ({}));
		throw new Error(err.message ?? "Не удалось отправить сообщение");
	}
	const reader = res.body?.getReader();
	if (!reader) throw new Error("Поток недоступен");
	const decoder = new TextDecoder();
	let buffer = "";
	let donePayload = null;
	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const parts = buffer.split("\n\n");
		buffer = parts.pop() ?? "";
		for (const part of parts) {
			const parsed = parseSseBlock(part.trim());
			if (!parsed) continue;
			const json = JSON.parse(parsed.data);
			if (parsed.event === "chunk" && typeof json.text === "string") onChunk(json.text);
			if (parsed.event === "done") donePayload = json;
			if (parsed.event === "error") throw new Error(typeof json.message === "string" ? json.message : "Ошибка ассистента");
		}
	}
	if (!donePayload) throw new Error("Ответ оборвался");
	return donePayload;
}
//#endregion
//#region resources/js/components/AssistantWidget.tsx
var STARTER_REPLIES = [
	"Болит зуб",
	"Подобрать имплантацию",
	"Детский стоматолог",
	"Записаться сегодня"
];
var MOBILE_QUERY = "(max-width: 767px)";
/** История текущего диалога живёт в этой вкладке до её закрытия: переходы и перезагрузки её не теряют. */
var STORAGE_KEY = "stk.assistant.v1";
function loadChat() {
	try {
		const raw = window.sessionStorage.getItem(STORAGE_KEY);
		const parsed = raw ? JSON.parse(raw) : null;
		return parsed && Array.isArray(parsed.messages) ? parsed : null;
	} catch {
		return null;
	}
}
function saveChat(chat) {
	try {
		window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
			...chat,
			messages: chat.messages.slice(-40)
		}));
	} catch {}
}
function clearChat() {
	try {
		window.sessionStorage.removeItem(STORAGE_KEY);
	} catch {}
}
function xsrfToken$1() {
	const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
	return match ? decodeURIComponent(match[1]) : "";
}
/**
* Знак ассистента: графитовый круг с иконкой «облачко с искрой» и живым переливающимся кольцом
* фирменных цветов в духе Siri; пока ассистент отвечает, кольцо вращается быстрее.
*/
function AssistantMark({ active = false, size = "md" }) {
	return /* @__PURE__ */ jsxs("span", {
		className: cx("assistant-mark", `assistant-mark--${size}`, active && "is-active"),
		"aria-hidden": "true",
		children: [
			/* @__PURE__ */ jsx("span", { className: "assistant-mark__glow" }),
			/* @__PURE__ */ jsx("span", { className: "assistant-mark__ring" }),
			/* @__PURE__ */ jsx("span", {
				className: "assistant-mark__core",
				children: /* @__PURE__ */ jsx(Icon, {
					name: "assistant",
					size: size === "sm" ? 20 : 26,
					strokeWidth: 1.8
				})
			})
		]
	});
}
/**
* На телефоне чат занимает весь экран и повторяет видимую область (visualViewport),
* поэтому поле ввода остаётся над клавиатурой, а страница под чатом не прокручивается.
*/
function useMobileSheet(open, panelRef) {
	useEffect(() => {
		const panel = panelRef.current;
		if (!open || !panel || !window.matchMedia(MOBILE_QUERY).matches) return;
		const viewport = window.visualViewport;
		const sync = () => {
			const height = viewport ? viewport.height : window.innerHeight;
			const top = viewport ? viewport.offsetTop : 0;
			panel.style.setProperty("--assistant-vh", `${Math.round(height)}px`);
			panel.style.setProperty("--assistant-top", `${Math.round(top)}px`);
		};
		sync();
		viewport?.addEventListener("resize", sync);
		viewport?.addEventListener("scroll", sync);
		window.addEventListener("resize", sync);
		const root = document.documentElement;
		root.classList.add("assistant-open");
		return () => {
			viewport?.removeEventListener("resize", sync);
			viewport?.removeEventListener("scroll", sync);
			window.removeEventListener("resize", sync);
			root.classList.remove("assistant-open");
			panel.style.removeProperty("--assistant-vh");
			panel.style.removeProperty("--assistant-top");
		};
	}, [open, panelRef]);
}
function AssistantWidget() {
	const { assistant } = usePage().props;
	const streamResponses = assistant?.stream_responses !== false;
	const [open, setOpen] = useState(false);
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState("");
	const [busy, setBusy] = useState(false);
	const [conversationId, setConversationId] = useState(null);
	const [showLead, setShowLead] = useState(false);
	const listRef = useRef(null);
	const panelRef = useRef(null);
	const inputRef = useRef(null);
	const [quickReplies, setQuickReplies] = useState([]);
	const [restored, setRestored] = useState(false);
	useEffect(() => {
		const stored = loadChat();
		if (stored) {
			setMessages(stored.messages);
			setConversationId(stored.conversationId);
			setQuickReplies(stored.quickReplies ?? []);
		}
		setRestored(true);
	}, []);
	useEffect(() => {
		if (restored && messages.some((m) => m.role === "user")) saveChat({
			conversationId,
			messages,
			quickReplies
		});
	}, [
		restored,
		conversationId,
		messages,
		quickReplies
	]);
	const startNewChat = () => {
		clearChat();
		setConversationId(null);
		setQuickReplies([]);
		setShowLead(false);
		setInput("");
		setMessages(assistant?.greeting ? [{
			role: "assistant",
			text: assistant.greeting
		}] : []);
	};
	const clinicChoices = useMemo(() => clinicChoicesFromMessages(messages), [messages]);
	const userHasWritten = messages.some((m) => m.role === "user");
	const chips = quickReplies.length ? quickReplies : userHasWritten ? [] : STARTER_REPLIES;
	useMobileSheet(open, panelRef);
	useEffect(() => {
		if (open && messages.length === 0 && assistant?.greeting) setMessages([{
			role: "assistant",
			text: assistant.greeting
		}]);
	}, [
		open,
		assistant?.greeting,
		messages.length
	]);
	useEffect(() => {
		listRef.current?.scrollTo({
			top: listRef.current.scrollHeight,
			behavior: "smooth"
		});
	}, [
		messages,
		open,
		showLead,
		busy
	]);
	useEffect(() => {
		if (!open) return;
		const onKey = (event) => {
			if (event.key === "Escape") setOpen(false);
		};
		window.addEventListener("keydown", onKey);
		if (!window.matchMedia(MOBILE_QUERY).matches) inputRef.current?.focus();
		return () => window.removeEventListener("keydown", onKey);
	}, [open]);
	useEffect(() => {
		const field = inputRef.current;
		if (field) {
			field.style.height = "auto";
			const contentHeight = field.scrollHeight + 2;
			field.style.height = `${Math.min(contentHeight, 120)}px`;
			field.style.overflowY = contentHeight > 120 ? "auto" : "hidden";
		}
	}, [
		input,
		open,
		showLead
	]);
	const send = useCallback(async (text) => {
		const trimmed = text.trim();
		if (!trimmed || busy) return;
		setInput("");
		setShowLead(false);
		setQuickReplies([]);
		setMessages((m) => [...m, {
			role: "user",
			text: trimmed
		}]);
		setBusy(true);
		try {
			const headers = { "X-XSRF-TOKEN": xsrfToken$1() };
			if (streamResponses) {
				setMessages((m) => [...m, {
					role: "assistant",
					text: ""
				}]);
				const data = await postAssistantMessageStream("/api/v1/assistant/message/stream", {
					message: trimmed,
					conversation_id: conversationId
				}, headers, (piece) => {
					setMessages((m) => {
						const copy = [...m];
						const last = copy[copy.length - 1];
						if (last?.role === "assistant") copy[copy.length - 1] = {
							...last,
							text: last.text + piece
						};
						return copy;
					});
				});
				if (data.conversation_id) setConversationId(data.conversation_id);
				setMessages((m) => {
					const copy = [...m];
					const last = copy[copy.length - 1];
					if (last?.role === "assistant") copy[copy.length - 1] = {
						...last,
						text: data.reply ?? last.text,
						links: data.links
					};
					return copy;
				});
				if (data.suggestions?.length) setQuickReplies(data.suggestions);
			} else {
				const res = await fetch("/api/v1/assistant/message", {
					method: "POST",
					credentials: "same-origin",
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
						...headers
					},
					body: JSON.stringify({
						message: trimmed,
						conversation_id: conversationId
					})
				});
				const data = await res.json();
				if (!res.ok) throw new Error(data.message ?? "Не удалось отправить сообщение");
				if (data.conversation_id) setConversationId(data.conversation_id);
				setMessages((m) => [...m, {
					role: "assistant",
					text: data.reply ?? "…",
					links: data.links
				}]);
				if (data.suggestions?.length) setQuickReplies(data.suggestions);
			}
		} catch (e) {
			setMessages((m) => {
				const last = m[m.length - 1];
				return [...last?.role === "assistant" && last.text === "" ? m.slice(0, -1) : m, {
					role: "assistant",
					text: e instanceof Error ? e.message : "Ошибка сети. Попробуйте позже."
				}];
			});
		} finally {
			setBusy(false);
		}
	}, [
		busy,
		conversationId,
		streamResponses
	]);
	if (!assistant?.enabled) return null;
	const lastMessage = messages[messages.length - 1];
	const waitingFirstPiece = busy && !(lastMessage?.role === "assistant" && lastMessage.text !== "");
	return /* @__PURE__ */ jsxs(Fragment, { children: [!open ? /* @__PURE__ */ jsxs("button", {
		type: "button",
		className: "assistant-fab",
		"aria-label": "Открыть AI-ассистента",
		onClick: () => {
			setOpen(true);
			trackAnalyticsEvent(AnalyticsEvents.assistantOpen);
		},
		children: [/* @__PURE__ */ jsx(AssistantMark, {}), /* @__PURE__ */ jsx("span", {
			className: "assistant-fab__label",
			children: "Спросить AI"
		})]
	}) : null, /* @__PURE__ */ jsxs("div", {
		ref: panelRef,
		className: cx("assistant-panel", open && "is-open"),
		role: "dialog",
		"aria-modal": open,
		"aria-label": "AI-ассистент",
		hidden: !open,
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "assistant-panel__head",
				children: [
					/* @__PURE__ */ jsx(AssistantMark, {
						active: busy,
						size: "sm"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "assistant-panel__title",
						children: [/* @__PURE__ */ jsx("strong", { children: "AI-ассистент" }), /* @__PURE__ */ jsx("span", { children: busy ? "Подбирает ответ…" : "Поможет найти клинику и врача" })]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "assistant-panel__head-actions",
						children: [
							userHasWritten ? /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "assistant-panel__close",
								"aria-label": "Новый диалог",
								title: "Новый диалог",
								disabled: busy,
								onClick: startNewChat,
								children: /* @__PURE__ */ jsx(Icon, {
									name: "refresh",
									size: 18
								})
							}) : null,
							/* @__PURE__ */ jsxs("button", {
								type: "button",
								className: cx("assistant-chip assistant-chip--head", showLead && "is-active"),
								disabled: busy,
								onClick: () => setShowLead((v) => !v),
								children: [/* @__PURE__ */ jsx(Icon, {
									name: "calendar",
									size: 16
								}), "Заявка"]
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "assistant-panel__close",
								"aria-label": "Закрыть",
								onClick: () => setOpen(false),
								children: /* @__PURE__ */ jsx(Icon, {
									name: "x",
									size: 20
								})
							})
						]
					})
				]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "assistant-panel__messages",
				ref: listRef,
				"aria-live": "polite",
				children: [messages.map((m, i) => m.role === "assistant" && m.text === "" ? null : /* @__PURE__ */ jsxs("div", {
					className: cx("assistant-bubble", m.role === "user" && "is-user"),
					children: [/* @__PURE__ */ jsx("p", {
						className: "assistant-bubble__text",
						children: m.text
					}), m.links?.length ? /* @__PURE__ */ jsx("ul", {
						className: "assistant-bubble__links",
						children: m.links.map((l) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("a", {
							href: l.url,
							target: "_blank",
							rel: "noreferrer",
							children: [l.label, /* @__PURE__ */ jsx(Icon, {
								name: "chevron-right",
								size: 14
							})]
						}) }, l.url))
					}) : null]
				}, i)), waitingFirstPiece ? /* @__PURE__ */ jsxs("div", {
					className: "assistant-bubble assistant-typing",
					"aria-label": "Ассистент печатает",
					children: [
						/* @__PURE__ */ jsx("span", {}),
						/* @__PURE__ */ jsx("span", {}),
						/* @__PURE__ */ jsx("span", {})
					]
				}) : null]
			}),
			showLead ? /* @__PURE__ */ jsx(AssistantLeadPanel, {
				conversationId,
				clinics: clinicChoices,
				onClose: () => setShowLead(false),
				onSuccess: (text) => setMessages((m) => [...m, {
					role: "assistant",
					text
				}])
			}) : null,
			!showLead && chips.length ? /* @__PURE__ */ jsx("div", {
				className: "assistant-panel__chips",
				children: chips.slice(0, 4).map((s) => /* @__PURE__ */ jsx("button", {
					type: "button",
					className: "assistant-chip",
					disabled: busy,
					onClick: () => void send(s),
					children: s
				}, s))
			}) : null,
			!showLead ? /* @__PURE__ */ jsxs("form", {
				className: "assistant-panel__form",
				onSubmit: (e) => {
					e.preventDefault();
					send(input);
				},
				children: [/* @__PURE__ */ jsx("textarea", {
					ref: inputRef,
					rows: 1,
					value: input,
					onChange: (e) => setInput(e.target.value),
					onKeyDown: (e) => {
						if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
							e.preventDefault();
							send(input);
						}
					},
					placeholder: "Напишите вопрос…",
					"aria-label": "Сообщение ассистенту",
					maxLength: 2e3,
					enterKeyHint: "send",
					autoComplete: "off"
				}), /* @__PURE__ */ jsx("button", {
					type: "submit",
					className: "assistant-panel__send",
					"aria-label": "Отправить",
					disabled: busy || !input.trim(),
					children: /* @__PURE__ */ jsx(Icon, {
						name: "arrow-up",
						size: 20,
						strokeWidth: 2.4
					})
				})]
			}) : null,
			!showLead && !userHasWritten && assistant.disclaimer ? /* @__PURE__ */ jsx("p", {
				className: "assistant-panel__note",
				children: assistant.disclaimer
			}) : null
		]
	})] });
}
//#endregion
//#region resources/js/components/InstallAppButton.tsx
/** variant="menu" — строка в мобильном меню вместо иконки в шапке. */
function InstallAppButton({ className, variant = "icon" }) {
	const { canShow, ios, hasNativePrompt, install } = usePwaInstall();
	const [hintOpen, setHintOpen] = useState(false);
	if (!canShow) return null;
	const openHint = () => setHintOpen(true);
	const onClick = async () => {
		if (hasNativePrompt) {
			if (await install() === "dismissed") openHint();
			return;
		}
		openHint();
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [variant === "menu" ? /* @__PURE__ */ jsxs("button", {
		type: "button",
		className: className ?? "mmenu-install",
		onClick,
		children: [
			/* @__PURE__ */ jsx("span", {
				className: "mmenu-install__icon",
				"aria-hidden": "true",
				children: /* @__PURE__ */ jsx(Icon, {
					name: "install",
					size: 22
				})
			}),
			/* @__PURE__ */ jsxs("span", {
				className: "mmenu-install__text",
				children: [/* @__PURE__ */ jsx("b", { children: "Установить приложение" }), /* @__PURE__ */ jsx("span", { children: "Запуск в один тап с главного экрана" })]
			}),
			/* @__PURE__ */ jsx(Icon, {
				name: "chevron-right",
				size: 18
			})
		]
	}) : /* @__PURE__ */ jsx("button", {
		type: "button",
		className: className ?? "icon-link",
		"aria-label": "Установить приложение на рабочий стол",
		title: "Установить приложение",
		onClick,
		children: /* @__PURE__ */ jsx(Icon, {
			name: "install",
			size: 22
		})
	}), /* @__PURE__ */ jsx(Drawer, {
		open: hintOpen,
		onClose: () => setHintOpen(false),
		title: "Установить МирКлиник",
		children: /* @__PURE__ */ jsxs("div", {
			className: "stack install-hint",
			children: [
				/* @__PURE__ */ jsx("p", {
					className: "text-sm text-muted",
					children: "Добавьте сайт на рабочий стол или домашний экран — запуск в один тап, без адресной строки."
				}),
				ios ? /* @__PURE__ */ jsxs("ol", {
					className: "install-hint__steps text-sm",
					children: [
						/* @__PURE__ */ jsx("li", { children: "Нажмите «Поделиться» в Safari." }),
						/* @__PURE__ */ jsx("li", { children: "Выберите «На экран Домой»." }),
						/* @__PURE__ */ jsx("li", { children: "Подтвердите установку." })
					]
				}) : /* @__PURE__ */ jsxs("ol", {
					className: "install-hint__steps text-sm",
					children: [
						/* @__PURE__ */ jsx("li", { children: "Откройте меню браузера (⋮ или «…»)." }),
						/* @__PURE__ */ jsx("li", { children: "Выберите «Установить приложение» или «Добавить на главный экран»." }),
						/* @__PURE__ */ jsx("li", { children: "Подтвердите установку." })
					]
				}),
				/* @__PURE__ */ jsx(Button, {
					type: "button",
					block: true,
					onClick: () => setHintOpen(false),
					children: "Понятно"
				})
			]
		})
	})] });
}
//#endregion
//#region resources/js/components/CitySelectModal.tsx
function CitySelectModal({ open, onClose, cities, currentSlug, onPick, title = "Выберите город" }) {
	const [q, setQ] = useState("");
	const list = useMemo(() => {
		const needle = q.trim().toLowerCase();
		return cities.filter((c) => !needle || c.name.toLowerCase().includes(needle) || (c.region ?? "").toLowerCase().includes(needle));
	}, [cities, q]);
	const choose = (slug) => {
		onClose();
		onPick(slug);
	};
	return /* @__PURE__ */ jsx(Modal, {
		open,
		onClose,
		title,
		wide: true,
		children: /* @__PURE__ */ jsxs("div", {
			className: "stack city-select",
			children: [
				/* @__PURE__ */ jsx(SearchInput, {
					label: "Поиск города",
					placeholder: "Начните вводить название или регион",
					value: q,
					onChange: (e) => setQ(e.target.value),
					"data-autofocus": true
				}),
				/* @__PURE__ */ jsx("ul", {
					className: "city-list city-list--modal",
					role: "listbox",
					"aria-label": "Города",
					children: list.map((c) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs("button", {
						type: "button",
						role: "option",
						"aria-selected": c.slug === currentSlug,
						className: c.slug === currentSlug ? "is-active" : "",
						onClick: () => choose(c.slug),
						children: [
							/* @__PURE__ */ jsx("b", { children: c.name }),
							c.region ? /* @__PURE__ */ jsx("span", {
								className: "text-muted text-sm",
								children: c.region
							}) : null,
							c.slug === currentSlug ? /* @__PURE__ */ jsx(Icon, {
								name: "check",
								size: 18
							}) : null
						]
					}) }, c.slug))
				}),
				list.length === 0 ? /* @__PURE__ */ jsx("p", {
					className: "text-muted text-sm",
					children: "Город не найден. Мы постоянно расширяем покрытие."
				}) : null
			]
		})
	});
}
//#endregion
//#region resources/js/components/CityPrompt.tsx
function xsrfToken() {
	const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
	return match ? decodeURIComponent(match[1]) : "";
}
function CityPrompt() {
	const { city_prompt, cities, max_app } = usePage().props;
	const current = useCity();
	const [open, setOpen] = useState(false);
	const [listOpen, setListOpen] = useState(false);
	const [geoLoading, setGeoLoading] = useState(false);
	const [geoError, setGeoError] = useState(null);
	const prompt = city_prompt;
	useEffect(() => {
		if (prompt && !max_app) setOpen(true);
	}, [prompt, max_app]);
	const confirmCity = useCallback((slug) => {
		trackAnalyticsEvent(AnalyticsEvents.cityPick, {
			city_slug: slug,
			source: "prompt"
		});
		router.post(`/city/${slug}/confirm`, {}, { preserveScroll: false });
	}, []);
	const switchCity = useCallback((slug) => {
		if (slug === current.slug) {
			confirmCity(slug);
			return;
		}
		trackAnalyticsEvent(AnalyticsEvents.cityPick, {
			city_slug: slug,
			source: "prompt_list"
		});
		router.post(`/city/${slug}`, {}, { preserveScroll: false });
	}, [confirmCity, current.slug]);
	const detectByDevice = () => {
		if (!("geolocation" in navigator)) {
			setGeoError("Браузер не поддерживает геолокацию.");
			return;
		}
		setGeoLoading(true);
		setGeoError(null);
		navigator.geolocation.getCurrentPosition(async (pos) => {
			try {
				const response = await fetch("/api/v1/city/locate", {
					method: "POST",
					credentials: "same-origin",
					headers: {
						Accept: "application/json",
						"Content-Type": "application/json",
						"X-XSRF-TOKEN": xsrfToken()
					},
					body: JSON.stringify({
						lat: pos.coords.latitude,
						lng: pos.coords.longitude
					})
				});
				const json = await response.json();
				if (!response.ok || !json.city?.slug) {
					setGeoError(json.message ?? "Не удалось определить город.");
					return;
				}
				switchCity(json.city.slug);
			} catch {
				setGeoError("Не удалось определить город. Выберите из списка.");
			} finally {
				setGeoLoading(false);
			}
		}, () => {
			setGeoLoading(false);
			setGeoError("Нет доступа к геолокации. Выберите город вручную.");
		}, {
			enableHighAccuracy: false,
			timeout: 12e3,
			maximumAge: 3e5
		});
	};
	if (!prompt || max_app) return null;
	const suggested = prompt.suggested;
	const hint = prompt.source === "ip" ? "Определили по вашему IP-адресу. Можно изменить или уточнить по GPS." : "Выберите город, чтобы видеть актуальные клиники и цены.";
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Modal, {
		open,
		onClose: () => confirmCity(current.slug),
		title: "Ваш город",
		footer: /* @__PURE__ */ jsxs("div", {
			className: "city-prompt__actions",
			children: [/* @__PURE__ */ jsxs(Button, {
				type: "button",
				variant: "dark",
				className: "city-prompt__yes",
				onClick: () => switchCity(suggested.slug),
				children: ["Да, ", suggested.name]
			}), /* @__PURE__ */ jsx(Button, {
				type: "button",
				variant: "outline",
				onClick: () => setListOpen(true),
				children: "Выбрать другой"
			})]
		}),
		children: /* @__PURE__ */ jsxs("div", {
			className: "city-prompt stack",
			children: [
				/* @__PURE__ */ jsxs("p", {
					className: "city-prompt__lead",
					children: [
						"Похоже, вы в ",
						/* @__PURE__ */ jsx("strong", { children: suggested.name_in ?? suggested.name }),
						". Показывать клиники и цены для этого города?"
					]
				}),
				/* @__PURE__ */ jsx("p", {
					className: "text-sm text-muted",
					children: hint
				}),
				/* @__PURE__ */ jsx(Button, {
					type: "button",
					variant: "secondary",
					size: "sm",
					loading: geoLoading,
					onClick: detectByDevice,
					className: "city-prompt__geo",
					children: "Определить по GPS"
				}),
				geoError ? /* @__PURE__ */ jsx("p", {
					className: "text-sm city-prompt__error",
					children: geoError
				}) : null
			]
		})
	}), /* @__PURE__ */ jsx(CitySelectModal, {
		open: listOpen,
		onClose: () => setListOpen(false),
		cities: cities ?? [],
		currentSlug: current.slug,
		onPick: switchCity,
		title: "Выберите город"
	})] });
}
//#endregion
//#region resources/js/layouts/CityPicker.tsx
function CityPicker() {
	const { name, slug } = useCity();
	const { cities } = usePage().props;
	const [open, setOpen] = useState(false);
	const pick = (citySlug) => {
		if (citySlug === slug) return;
		trackAnalyticsEvent(AnalyticsEvents.cityPick, {
			city_slug: citySlug,
			source: "header"
		});
		router.post(`/city/${citySlug}`, {}, { preserveScroll: false });
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("button", {
		type: "button",
		className: "city-btn",
		onClick: () => setOpen(true),
		"aria-haspopup": "dialog",
		"aria-label": `Город: ${name}. Нажмите, чтобы сменить`,
		children: [
			/* @__PURE__ */ jsx(Icon, {
				name: "pin",
				size: 18
			}),
			/* @__PURE__ */ jsx("span", {
				className: "city-btn__label",
				children: name
			}),
			/* @__PURE__ */ jsx(Icon, {
				name: "chevron-down",
				size: 16
			})
		]
	}), /* @__PURE__ */ jsx(CitySelectModal, {
		open,
		onClose: () => setOpen(false),
		cities: cities ?? [],
		currentSlug: slug,
		onPick: pick
	})] });
}
//#endregion
//#region resources/js/components/brand/logoSpheres.ts
var LOGO_FAMILIES = [
	"teal",
	"petrol",
	"emerald",
	"lime",
	"fresh"
];
/** Значения токенов --color-logo-* из tokens.css: запасной вариант для SSR, файлов иконок и старых браузеров. */
var LOGO_TOKEN_FALLBACK = {
	teal: {
		light: "#12d8d3",
		deep: "#0393a0"
	},
	petrol: {
		light: "#0396a3",
		deep: "#034a64"
	},
	emerald: {
		light: "#30d384",
		deep: "#04926f"
	},
	lime: {
		light: "#c6f242",
		deep: "#7dd630"
	},
	fresh: {
		light: "#cff659",
		deep: "#36c462"
	}
};
var LOGO_SPHERES = [
	{
		x: 696.6,
		y: 206.1,
		r: 29.3,
		family: "teal",
		depth: -1
	},
	{
		x: 576.8,
		y: 306.5,
		r: 108.5,
		family: "teal",
		depth: 1
	},
	{
		x: 793.9,
		y: 274.4,
		r: 70.5,
		family: "emerald",
		depth: -.6
	},
	{
		x: 384.7,
		y: 328.1,
		r: 73.5,
		family: "lime",
		depth: .8
	},
	{
		x: 917.2,
		y: 436.8,
		r: 117.8,
		family: "teal",
		depth: .7
	},
	{
		x: 270,
		y: 462.1,
		r: 52,
		family: "petrol",
		depth: -1
	},
	{
		x: 696.1,
		y: 523.9,
		r: 111.3,
		family: "fresh",
		depth: 1
	},
	{
		x: 449,
		y: 532.7,
		r: 119,
		family: "petrol",
		depth: -.55
	},
	{
		x: 1031.3,
		y: 611.4,
		r: 77.8,
		family: "lime",
		depth: -.8
	},
	{
		x: 250.7,
		y: 631.5,
		r: 90.5,
		family: "teal",
		depth: .6
	},
	{
		x: 849,
		y: 706,
		r: 111.5,
		family: "teal",
		depth: .9
	},
	{
		x: 535.2,
		y: 751.4,
		r: 107.5,
		family: "fresh",
		depth: .9
	},
	{
		x: 360.5,
		y: 722.8,
		r: 37,
		family: "teal",
		depth: -1
	},
	{
		x: 1028.5,
		y: 749.5,
		r: 41,
		family: "teal",
		depth: 1
	},
	{
		x: 235.4,
		y: 768.8,
		r: 32,
		family: "lime",
		depth: -1
	},
	{
		x: 339.6,
		y: 881.1,
		r: 106.8,
		family: "teal",
		depth: .7
	},
	{
		x: 712.6,
		y: 913.9,
		r: 116.5,
		family: "petrol",
		depth: -.6
	},
	{
		x: 949.6,
		y: 896.1,
		r: 94.3,
		family: "emerald",
		depth: .6
	},
	{
		x: 501.5,
		y: 1e3,
		r: 85.8,
		family: "teal",
		depth: -.7
	},
	{
		x: 851.8,
		y: 1014.5,
		r: 38.8,
		family: "lime",
		depth: 1
	},
	{
		x: 626.2,
		y: 1064.6,
		r: 36,
		family: "teal",
		depth: -1
	}
];
/** Центр и полуразмер композиции в пикселях исходника (по крайним точкам кругов). */
var LOGO_CENTER = {
	x: 634.65,
	y: 638.7
};
var LOGO_HALF_EXTENT = 474.4;
/** Квадратный viewBox для плоской версии: композиция по центру, края вплотную. */
var LOGO_VIEWBOX = `${LOGO_CENTER.x - LOGO_HALF_EXTENT} ${LOGO_CENTER.y - LOGO_HALF_EXTENT} ${LOGO_HALF_EXTENT * 2} ${LOGO_HALF_EXTENT * 2}`;
//#endregion
//#region resources/js/components/brand/logoRenderer.ts
/**
* Доля холста, которую занимает вид спереди. Холст больше видимого знака,
* чтобы сферы, выходящие вперёд при повороте, не обрезались.
*/
var LOGO_CANVAS_OVERSCAN = 1.3;
/** Расстояние до камеры в радиусах композиции: чем меньше, тем сильнее перспектива. */
var CAMERA_DISTANCE = 6;
var FLOATS_PER_VERTEX = 11;
var VERTICES_PER_SPHERE = 6;
var VERTEX_SHADER = `
attribute vec2 aPos;
attribute vec2 aUv;
attribute vec3 aLight;
attribute vec3 aDeep;
attribute float aEdge;
varying vec2 vUv;
varying vec3 vLight;
varying vec3 vDeep;
varying float vEdge;
void main() {
    vUv = aUv;
    vLight = aLight;
    vDeep = aDeep;
    vEdge = aEdge;
    gl_Position = vec4(aPos, 0.0, 1.0);
}`;
var FRAGMENT_SHADER = `
precision mediump float;
varying vec2 vUv;
varying vec3 vLight;
varying vec3 vDeep;
varying float vEdge;
void main() {
    float dist = length(vUv);
    float alpha = clamp((1.0 - dist) / vEdge + 0.5, 0.0, 1.0);
    if (alpha <= 0.0) discard;
    vec2 uv = vUv / max(dist, 1.0);
    vec3 n = vec3(uv, sqrt(max(0.0, 1.0 - dot(uv, uv))));
    vec3 lightDir = normalize(vec3(0.55, 0.62, 0.56));
    float diffuse = dot(n, lightDir) * 0.5 + 0.5;
    float ramp = dot(uv, vec2(0.7071, 0.7071)) * 0.5 + 0.5;
    float t = smoothstep(0.02, 1.0, mix(ramp, diffuse, 0.4));
    vec3 col = mix(vDeep, vLight, t);
    float rim = pow(1.0 - n.z, 3.0);
    col *= 1.0 - 0.1 * rim;
    vec3 halfVec = normalize(lightDir + vec3(0.0, 0.0, 1.0));
    float spec = pow(max(dot(n, halfVec), 0.0), 22.0);
    col = mix(col, vec3(1.0), spec * 0.16);
    col += vLight * 0.08 * pow(max(dot(n, normalize(vec3(-0.6, -0.5, 0.6))), 0.0), 6.0);
    gl_FragColor = vec4(col * alpha, alpha);
}`;
function parseColor(value, fallback) {
	const hex = (value.trim().match(/^#([0-9a-f]{6})$/i)?.[1] ?? fallback.slice(1)).toLowerCase();
	return [
		parseInt(hex.slice(0, 2), 16) / 255,
		parseInt(hex.slice(2, 4), 16) / 255,
		parseInt(hex.slice(4, 6), 16) / 255
	];
}
function readPalette(source) {
	const style = getComputedStyle(source);
	const palette = {};
	for (const family of LOGO_FAMILIES) {
		const fallback = LOGO_TOKEN_FALLBACK[family];
		palette[family] = {
			light: parseColor(style.getPropertyValue(`--color-logo-${family}-light`), fallback.light),
			deep: parseColor(style.getPropertyValue(`--color-logo-${family}-deep`), fallback.deep)
		};
	}
	return palette;
}
/**
* Сферы в мировых координатах: вид спереди совпадает с исходником,
* поэтому позиция и радиус сферы, отодвинутой по глубине, компенсируют перспективу.
*/
function buildScene() {
	return LOGO_SPHERES.map((sphere) => {
		const fx = (sphere.x - LOGO_CENTER.x) / LOGO_HALF_EXTENT;
		const fy = -(sphere.y - LOGO_CENTER.y) / LOGO_HALF_EXTENT;
		const fr = sphere.r / LOGO_HALF_EXTENT;
		const shell = Math.sqrt(Math.max(0, 1.1025 - (fx * fx + fy * fy)));
		const z = sphere.depth * shell * .78;
		const k = (CAMERA_DISTANCE - z) / CAMERA_DISTANCE;
		return {
			x: fx * k,
			y: fy * k,
			z,
			r: fr * k,
			family: sphere.family
		};
	});
}
function isWebGlAvailable() {
	try {
		const canvas = document.createElement("canvas");
		return Boolean(window.WebGLRenderingContext && canvas.getContext("webgl"));
	} catch {
		return false;
	}
}
function compile(gl, type, source) {
	const shader = gl.createShader(type);
	if (!shader) throw new Error("shader");
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? "shader");
	return shader;
}
/**
* Рисует трёхмерный логотип в canvas: каждая сфера — отдельный объём с освещением,
* весь шар вращается вокруг вертикальной оси. Возвращает null, если WebGL недоступен.
*/
function createLogoRenderer(canvas, options = {}) {
	const gl = canvas.getContext("webgl", {
		alpha: true,
		premultipliedAlpha: true,
		antialias: false,
		depth: false,
		powerPreference: "low-power"
	});
	if (!gl) return null;
	let program;
	try {
		program = gl.createProgram();
		gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
		gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
	} catch {
		return null;
	}
	gl.useProgram(program);
	const buffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	const scene = buildScene();
	const vertices = new Float32Array(scene.length * VERTICES_PER_SPHERE * FLOATS_PER_VERTEX);
	gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength, gl.DYNAMIC_DRAW);
	const stride = 44;
	for (const [name, size, offset] of [
		[
			"aPos",
			2,
			0
		],
		[
			"aUv",
			2,
			2
		],
		[
			"aLight",
			3,
			4
		],
		[
			"aDeep",
			3,
			7
		],
		[
			"aEdge",
			1,
			10
		]
	]) {
		const location = gl.getAttribLocation(program, name);
		gl.enableVertexAttribArray(location);
		gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset * 4);
	}
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
	gl.clearColor(0, 0, 0, 0);
	let palette = readPalette(options.tokenSource ?? document.documentElement);
	let duration = Math.max(1, options.duration ?? 20);
	let hoverSpeed = options.hoverSpeed ?? .35;
	let still = options.still ?? false;
	let hovered = false;
	let visible = true;
	let speed = 1;
	let angle = 0;
	let frame = 0;
	let lastTime = 0;
	let pixelSize = 1;
	const order = scene.map((_, index) => index);
	const projected = scene.map(() => ({
		x: 0,
		y: 0,
		z: 0,
		r: 0
	}));
	const resize = () => {
		const ratio = Math.min(window.devicePixelRatio || 1, 2);
		const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
		const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
		if (canvas.width !== width || canvas.height !== height) {
			canvas.width = width;
			canvas.height = height;
		}
		pixelSize = 2 / Math.min(width, height);
		gl.viewport(0, 0, width, height);
	};
	const draw = () => {
		const cos = Math.cos(angle);
		const sin = Math.sin(angle);
		for (let i = 0; i < scene.length; i++) {
			const s = scene[i];
			const x = s.x * cos + s.z * sin;
			const z = -s.x * sin + s.z * cos;
			const scale = CAMERA_DISTANCE / (CAMERA_DISTANCE - z) / LOGO_CANVAS_OVERSCAN;
			projected[i] = {
				x: x * scale,
				y: s.y * scale,
				z,
				r: s.r * scale
			};
		}
		order.sort((a, b) => projected[a].z - projected[b].z);
		let offset = 0;
		for (const index of order) {
			const p = projected[index];
			const colors = palette[scene[index].family];
			const pad = 1 + pixelSize * 1.5 / p.r;
			const edge = pixelSize / p.r;
			for (const [cx, cy] of [
				[-1, -1],
				[1, -1],
				[1, 1],
				[-1, -1],
				[1, 1],
				[-1, 1]
			]) {
				vertices[offset++] = p.x + cx * p.r * pad;
				vertices[offset++] = p.y + cy * p.r * pad;
				vertices[offset++] = cx * pad;
				vertices[offset++] = cy * pad;
				vertices[offset++] = colors.light[0];
				vertices[offset++] = colors.light[1];
				vertices[offset++] = colors.light[2];
				vertices[offset++] = colors.deep[0];
				vertices[offset++] = colors.deep[1];
				vertices[offset++] = colors.deep[2];
				vertices[offset++] = edge;
			}
		}
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.drawArrays(gl.TRIANGLES, 0, scene.length * VERTICES_PER_SPHERE);
	};
	const tick = (time) => {
		frame = 0;
		const delta = lastTime ? Math.min((time - lastTime) / 1e3, .1) : 0;
		lastTime = time;
		speed += ((hovered ? hoverSpeed : 1) - speed) * Math.min(1, delta * 4);
		angle = (angle + delta * speed * Math.PI * 2 / duration) % (Math.PI * 2);
		draw();
		schedule();
	};
	const schedule = () => {
		if (!frame && !still && visible && !document.hidden) frame = requestAnimationFrame(tick);
	};
	const stop = () => {
		if (frame) {
			cancelAnimationFrame(frame);
			frame = 0;
		}
		lastTime = 0;
	};
	const onVisibility = () => {
		if (document.hidden) stop();
		else schedule();
	};
	const onEnter = () => {
		hovered = true;
	};
	const onLeave = () => {
		hovered = false;
	};
	const observer = typeof IntersectionObserver === "function" ? new IntersectionObserver(([entry]) => {
		visible = entry.isIntersecting;
		if (visible) schedule();
		else stop();
	}) : null;
	observer?.observe(canvas);
	const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(() => {
		resize();
		draw();
	}) : null;
	resizeObserver?.observe(canvas);
	document.addEventListener("visibilitychange", onVisibility);
	const hoverTarget = options.hoverTarget ?? canvas;
	hoverTarget.addEventListener("pointerenter", onEnter);
	hoverTarget.addEventListener("pointerleave", onLeave);
	resize();
	draw();
	schedule();
	return {
		setDuration: (seconds) => {
			duration = Math.max(1, seconds);
		},
		setHoverSpeed: (factor) => {
			hoverSpeed = Math.max(0, factor);
		},
		setStill: (value) => {
			still = value;
			if (still) {
				stop();
				angle = 0;
				draw();
			} else schedule();
		},
		resize: () => {
			palette = readPalette(options.tokenSource ?? document.documentElement);
			resize();
			draw();
		},
		destroy: () => {
			stop();
			observer?.disconnect();
			resizeObserver?.disconnect();
			document.removeEventListener("visibilitychange", onVisibility);
			hoverTarget.removeEventListener("pointerenter", onEnter);
			hoverTarget.removeEventListener("pointerleave", onLeave);
			gl.deleteBuffer(buffer);
			gl.deleteProgram(program);
			gl.getExtension("WEBGL_lose_context")?.loseContext();
		}
	};
}
//#endregion
//#region resources/js/components/brand/BrandMark.tsx
/** Плоский знак: круги с градиентами из токенов --color-logo-*. Работает без JS и WebGL. */
function BrandMarkStatic({ size = 40, className }) {
	const prefix = `lg${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
	return /* @__PURE__ */ jsxs("svg", {
		className,
		width: size,
		height: size,
		viewBox: LOGO_VIEWBOX,
		"aria-hidden": "true",
		focusable: "false",
		children: [/* @__PURE__ */ jsx("defs", { children: LOGO_FAMILIES.map((family) => /* @__PURE__ */ jsxs("linearGradient", {
			id: `${prefix}-${family}`,
			x1: "0.85",
			y1: "0.15",
			x2: "0.15",
			y2: "0.85",
			children: [/* @__PURE__ */ jsx("stop", {
				offset: "0",
				style: { stopColor: `var(--color-logo-${family}-light)` }
			}), /* @__PURE__ */ jsx("stop", {
				offset: "1",
				style: { stopColor: `var(--color-logo-${family}-deep)` }
			})]
		}, family)) }), LOGO_SPHERES.map((sphere, index) => /* @__PURE__ */ jsx("circle", {
			cx: sphere.x,
			cy: sphere.y,
			r: sphere.r,
			fill: `url(#${prefix}-${sphere.family})`
		}, index))]
	});
}
/**
* Трёхмерный знак: 21 объёмная сфера вращается вокруг вертикальной оси.
* До загрузки, без WebGL и при prefers-reduced-motion показывается плоский SVG.
*/
function BrandMark({ size = 40, duration = 20, hoverSpeed = .35, className }) {
	const hostRef = useRef(null);
	const canvasRef = useRef(null);
	const rendererRef = useRef(null);
	const [mode, setMode] = useState("static");
	useEffect(() => {
		const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
		const update = () => setMode(!motion.matches && isWebGlAvailable() ? "3d" : "static");
		update();
		motion.addEventListener("change", update);
		return () => motion.removeEventListener("change", update);
	}, []);
	useEffect(() => {
		const canvas = canvasRef.current;
		if (mode !== "3d" || !canvas) return;
		const renderer = createLogoRenderer(canvas, {
			duration,
			hoverSpeed,
			hoverTarget: hostRef.current?.closest("a") ?? hostRef.current
		});
		if (!renderer) {
			setMode("static");
			return;
		}
		rendererRef.current = renderer;
		const onLost = (event) => {
			event.preventDefault();
			setMode("static");
		};
		canvas.addEventListener("webglcontextlost", onLost);
		return () => {
			canvas.removeEventListener("webglcontextlost", onLost);
			renderer.destroy();
			rendererRef.current = null;
		};
	}, [mode]);
	useEffect(() => {
		rendererRef.current?.setDuration(duration);
		rendererRef.current?.setHoverSpeed(hoverSpeed);
	}, [duration, hoverSpeed]);
	return /* @__PURE__ */ jsxs("span", {
		ref: hostRef,
		className: `brand-mark${className ? ` ${className}` : ""}`,
		style: {
			width: size,
			height: size
		},
		"data-mode": mode,
		children: [/* @__PURE__ */ jsx(BrandMarkStatic, {
			size,
			className: "brand-mark__static"
		}), mode === "3d" ? /* @__PURE__ */ jsx("canvas", {
			ref: canvasRef,
			className: "brand-mark__canvas",
			"aria-hidden": "true",
			style: {
				width: size * LOGO_CANVAS_OVERSCAN,
				height: size * LOGO_CANVAS_OVERSCAN,
				margin: -size * (LOGO_CANVAS_OVERSCAN - 1) / 2
			}
		}) : null]
	});
}
//#endregion
//#region resources/js/layouts/Logo.tsx
function LogoMark({ size = 40 }) {
	return /* @__PURE__ */ jsx(BrandMarkStatic, { size });
}
function Logo({ to = "/", suffix, mobileSuffix, animated = true }) {
	const appName = usePage().props.app?.name ?? "МирКлиник";
	const shortSuffix = mobileSuffix ?? suffix;
	return /* @__PURE__ */ jsxs(Link, {
		href: to,
		className: animated ? "logo logo--brand" : "logo",
		"aria-label": `${appName} — на главную`,
		children: [
			animated ? /* @__PURE__ */ jsx(BrandMark, { size: 40 }) : /* @__PURE__ */ jsx(LogoMark, {}),
			/* @__PURE__ */ jsx("span", {
				className: "logo__text",
				children: appName
			}),
			suffix ? /* @__PURE__ */ jsx("span", {
				className: "logo__suffix hide-mobile",
				children: suffix
			}) : null,
			shortSuffix ? /* @__PURE__ */ jsx("span", {
				className: "logo__suffix show-mobile",
				children: shortSuffix
			}) : null
		]
	});
}
//#endregion
//#region resources/js/layouts/MobileMenu.tsx
function initials(name) {
	return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}
function Count({ n }) {
	return n ? /* @__PURE__ */ jsx("span", {
		className: "mmenu-count",
		children: n > 99 ? "99+" : n
	}) : null;
}
/** Мобильное меню: аккаунт, каталог плитками, «моё», установка приложения и служебные ссылки. */
function MobileMenu({ isActive, favorites, compare }) {
	const { auth } = usePage().props;
	const city = useCity();
	const user = auth?.user ?? null;
	const catalog = [
		{
			href: city.path("clinics"),
			label: "Клиники",
			icon: "building"
		},
		{
			href: city.path("doctors"),
			label: "Врачи",
			icon: "users"
		},
		{
			href: city.path("directions"),
			label: "Направления",
			icon: "tooth"
		},
		{
			href: city.path("prices"),
			label: "Цены",
			icon: "ruble"
		},
		{
			href: city.path("reviews"),
			label: "Отзывы",
			icon: "star"
		}
	];
	const mine = [
		{
			href: "/favorites",
			label: "Избранное",
			icon: "heart",
			badge: favorites
		},
		{
			href: "/compare",
			label: "Сравнение",
			icon: "scale",
			badge: compare
		},
		...user ? [{
			href: "/account/leads",
			label: "Мои записи",
			icon: "calendar"
		}, {
			href: "/account/notifications",
			label: "Уведомления",
			icon: "bell",
			badge: user.unread
		}] : []
	];
	return /* @__PURE__ */ jsxs("div", {
		className: "mmenu",
		children: [
			user ? /* @__PURE__ */ jsxs(Link, {
				href: accountHome(user),
				className: "mmenu-user",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "mmenu-user__avatar",
						"aria-hidden": "true",
						children: initials(user.name) || /* @__PURE__ */ jsx(Icon, {
							name: "user",
							size: 20
						})
					}),
					/* @__PURE__ */ jsxs("span", {
						className: "mmenu-user__text",
						children: [/* @__PURE__ */ jsx("b", { children: user.name }), /* @__PURE__ */ jsx("span", { children: accountLabel(user) })]
					}),
					/* @__PURE__ */ jsx(Icon, {
						name: "chevron-right",
						size: 18
					})
				]
			}) : /* @__PURE__ */ jsxs("div", {
				className: "mmenu-auth",
				children: [/* @__PURE__ */ jsx("p", { children: "Войдите, чтобы записываться онлайн, хранить избранное и получать напоминания." }), /* @__PURE__ */ jsxs("div", {
					className: "mmenu-auth__actions",
					children: [/* @__PURE__ */ jsx(LinkButton, {
						href: "/login",
						icon: "user",
						children: "Войти"
					}), /* @__PURE__ */ jsx(LinkButton, {
						href: "/register",
						variant: "outline",
						children: "Регистрация"
					})]
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "mmenu__section",
				"aria-labelledby": "mmenu-catalog",
				children: [/* @__PURE__ */ jsxs("h3", {
					id: "mmenu-catalog",
					className: "mmenu__title",
					children: ["Каталог ", city.nameIn]
				}), /* @__PURE__ */ jsx("ul", {
					className: "mmenu-tiles",
					children: catalog.map((item) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
						href: item.href,
						className: cx("mmenu-tile", isActive(item.href) && "is-active"),
						"aria-current": isActive(item.href) ? "page" : void 0,
						children: [/* @__PURE__ */ jsx(Icon, {
							name: item.icon,
							size: 22
						}), /* @__PURE__ */ jsx("span", { children: item.label })]
					}) }, item.href))
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "mmenu__section",
				"aria-labelledby": "mmenu-mine",
				children: [/* @__PURE__ */ jsx("h3", {
					id: "mmenu-mine",
					className: "mmenu__title",
					children: "Моё"
				}), /* @__PURE__ */ jsx("ul", {
					className: "mmenu-list",
					children: mine.map((item) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
						href: item.href,
						className: cx("mmenu-row", isActive(item.href) && "is-active"),
						children: [
							/* @__PURE__ */ jsx(Icon, {
								name: item.icon,
								size: 20
							}),
							/* @__PURE__ */ jsx("span", { children: item.label }),
							/* @__PURE__ */ jsx(Count, { n: item.badge })
						]
					}) }, item.href))
				})]
			}),
			/* @__PURE__ */ jsx(InstallAppButton, { variant: "menu" }),
			/* @__PURE__ */ jsxs("section", {
				className: "mmenu__section",
				"aria-labelledby": "mmenu-service",
				children: [/* @__PURE__ */ jsx("h3", {
					id: "mmenu-service",
					className: "mmenu__title",
					children: "Сервис"
				}), /* @__PURE__ */ jsxs("ul", {
					className: "mmenu-list",
					children: [[
						{
							href: "/for-clinics",
							label: "Для клиник",
							icon: "award"
						},
						{
							href: "/about",
							label: "О сервисе",
							icon: "info"
						},
						{
							href: "/review-rules",
							label: "Правила отзывов",
							icon: "shield"
						}
					].map((item) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
						href: item.href,
						className: cx("mmenu-row", isActive(item.href) && "is-active"),
						children: [/* @__PURE__ */ jsx(Icon, {
							name: item.icon,
							size: 20
						}), /* @__PURE__ */ jsx("span", { children: item.label })]
					}) }, item.href)), user ? /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
						href: "/logout",
						method: "post",
						as: "button",
						className: "mmenu-row mmenu-row--muted",
						children: [/* @__PURE__ */ jsx(Icon, {
							name: "logout",
							size: 20
						}), /* @__PURE__ */ jsx("span", { children: "Выйти" })]
					}) }) : null]
				})]
			})
		]
	});
}
//#endregion
//#region resources/js/layouts/PublicLayout.tsx
function useActive$1() {
	const { url } = usePage();
	return (href) => {
		const path = url.split("?")[0];
		return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
	};
}
function Badge({ n }) {
	return n > 0 ? /* @__PURE__ */ jsx("span", {
		className: "count-badge",
		"aria-label": `${n}`,
		children: n > 9 ? "9+" : n
	}) : null;
}
function UserMenu() {
	const { auth } = usePage().props;
	const user = auth?.user;
	const [open, setOpen] = useState(false);
	const ref = useRef(null);
	useDismiss(open, () => setOpen(false), ref);
	if (!user) return /* @__PURE__ */ jsx(LinkButton, {
		href: "/login",
		variant: "dark",
		size: "sm",
		icon: "user",
		className: "hide-mobile",
		children: "Войти"
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "menu",
		ref,
		children: [/* @__PURE__ */ jsxs("button", {
			type: "button",
			className: "icon-link",
			onClick: () => setOpen((o) => !o),
			"aria-expanded": open,
			"aria-haspopup": "menu",
			"aria-label": "Меню профиля",
			children: [/* @__PURE__ */ jsx(Icon, {
				name: "user",
				size: 22
			}), /* @__PURE__ */ jsx(Badge, { n: user.unread })]
		}), open ? /* @__PURE__ */ jsxs("div", {
			className: "menu__panel",
			role: "menu",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "menu__who",
					children: [/* @__PURE__ */ jsx("b", { children: user.name }), /* @__PURE__ */ jsx("span", {
						className: "text-xs text-muted",
						children: user.email
					})]
				}),
				/* @__PURE__ */ jsxs(Link, {
					role: "menuitem",
					href: accountHome(user),
					onClick: () => setOpen(false),
					children: [
						/* @__PURE__ */ jsx(Icon, {
							name: "home",
							size: 18
						}),
						" ",
						accountLabel(user)
					]
				}),
				accountHome(user) !== "/account" ? /* @__PURE__ */ jsxs(Link, {
					role: "menuitem",
					href: "/account",
					onClick: () => setOpen(false),
					children: [/* @__PURE__ */ jsx(Icon, {
						name: "user",
						size: 18
					}), " Мой профиль"]
				}) : null,
				/* @__PURE__ */ jsxs(Link, {
					role: "menuitem",
					href: "/account/leads",
					onClick: () => setOpen(false),
					children: [/* @__PURE__ */ jsx(Icon, {
						name: "calendar",
						size: 18
					}), " Мои записи"]
				}),
				/* @__PURE__ */ jsxs(Link, {
					role: "menuitem",
					href: "/account/notifications",
					onClick: () => setOpen(false),
					children: [
						/* @__PURE__ */ jsx(Icon, {
							name: "bell",
							size: 18
						}),
						" Уведомления",
						/* @__PURE__ */ jsx(Badge, { n: user.unread })
					]
				}),
				/* @__PURE__ */ jsxs(Link, {
					role: "menuitem",
					href: "/logout",
					method: "post",
					as: "button",
					onClick: () => setOpen(false),
					children: [/* @__PURE__ */ jsx(Icon, {
						name: "logout",
						size: 18
					}), " Выйти"]
				})
			]
		}) : null]
	});
}
function CookieBanner() {
	const [show, setShow] = useState(false);
	useEffect(() => {
		try {
			if (!localStorage.getItem("stk.cookie")) setShow(true);
		} catch {}
	}, []);
	if (!show) return null;
	return /* @__PURE__ */ jsxs("div", {
		className: "cookie",
		role: "region",
		"aria-label": "Уведомление о cookie",
		children: [
			/* @__PURE__ */ jsx(Icon, {
				name: "cookie",
				size: 24
			}),
			/* @__PURE__ */ jsxs("p", { children: [
				"Мы используем только необходимые cookie: город, сессия и избранное. Подробнее — в",
				" ",
				/* @__PURE__ */ jsx(Link, {
					href: "/privacy",
					className: "link",
					children: "политике конфиденциальности"
				}),
				"."
			] }),
			/* @__PURE__ */ jsx(Button, {
				size: "sm",
				onClick: () => {
					try {
						localStorage.setItem("stk.cookie", "1");
					} catch {}
					setShow(false);
				},
				children: "Понятно"
			})
		]
	});
}
function Footer() {
	const city = useCity();
	return /* @__PURE__ */ jsxs("footer", {
		className: "footer",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "container footer__grid",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "footer__brand",
					children: [/* @__PURE__ */ jsx(Logo, { animated: false }), /* @__PURE__ */ jsx("p", {
						className: "text-sm text-muted",
						children: "Сервис поиска стоматологических клиник и врачей по всей России. Сравнивайте цены, читайте проверенные отзывы и записывайтесь онлайн."
					})]
				}),
				/* @__PURE__ */ jsxs("nav", {
					"aria-label": "Каталог",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "footer__title",
						children: "Каталог"
					}), /* @__PURE__ */ jsxs("ul", { children: [
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: city.path("clinics"),
							children: "Клиники"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: city.path("doctors"),
							children: "Врачи"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: city.path("directions"),
							children: "Направления"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: city.path("prices"),
							children: "Цены на услуги"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: city.path("reviews"),
							children: "Отзывы"
						}) })
					] })]
				}),
				/* @__PURE__ */ jsxs("nav", {
					"aria-label": "Пользователям",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "footer__title",
						children: "Пользователям"
					}), /* @__PURE__ */ jsxs("ul", { children: [
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: "/favorites",
							children: "Избранное"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: "/compare",
							children: "Сравнение"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: "/review-rules",
							children: "Правила отзывов"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: "/about",
							children: "О сервисе"
						}) })
					] })]
				}),
				/* @__PURE__ */ jsxs("nav", {
					"aria-label": "Клиникам и документы",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "footer__title",
						children: "Клиникам"
					}), /* @__PURE__ */ jsxs("ul", { children: [
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: "/for-clinics",
							children: "Подключить клинику"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: "/login",
							children: "Кабинет клиники"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: "/privacy",
							children: "Политика конфиденциальности"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: "/consent",
							children: "Согласие на обработку данных"
						}) }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: "/terms",
							children: "Пользовательское соглашение"
						}) })
					] })]
				})
			]
		}), /* @__PURE__ */ jsxs("div", {
			className: "container footer__legal",
			children: [/* @__PURE__ */ jsx("p", { children: "Информация на сайте носит справочный характер и не является медицинской консультацией или публичной офертой. Цены указаны «от», окончательную стоимость лечения называет врач после осмотра. Имеются противопоказания, необходима консультация специалиста." }), /* @__PURE__ */ jsxs("p", { children: [
				"Не отправляйте через сайт диагнозы, результаты анализов и медицинские документы. © ",
				(/* @__PURE__ */ new Date()).getFullYear(),
				" МирКлиник."
			] })]
		})]
	});
}
function PublicLayout({ children, bare }) {
	const city = useCity();
	const { auth } = usePage().props;
	const active = useActive$1();
	const { count } = useCollections();
	const [menu, setMenu] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const { url } = usePage();
	useClientSeo();
	useGuestSync();
	useEffect(() => {
		setMenu(false);
		setSearchOpen(false);
	}, [url]);
	const nav = [
		{
			href: city.path("clinics"),
			label: "Клиники"
		},
		{
			href: city.path("doctors"),
			label: "Врачи"
		},
		{
			href: city.path("directions"),
			label: "Направления"
		},
		{
			href: city.path("prices"),
			label: "Цены"
		},
		{
			href: city.path("reviews"),
			label: "Отзывы"
		}
	];
	const favCount = count("favorite");
	const cmpCount = count("compare");
	const tabs = [
		{
			href: "/",
			label: "Главная",
			icon: "home"
		},
		{
			href: "#search",
			label: "Поиск",
			icon: "search",
			action: () => setSearchOpen(true)
		},
		{
			href: city.path("clinics"),
			label: "Клиники",
			icon: "building"
		},
		{
			href: "/favorites",
			label: "Избранное",
			icon: "heart",
			badge: favCount
		},
		{
			href: "/account",
			label: "Профиль",
			icon: "user"
		}
	];
	return /* @__PURE__ */ jsxs(LeadProvider, { children: [
		/* @__PURE__ */ jsx("a", {
			href: "#main",
			className: "skip-link",
			children: "Перейти к содержимому"
		}),
		/* @__PURE__ */ jsxs("header", {
			className: "header",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "container header__row",
				children: [
					/* @__PURE__ */ jsx(Logo, {}),
					/* @__PURE__ */ jsx(CityPicker, {}),
					/* @__PURE__ */ jsx("div", {
						className: "header__search hide-mobile",
						children: /* @__PURE__ */ jsx(SearchBox, {})
					}),
					/* @__PURE__ */ jsxs("nav", {
						className: "header__actions",
						"aria-label": "Быстрые действия",
						children: [
							/* @__PURE__ */ jsxs(Link, {
								href: "/favorites",
								className: "icon-link hide-mobile",
								"aria-label": `Избранное${favCount ? `, ${favCount}` : ""}`,
								children: [/* @__PURE__ */ jsx(Icon, {
									name: "heart",
									size: 22
								}), /* @__PURE__ */ jsx(Badge, { n: favCount })]
							}),
							/* @__PURE__ */ jsxs(Link, {
								href: "/compare",
								className: "icon-link hide-mobile",
								"aria-label": `Сравнение${cmpCount ? `, ${cmpCount}` : ""}`,
								children: [/* @__PURE__ */ jsx(Icon, {
									name: "scale",
									size: 22
								}), /* @__PURE__ */ jsx(Badge, { n: cmpCount })]
							}),
							/* @__PURE__ */ jsx(InstallAppButton, { className: "icon-link hide-mobile" }),
							/* @__PURE__ */ jsx("div", {
								className: "hide-mobile",
								children: /* @__PURE__ */ jsx(UserMenu, {})
							}),
							/* @__PURE__ */ jsxs("button", {
								type: "button",
								className: "icon-link header__burger show-mobile",
								onClick: () => setMenu(true),
								"aria-label": "Открыть меню",
								"aria-expanded": menu,
								children: [/* @__PURE__ */ jsx(Icon, {
									name: "menu",
									size: 24
								}), /* @__PURE__ */ jsx(Badge, { n: auth?.user?.unread ?? 0 })]
							})
						]
					})
				]
			}), /* @__PURE__ */ jsx("div", {
				className: "header__nav hide-mobile",
				children: /* @__PURE__ */ jsx("nav", {
					className: "container",
					"aria-label": "Основная навигация",
					children: /* @__PURE__ */ jsxs("ul", { children: [
						nav.map((n) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: n.href,
							className: cx(active(n.href) && "is-active"),
							"aria-current": active(n.href) ? "page" : void 0,
							children: n.label
						}) }, n.href)),
						/* @__PURE__ */ jsx("li", { className: "grow" }),
						/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
							href: "/for-clinics",
							className: "header__b2b",
							children: "Для клиник"
						}) })
					] })
				})
			})]
		}),
		/* @__PURE__ */ jsx("main", {
			id: "main",
			tabIndex: -1,
			className: cx("main", bare && "main--bare"),
			children
		}),
		/* @__PURE__ */ jsx(Footer, {}),
		/* @__PURE__ */ jsx("nav", {
			className: "tabbar",
			"aria-label": "Мобильная навигация",
			children: tabs.map((t) => t.action ? /* @__PURE__ */ jsxs("button", {
				type: "button",
				onClick: t.action,
				className: "tabbar__item",
				children: [/* @__PURE__ */ jsx(Icon, {
					name: t.icon,
					size: 24
				}), /* @__PURE__ */ jsx("span", { children: t.label })]
			}, t.label) : /* @__PURE__ */ jsxs(Link, {
				href: t.href,
				className: cx("tabbar__item", active(t.href) && "is-active"),
				"aria-current": active(t.href) ? "page" : void 0,
				children: [/* @__PURE__ */ jsxs("span", {
					className: "tabbar__icon",
					children: [/* @__PURE__ */ jsx(Icon, {
						name: t.icon,
						size: 24
					}), /* @__PURE__ */ jsx(Badge, { n: t.badge ?? 0 })]
				}), /* @__PURE__ */ jsx("span", { children: t.label })]
			}, t.label))
		}),
		/* @__PURE__ */ jsx(Drawer, {
			open: menu,
			onClose: () => setMenu(false),
			title: "Меню",
			children: /* @__PURE__ */ jsx(MobileMenu, {
				isActive: active,
				favorites: favCount,
				compare: cmpCount
			})
		}),
		/* @__PURE__ */ jsxs(Drawer, {
			open: searchOpen,
			onClose: () => setSearchOpen(false),
			title: "Поиск",
			side: "right",
			children: [/* @__PURE__ */ jsx(SearchBox, {
				variant: "hero",
				autoFocus: true,
				onDone: () => setSearchOpen(false)
			}), /* @__PURE__ */ jsx("p", {
				className: "text-sm text-muted",
				style: { marginTop: 16 },
				children: "Например: «болит зуб», «имплантация», «детский стоматолог», название клиники или фамилия врача."
			})]
		}),
		/* @__PURE__ */ jsx(CookieBanner, {}),
		/* @__PURE__ */ jsx(CityPrompt, {}),
		/* @__PURE__ */ jsx(AssistantWidget, {}),
		/* @__PURE__ */ jsx(ToastHost, {})
	] });
}
//#endregion
//#region resources/js/layouts/AccountLayout.tsx
var ITEMS$1 = [
	{
		href: "/account",
		label: "Обзор",
		icon: "home",
		exact: true
	},
	{
		href: "/account/appointments",
		label: "Мои записи",
		shortLabel: "Записи",
		icon: "calendar"
	},
	{
		href: "/account/leads",
		label: "Заявки на звонок",
		shortLabel: "Заявки",
		icon: "phone"
	},
	{
		href: "/account/favorites",
		label: "Избранное",
		icon: "heart"
	},
	{
		href: "/account/compare",
		label: "Сравнение",
		icon: "scale"
	},
	{
		href: "/account/history",
		label: "История просмотров",
		shortLabel: "История",
		icon: "clock"
	},
	{
		href: "/account/reviews",
		label: "Мои отзывы",
		shortLabel: "Отзывы",
		icon: "thumb"
	},
	{
		href: "/account/notifications",
		label: "Уведомления",
		shortLabel: "Уведомл.",
		icon: "bell"
	},
	{
		href: "/account/profile",
		label: "Профиль",
		icon: "settings"
	}
];
function AccountLayout({ children }) {
	const { url } = usePage();
	const { auth } = usePage().props;
	const path = url.split("?")[0];
	return /* @__PURE__ */ jsx(PublicLayout, { children: /* @__PURE__ */ jsxs("div", {
		className: "container account",
		children: [/* @__PURE__ */ jsxs("aside", {
			className: "account__side",
			children: [/* @__PURE__ */ jsxs("p", {
				className: "account__hello",
				children: [
					"Здравствуйте,",
					/* @__PURE__ */ jsx("br", {}),
					/* @__PURE__ */ jsx("b", { children: auth.user?.name })
				]
			}), /* @__PURE__ */ jsx("nav", {
				"aria-label": "Личный кабинет",
				className: "account__nav",
				children: ITEMS$1.map((i) => {
					const active = i.exact ? path === i.href : path === i.href || path.startsWith(i.href + "/");
					return /* @__PURE__ */ jsxs(Link, {
						href: i.href,
						className: cx("account__link", active && "is-active"),
						"aria-current": active ? "page" : void 0,
						children: [
							/* @__PURE__ */ jsx(Icon, {
								name: i.icon,
								size: 20
							}),
							/* @__PURE__ */ jsx("span", {
								className: "account__link-label",
								children: i.shortLabel ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("span", {
									className: "account__link-label-full",
									children: i.label
								}), /* @__PURE__ */ jsx("span", {
									className: "account__link-label-short",
									children: i.shortLabel
								})] }) : i.label
							}),
							i.href === "/account/notifications" && auth.user?.unread ? /* @__PURE__ */ jsx("span", {
								className: "count-badge count-badge--inline",
								children: auth.user.unread
							}) : null
						]
					}, i.href);
				})
			})]
		}), /* @__PURE__ */ jsx("div", {
			className: "account__main",
			children
		})]
	}) });
}
//#endregion
//#region resources/js/components/ParserTaskProgress.tsx
var formatEta = (sec) => {
	const minutes = Math.max(1, Math.round(sec / 60));
	if (minutes < 60) return `≈ ${minutes} мин`;
	const hours = Math.floor(minutes / 60);
	const rest = minutes % 60;
	return `≈ ${hours} ч${rest > 0 ? ` ${rest} мин` : ""}`;
};
/** Прогресс сбора: шкала этапов, «собрано N из M», оставшееся время и предупреждение о проверке Яндекса. */
function ParserTaskProgress({ task, compact = false }) {
	const indeterminate = task.progress === null || task.status === "queued";
	return /* @__PURE__ */ jsxs("div", {
		className: "parser-task-progress",
		children: [
			!compact && task.stages.length > 0 ? /* @__PURE__ */ jsx("ol", {
				className: "parser-stages",
				"aria-label": "Этапы сбора",
				children: task.stages.map((s) => /* @__PURE__ */ jsx("li", {
					className: `parser-stages__item is-${s.state}`,
					children: s.label
				}, s.id))
			}) : null,
			/* @__PURE__ */ jsx("div", {
				className: `parser-progress${indeterminate ? " is-indeterminate" : ""}`,
				role: "progressbar",
				"aria-valuenow": task.progress ?? void 0,
				"aria-valuemin": 0,
				"aria-valuemax": 100,
				children: /* @__PURE__ */ jsx("span", { style: indeterminate ? void 0 : { width: `${Math.max(task.progress ?? 0, 4)}%` } })
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "parser-task-progress__facts text-xs",
				children: [
					task.target ? /* @__PURE__ */ jsxs("b", { children: [
						"Собрано ",
						task.collected,
						" из ",
						task.target
					] }) : null,
					task.progress !== null && task.status !== "queued" ? /* @__PURE__ */ jsxs("span", { children: [task.progress, "%"] }) : null,
					task.eta_sec ? /* @__PURE__ */ jsxs("span", { children: ["осталось ", formatEta(task.eta_sec)] }) : null
				]
			}),
			task.attention ? /* @__PURE__ */ jsx("p", {
				className: "parser-attention text-xs",
				children: task.attention
			}) : null,
			/* @__PURE__ */ jsx("p", {
				className: "text-xs",
				children: task.stage
			}),
			task.last_organization ? /* @__PURE__ */ jsxs("p", {
				className: "text-xs text-muted",
				children: ["Последняя: ", task.last_organization]
			}) : null,
			!compact && task.status_page ? /* @__PURE__ */ jsx("a", {
				href: task.status_page,
				target: "_blank",
				rel: "noreferrer",
				className: "link text-xs",
				children: "Подробный статус в парсере"
			}) : null
		]
	});
}
//#endregion
//#region resources/js/components/ParserActivity.tsx
var SINCE_KEY = "parser-activity-since";
var SEEN_KEY = "parser-activity-seen";
var ACTIVE_INTERVAL = 4e3;
var IDLE_INTERVAL = 2e4;
var readSeen = () => {
	try {
		return JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]");
	} catch {
		return [];
	}
};
/**
* Индикатор фоновых задач парсера. Живёт в layout админки, поэтому виден на любой странице,
* а задачи продолжают выполняться на сервере независимо от того, где находится администратор.
*/
function ParserActivity() {
	const [active, setActive] = useState([]);
	const [collapsed, setCollapsed] = useState(false);
	const [offline, setOffline] = useState(false);
	const timer = useRef(void 0);
	const activeCount = useRef(0);
	const load = useCallback(async () => {
		window.clearTimeout(timer.current);
		try {
			const since = sessionStorage.getItem(SINCE_KEY) ?? "";
			const response = await fetch(`/admin/parser/activity?since=${encodeURIComponent(since)}`, {
				headers: {
					Accept: "application/json",
					"X-Requested-With": "XMLHttpRequest"
				},
				credentials: "same-origin"
			});
			if (!response.ok) throw new Error(String(response.status));
			const data = await response.json();
			const seen = readSeen();
			const fresh = data.finished.filter((t) => !seen.includes(t.id));
			fresh.forEach((t) => notify(`${t.title}. ${t.stage}`, t.status === "completed" ? "info" : "error"));
			if (fresh.length > 0) {
				sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seen, ...fresh.map((t) => t.id)].slice(-50)));
				if (window.location.pathname.startsWith("/admin/parser")) router.reload();
			}
			sessionStorage.setItem(SINCE_KEY, data.now);
			setActive(data.active);
			activeCount.current = data.active.length;
			setOffline(false);
		} catch {
			setOffline(activeCount.current > 0);
		} finally {
			timer.current = window.setTimeout(load, activeCount.current > 0 ? ACTIVE_INTERVAL : IDLE_INTERVAL);
		}
	}, []);
	useEffect(() => {
		load();
		const off = router.on("success", () => void load());
		return () => {
			off();
			window.clearTimeout(timer.current);
		};
	}, [load]);
	if (active.length === 0) return null;
	return /* @__PURE__ */ jsxs("aside", {
		className: `parser-activity card${collapsed ? " is-collapsed" : ""}`,
		"aria-live": "polite",
		"aria-label": "Фоновые процессы парсера",
		children: [/* @__PURE__ */ jsxs("button", {
			type: "button",
			className: "parser-activity__head",
			onClick: () => setCollapsed((v) => !v),
			"aria-expanded": !collapsed,
			children: [
				/* @__PURE__ */ jsx("span", {
					className: "parser-activity__spinner",
					"aria-hidden": "true"
				}),
				/* @__PURE__ */ jsx("span", {
					className: "parser-activity__title",
					children: active.some((t) => t.attention) ? "Сбор на паузе: проверка Яндекса" : active.length === 1 ? `Идёт процесс парсера${active[0].target ? ` · ${active[0].collected}/${active[0].target}` : ""}` : `Процессов парсера: ${active.length}`
				}),
				/* @__PURE__ */ jsx(Icon, {
					name: collapsed ? "chevron-up" : "chevron-down",
					size: 18
				})
			]
		}), !collapsed ? /* @__PURE__ */ jsxs("div", {
			className: "parser-activity__body",
			children: [
				active.map((t) => /* @__PURE__ */ jsxs("div", {
					className: "parser-activity__item",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "parser-activity__row",
							children: [/* @__PURE__ */ jsx("b", { children: t.title }), /* @__PURE__ */ jsx("span", {
								className: "text-xs text-muted",
								children: t.status_label
							})]
						}),
						/* @__PURE__ */ jsx(ParserTaskProgress, {
							task: t,
							compact: true
						}),
						/* @__PURE__ */ jsxs("p", {
							className: "text-xs text-muted",
							children: [
								"Запущено ",
								t.started,
								t.checked ? ` · статус обновлён ${t.checked}` : ""
							]
						})
					]
				}, t.id)),
				offline ? /* @__PURE__ */ jsx("p", {
					className: "text-xs parser-warn",
					children: "Нет связи с сервером — повторяем запрос…"
				}) : null,
				/* @__PURE__ */ jsx("p", {
					className: "text-xs text-muted",
					children: "Можно работать на других страницах — по завершении появится уведомление."
				}),
				/* @__PURE__ */ jsx(Link, {
					href: "/admin/parser?tab=tasks",
					className: "link text-sm",
					children: "Открыть задачи"
				})
			]
		}) : null]
	});
}
//#endregion
//#region resources/js/layouts/DashboardShell.tsx
function isActive(url, item) {
	const path = url.split("?")[0];
	return item.exact ? path === item.href : path === item.href || path.startsWith(item.href + "/");
}
function SideNav({ items, onNavigate }) {
	const { url } = usePage();
	const groups = {};
	items.forEach((i) => (groups[i.group ?? ""] ||= []).push(i));
	return /* @__PURE__ */ jsx("nav", {
		className: "sidenav",
		"aria-label": "Разделы кабинета",
		children: Object.entries(groups).map(([group, list]) => /* @__PURE__ */ jsxs("div", {
			className: "sidenav__group",
			children: [group ? /* @__PURE__ */ jsx("div", {
				className: "sidenav__title",
				children: group
			}) : null, /* @__PURE__ */ jsx("ul", { children: list.map((i) => {
				const active = isActive(url, i);
				return /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
					href: i.href,
					className: cx("sidenav__link", active && "is-active"),
					"aria-current": active ? "page" : void 0,
					onClick: onNavigate,
					children: [
						/* @__PURE__ */ jsx(Icon, {
							name: i.icon,
							size: 20
						}),
						/* @__PURE__ */ jsx("span", { children: i.label }),
						i.badge ? /* @__PURE__ */ jsx("span", {
							className: "count-badge count-badge--inline",
							children: i.badge
						}) : null
					]
				}) }, i.href);
			}) })]
		}, group))
	});
}
function DashboardShell({ children, items, brandSuffix, mobileBrandSuffix, aside, mobileLabel }) {
	const { auth, demo } = usePage().props;
	const user = auth?.user;
	const offerDemo = demo?.mode === "offer";
	const { url } = usePage();
	const [open, setOpen] = useState(false);
	useClientSeo();
	useEffect(() => setOpen(false), [url]);
	useEffect(() => {
		const html = document.documentElement;
		const { body } = document;
		const prevHtmlOverflow = html.style.overflow;
		const prevBodyOverflow = body.style.overflow;
		html.style.overflow = "hidden";
		body.style.overflow = "hidden";
		return () => {
			html.style.overflow = prevHtmlOverflow;
			body.style.overflow = prevBodyOverflow;
		};
	}, []);
	const current = items.find((i) => isActive(url, i));
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsx("a", {
			href: "#main",
			className: "skip-link",
			children: "Перейти к содержимому"
		}),
		/* @__PURE__ */ jsxs("div", {
			className: "shell",
			children: [
				/* @__PURE__ */ jsx("header", {
					className: "shell__top",
					children: /* @__PURE__ */ jsxs("div", {
						className: "shell__top-row",
						children: [
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "icon-link show-tablet",
								onClick: () => setOpen(true),
								"aria-label": `Открыть меню: ${mobileLabel}`,
								children: /* @__PURE__ */ jsx(Icon, {
									name: "menu",
									size: 24
								})
							}),
							/* @__PURE__ */ jsx(Logo, {
								suffix: brandSuffix,
								mobileSuffix: mobileBrandSuffix ?? brandSuffix
							}),
							/* @__PURE__ */ jsx("span", { className: "grow" }),
							/* @__PURE__ */ jsx(Link, {
								href: "/",
								className: "btn btn--outline btn--sm hide-mobile",
								children: "На сайт"
							}),
							user ? /* @__PURE__ */ jsx("div", {
								className: "shell__user hide-mobile",
								children: /* @__PURE__ */ jsxs("span", {
									className: "text-sm",
									children: [
										/* @__PURE__ */ jsx("b", { children: user.name }),
										/* @__PURE__ */ jsx("br", {}),
										/* @__PURE__ */ jsx("span", {
											className: "text-muted text-xs",
											children: accountLabel(user)
										})
									]
								})
							}) : null,
							offerDemo ? /* @__PURE__ */ jsxs(Fragment, { children: [demo?.connect_url ? /* @__PURE__ */ jsx("a", {
								href: demo.connect_url,
								className: "btn btn--primary btn--sm",
								children: "Подключиться"
							}) : null, /* @__PURE__ */ jsxs(Link, {
								href: demo?.exit_url ?? "/",
								method: "post",
								as: "button",
								className: "btn btn--ghost btn--sm",
								type: "button",
								children: [
									/* @__PURE__ */ jsx(Icon, {
										name: "logout",
										size: 18
									}),
									" ",
									/* @__PURE__ */ jsx("span", {
										className: "hide-mobile",
										children: "Выйти из демо"
									})
								]
							})] }) : /* @__PURE__ */ jsxs(Link, {
								href: "/logout",
								method: "post",
								as: "button",
								className: "btn btn--ghost btn--sm",
								type: "button",
								children: [
									/* @__PURE__ */ jsx(Icon, {
										name: "logout",
										size: 18
									}),
									" ",
									/* @__PURE__ */ jsx("span", {
										className: "hide-mobile",
										children: "Выйти"
									})
								]
							})
						]
					})
				}),
				offerDemo ? /* @__PURE__ */ jsxs("div", {
					className: "demo-banner demo-banner--offer",
					role: "status",
					children: [
						/* @__PURE__ */ jsx(Icon, {
							name: "info",
							size: 18
						}),
						/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("b", { children: "Демо-режим." }), " Так будет выглядеть кабинет вашей клиники. Данные заявок и записей — примерные, изменения не сохраняются."] }),
						demo?.connect_url ? /* @__PURE__ */ jsx("a", {
							href: demo.connect_url,
							className: "btn btn--primary btn--sm demo-banner__action",
							children: "Подключиться"
						}) : null
					]
				}) : demo ? /* @__PURE__ */ jsxs("div", {
					className: "demo-banner",
					role: "status",
					children: [/* @__PURE__ */ jsx(Icon, {
						name: "info",
						size: 18
					}), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("b", { children: demo.label }), " — демонстрационный режим для согласования функционала и дизайна. Изменения могут сохраняться в системе."] })]
				}) : null,
				/* @__PURE__ */ jsxs("div", {
					className: "shell__body container container--wide",
					children: [/* @__PURE__ */ jsxs("aside", {
						className: "shell__side hide-tablet",
						children: [aside, /* @__PURE__ */ jsx(SideNav, { items })]
					}), /* @__PURE__ */ jsxs("main", {
						id: "main",
						tabIndex: -1,
						className: cx("shell__main", offerDemo && "shell__main--demo"),
						children: [/* @__PURE__ */ jsx("div", {
							className: "show-tablet shell__crumb",
							children: /* @__PURE__ */ jsxs("button", {
								type: "button",
								className: "chip",
								onClick: () => setOpen(true),
								children: [
									/* @__PURE__ */ jsx(Icon, {
										name: "menu",
										size: 16
									}),
									" ",
									current?.label ?? mobileLabel
								]
							})
						}), children]
					})]
				})
			]
		}),
		/* @__PURE__ */ jsxs(Drawer, {
			open,
			onClose: () => setOpen(false),
			title: mobileLabel,
			side: "left",
			children: [aside, /* @__PURE__ */ jsx(SideNav, {
				items,
				onNavigate: () => setOpen(false)
			})]
		}),
		/* @__PURE__ */ jsx(ToastHost, {})
	] });
}
//#endregion
//#region resources/js/layouts/AdminLayout.tsx
var ALL = [
	{
		href: "/admin",
		label: "Обзор",
		icon: "home",
		exact: true,
		group: "Работа",
		perm: "admin.dashboard"
	},
	{
		href: "/admin/appointments",
		label: "Записи",
		icon: "calendar",
		group: "Работа",
		perm: "admin.appointments"
	},
	{
		href: "/admin/reports",
		label: "Отчёты",
		icon: "file",
		group: "Работа",
		perm: "admin.reports"
	},
	{
		href: "/admin/analytics",
		label: "Аналитика",
		icon: "chart",
		group: "Работа",
		perm: "admin.analytics"
	},
	{
		href: "/admin/geography",
		label: "География",
		icon: "pin",
		group: "Справочники",
		perm: "admin.dictionaries"
	},
	{
		href: "/admin/dictionaries/regions",
		label: "Регионы",
		icon: "globe",
		group: "Справочники",
		perm: "admin.dictionaries"
	},
	{
		href: "/admin/moderation",
		label: "Модерация",
		icon: "shield",
		group: "Работа",
		perm: "admin.moderation"
	},
	{
		href: "/admin/promotions",
		label: "Продвижение",
		icon: "sparkle",
		group: "Работа",
		perm: "admin.promotions"
	},
	{
		href: "/admin/site-display",
		label: "Сайт: карта и реклама",
		icon: "globe",
		group: "Контент и SEO",
		perm: "admin.site_display"
	},
	{
		href: "/admin/tariffs",
		label: "Тарифы",
		icon: "ruble",
		group: "Работа",
		perm: "admin.tariffs"
	},
	{
		href: "/admin/finance",
		label: "Финансы",
		icon: "chart",
		group: "Работа",
		perm: "admin.finance"
	},
	{
		href: "/admin/card-bonuses",
		label: "Бонусы карточек",
		icon: "sparkle",
		group: "Работа",
		perm: "admin.promotions"
	},
	{
		href: "/admin/clinic-card-appearance",
		label: "Премиум-карточки",
		icon: "crown",
		group: "Работа",
		perm: "admin.promotions"
	},
	{
		href: "/admin/parser",
		label: "Парсер",
		icon: "search",
		group: "Работа",
		perm: "admin.parser"
	},
	{
		href: "/admin/offers",
		label: "КП и демо",
		icon: "send",
		group: "Работа",
		perm: "offers.manage"
	},
	{
		href: "/admin/campaigns",
		label: "Кампании КП",
		icon: "mail",
		group: "Работа",
		perm: "offers.manage"
	},
	{
		href: "/admin/broadcasts",
		label: "Рассылки",
		icon: "send",
		group: "Работа",
		perm: "admin.broadcasts"
	},
	{
		href: "/admin/assistant",
		label: "AI-ассистент",
		icon: "send",
		group: "Система",
		perm: "admin.assistant"
	},
	{
		href: "/admin/system",
		label: "Состояние системы",
		icon: "shield",
		group: "Система",
		perm: "admin.integrations"
	},
	{
		href: "/admin/integrations",
		label: "Интеграции",
		icon: "settings",
		group: "Система",
		perm: "admin.integrations"
	},
	{
		href: "/admin/complaints",
		label: "Жалобы",
		icon: "alert",
		group: "Работа",
		perm: "admin.complaints"
	},
	{
		href: "/admin/duplicates",
		label: "Дубликаты",
		icon: "refresh",
		group: "Работа",
		perm: "admin.duplicates"
	},
	{
		href: "/admin/clinics",
		label: "Клиники",
		icon: "building",
		group: "Каталог",
		perm: "admin.clinics"
	},
	{
		href: "/admin/doctors",
		label: "Врачи",
		icon: "user",
		group: "Каталог",
		perm: "admin.doctors"
	},
	{
		href: "/admin/reviews",
		label: "Отзывы",
		icon: "thumb",
		group: "Каталог",
		perm: "admin.reviews"
	},
	{
		href: "/admin/dictionaries/cities",
		label: "Города",
		icon: "pin",
		group: "Справочники",
		perm: "admin.dictionaries"
	},
	{
		href: "/admin/dictionaries/districts",
		label: "Районы",
		icon: "grid",
		group: "Справочники",
		perm: "admin.dictionaries"
	},
	{
		href: "/admin/dictionaries/specialties",
		label: "Направления",
		icon: "sparkle",
		group: "Справочники",
		perm: "admin.dictionaries"
	},
	{
		href: "/admin/dictionaries/services",
		label: "Услуги",
		icon: "tooth",
		group: "Справочники",
		perm: "admin.dictionaries"
	},
	{
		href: "/admin/dictionaries/concerns",
		label: "Что беспокоит",
		icon: "pain",
		group: "Справочники",
		perm: "admin.dictionaries"
	},
	{
		href: "/admin/dictionaries/clinic_property_types",
		label: "Свойства клиник",
		icon: "sparkle",
		group: "Справочники",
		perm: "admin.dictionaries"
	},
	{
		href: "/admin/dictionaries/pages",
		label: "CMS-страницы",
		icon: "file",
		group: "Контент и SEO",
		perm: "admin.cms"
	},
	{
		href: "/admin/dictionaries/seo",
		label: "SEO-шаблоны",
		icon: "globe",
		group: "Контент и SEO",
		perm: "admin.seo"
	},
	{
		href: "/admin/users",
		label: "Пользователи",
		icon: "users",
		group: "Система",
		perm: "admin.users"
	},
	{
		href: "/admin/roles",
		label: "Роли и права",
		icon: "lock",
		group: "Система",
		perm: "admin.roles"
	},
	{
		href: "/admin/audit",
		label: "Журнал аудита",
		icon: "list",
		group: "Система",
		perm: "admin.audit"
	}
];
function AdminLayout({ children }) {
	const { auth } = usePage().props;
	const items = useMemo(() => ALL.filter((i) => can(auth?.user, i.perm)), [auth?.user]);
	return /* @__PURE__ */ jsxs(DashboardShell, {
		items,
		brandSuffix: "админ-панель",
		mobileBrandSuffix: "Админ",
		mobileLabel: "Админ-панель",
		children: [children, can(auth?.user, "admin.parser") ? /* @__PURE__ */ jsx(ParserActivity, {}) : null]
	});
}
//#endregion
//#region resources/js/layouts/AuthLayout.tsx
function AuthLayout({ children }) {
	useClientSeo();
	return /* @__PURE__ */ jsxs("div", {
		className: "auth",
		children: [
			/* @__PURE__ */ jsx("a", {
				href: "#main",
				className: "skip-link",
				children: "Перейти к содержимому"
			}),
			/* @__PURE__ */ jsxs("header", {
				className: "auth__top container",
				children: [/* @__PURE__ */ jsx(Logo, {}), /* @__PURE__ */ jsx(Link, {
					href: "/",
					className: "link",
					children: "На главную"
				})]
			}),
			/* @__PURE__ */ jsx("main", {
				id: "main",
				tabIndex: -1,
				className: "auth__main",
				children
			}),
			/* @__PURE__ */ jsx("footer", {
				className: "auth__foot container text-xs text-muted",
				children: "Не указывайте в формах диагнозы и медицинские документы."
			}),
			/* @__PURE__ */ jsx(ToastHost, {})
		]
	});
}
//#endregion
//#region resources/js/layouts/CabinetLayout.tsx
var STATUS_LABEL = {
	draft: "Черновик",
	pending: "На модерации",
	approved: "Одобрен",
	published: "Опубликована",
	rejected: "Отклонена",
	hidden: "Скрыта",
	blocked: "Заблокирована"
};
var STATUS_TONE = {
	draft: void 0,
	pending: "warning",
	approved: "info",
	published: "success",
	rejected: "danger",
	hidden: "info",
	blocked: "danger"
};
var ITEMS = [
	{
		href: "/clinic-cabinet",
		label: "Обзор",
		icon: "home",
		exact: true,
		group: "Работа",
		ability: null
	},
	{
		href: "/clinic-cabinet/calendar",
		label: "Календарь",
		icon: "calendar",
		group: "Работа",
		ability: "manage_operations"
	},
	{
		href: "/clinic-cabinet/leads",
		label: "Заявки",
		icon: "phone",
		group: "Работа",
		ability: "manage_operations"
	},
	{
		href: "/clinic-cabinet/reviews",
		label: "Отзывы",
		icon: "thumb",
		group: "Работа",
		ability: "manage_operations"
	},
	{
		href: "/clinic-cabinet/stats",
		label: "Статистика",
		icon: "chart",
		group: "Работа",
		ability: null
	},
	{
		href: "/clinic-cabinet/organization",
		label: "Организация",
		icon: "building",
		group: "Профиль",
		ability: "manage_organization"
	},
	{
		href: "/clinic-cabinet/staff",
		label: "Сотрудники",
		icon: "users",
		group: "Профиль",
		ability: "manage_staff"
	},
	{
		href: "/clinic-cabinet/branches",
		label: "Филиалы",
		icon: "building",
		group: "Профиль",
		ability: "manage_content"
	},
	{
		href: "/clinic-cabinet/doctors",
		label: "Врачи",
		icon: "users",
		group: "Профиль",
		ability: "manage_content"
	},
	{
		href: "/clinic-cabinet/prices",
		label: "Услуги и цены",
		icon: "ruble",
		group: "Профиль",
		ability: "manage_content"
	},
	{
		href: "/clinic-cabinet/schedule",
		label: "График работы",
		icon: "clock",
		group: "Профиль",
		exact: true,
		ability: "manage_schedule"
	},
	{
		href: "/clinic-cabinet/schedule/doctors",
		label: "Расписание врачей",
		icon: "clock",
		group: "Профиль",
		ability: "manage_schedule"
	},
	{
		href: "/clinic-cabinet/photos",
		label: "Фото",
		icon: "image",
		group: "Профиль",
		ability: "manage_content"
	},
	{
		href: "/clinic-cabinet/posts",
		label: "Новости и акции",
		icon: "flash",
		group: "Профиль",
		ability: "manage_content"
	},
	{
		href: "/clinic-cabinet/card-bonuses",
		label: "Бонусы на карточке",
		icon: "sparkle",
		group: "Профиль",
		ability: "manage_content"
	},
	{
		href: "/clinic-cabinet/payments",
		label: "Тариф и платежи",
		icon: "ruble",
		group: "Работа",
		ability: "manage_billing"
	},
	{
		href: "/clinic-cabinet/promotions",
		label: "Продвижение",
		icon: "sparkle",
		group: "Работа",
		ability: "manage_promotions"
	},
	{
		href: "/clinic-cabinet/broadcasts",
		label: "Рассылки",
		icon: "send",
		group: "Работа",
		ability: "manage_promotions"
	},
	{
		href: "/clinic-cabinet/documents",
		label: "Документы",
		icon: "file",
		group: "Профиль",
		ability: "manage_content"
	},
	{
		href: "/clinic-cabinet/settings",
		label: "Настройки",
		icon: "settings",
		group: "Профиль",
		ability: null
	}
];
function BranchSwitcher() {
	const { cabinet } = usePage().props;
	if (!cabinet) return null;
	const { branch, branches, organization } = cabinet;
	const change = (id) => {
		const url = new URL(window.location.href);
		const path = url.pathname.includes("/branches/") ? "/clinic-cabinet" : url.pathname;
		router.get(path, { branch: id });
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "cabinet-switch",
		children: [
			/* @__PURE__ */ jsx("div", {
				className: "text-xs text-muted",
				children: organization.name
			}),
			branches.length > 0 ? /* @__PURE__ */ jsx(SelectField, {
				label: "Филиал",
				value: branch?.id ?? "",
				onChange: (e) => change(e.target.value),
				children: branches.map((b) => /* @__PURE__ */ jsx("option", {
					value: b.id,
					children: b.name
				}, b.id))
			}) : /* @__PURE__ */ jsx(Link, {
				href: "/clinic-cabinet/branches/create",
				className: "btn btn--primary btn--sm btn--block",
				children: "Добавить филиал"
			}),
			branch ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", {
				className: "row row--wrap",
				style: { gap: 8 },
				children: [/* @__PURE__ */ jsx(Badge$1, {
					tone: STATUS_TONE[branch.status],
					children: STATUS_LABEL[branch.status] ?? branch.status
				}), branch.status === "published" ? /* @__PURE__ */ jsx(Link, {
					href: `/clinics/${branch.slug}`,
					className: "link text-sm",
					children: "Страница на сайте"
				}) : null]
			}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
				className: "row",
				style: { justifyContent: "space-between" },
				children: [/* @__PURE__ */ jsx("span", {
					className: "text-sm",
					children: "Заполненность профиля"
				}), /* @__PURE__ */ jsxs("b", {
					className: "text-sm",
					children: [branch.completeness, "%"]
				})]
			}), /* @__PURE__ */ jsx("div", {
				className: "progress",
				role: "progressbar",
				"aria-valuenow": branch.completeness,
				"aria-valuemin": 0,
				"aria-valuemax": 100,
				"aria-label": "Заполненность профиля",
				children: /* @__PURE__ */ jsx("span", { style: { width: `${branch.completeness}%` } })
			})] })] }) : null
		]
	});
}
function sectionOf(href) {
	return href.split("/")[2] ?? "dashboard";
}
function visibleItems(items, abilities, demoSections) {
	let list = items;
	if (demoSections) list = list.filter((i) => demoSections.includes(sectionOf(i.href)));
	else if (abilities && abilities.length > 0) list = list.filter((i) => i.ability === null || i.ability === void 0 || abilities.includes(i.ability));
	return list;
}
function CabinetLayout({ children }) {
	const { demo, cabinet } = usePage().props;
	const items = visibleItems(ITEMS, cabinet?.abilities, demo?.sections);
	return /* @__PURE__ */ jsx(DashboardShell, {
		items,
		brandSuffix: "для клиник",
		mobileBrandSuffix: "Клиника",
		mobileLabel: "Кабинет клиники",
		aside: /* @__PURE__ */ jsx(BranchSwitcher, {}),
		children
	});
}
//#endregion
//#region resources/js/layouts/MaxLayout.tsx
function useActive() {
	const { url } = usePage();
	return (href) => {
		const path = url.split("?")[0];
		if (path === href) return true;
		return href !== "/max" && path.startsWith(`${href}/`);
	};
}
/** Мини-приложение в MAX: компактная шапка (город и поиск), нижняя навигация, без подвала сайта. */
function MaxLayout({ children }) {
	const { auth, maxBridgeScript } = usePage().props;
	const { url } = usePage();
	const city = useCity();
	const active = useActive();
	const user = auth?.user;
	const [searchOpen, setSearchOpen] = useState(false);
	useEffect(() => setSearchOpen(false), [url]);
	const tabs = [
		{
			href: "/max",
			label: "Главная",
			icon: "home"
		},
		{
			href: "#search",
			label: "Поиск",
			icon: "search",
			action: () => setSearchOpen(true)
		},
		{
			href: "/max/clinics",
			label: "Клиники",
			icon: "building"
		},
		...user ? [{
			href: "/max/appointments",
			label: "Записи",
			icon: "calendar"
		}] : [],
		{
			href: user ? accountHome(user) : "/login",
			label: user ? "Профиль" : "Вход",
			icon: "user",
			badge: user?.unread
		}
	];
	return /* @__PURE__ */ jsx(LeadProvider, { children: /* @__PURE__ */ jsxs("div", {
		className: "max-app",
		children: [
			/* @__PURE__ */ jsx(Head, { children: maxBridgeScript ? /* @__PURE__ */ jsx("script", {
				src: maxBridgeScript,
				defer: true
			}) : null }),
			/* @__PURE__ */ jsxs("header", {
				className: "header max-app__header",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "container header__row",
					children: [
						/* @__PURE__ */ jsx(Logo, { to: "/max" }),
						/* @__PURE__ */ jsx(CityPicker, {}),
						/* @__PURE__ */ jsx("nav", {
							className: "header__actions",
							"aria-label": "Действия",
							children: /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "icon-link",
								onClick: () => setSearchOpen(true),
								"aria-label": "Поиск",
								children: /* @__PURE__ */ jsx(Icon, {
									name: "search",
									size: 22
								})
							})
						})
					]
				}), /* @__PURE__ */ jsx("div", {
					className: "header__nav hide-mobile",
					children: /* @__PURE__ */ jsx("nav", {
						className: "container",
						"aria-label": "Навигация мини-приложения",
						children: /* @__PURE__ */ jsxs("ul", { children: [
							/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
								href: "/max",
								className: cx(active("/max") && "is-active"),
								children: "Главная"
							}) }),
							/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
								href: "/max/clinics",
								className: cx(active("/max/clinics") && "is-active"),
								children: ["Клиники ", city.nameIn]
							}) }),
							user ? /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
								href: "/max/appointments",
								className: cx(active("/max/appointments") && "is-active"),
								children: "Мои записи"
							}) }) : null,
							/* @__PURE__ */ jsx("li", { className: "grow" }),
							/* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsx(Link, {
								href: "/privacy",
								className: "header__b2b",
								children: "Конфиденциальность"
							}) })
						] })
					})
				})]
			}),
			/* @__PURE__ */ jsx("main", {
				id: "main",
				className: "main max-app__main",
				children
			}),
			/* @__PURE__ */ jsx("nav", {
				className: "tabbar max-app__tabbar",
				"aria-label": "Навигация мини-приложения",
				children: tabs.map((t) => t.action ? /* @__PURE__ */ jsxs("button", {
					type: "button",
					onClick: t.action,
					className: cx("tabbar__item", searchOpen && "is-active"),
					children: [/* @__PURE__ */ jsx("span", {
						className: "tabbar__icon",
						children: /* @__PURE__ */ jsx(Icon, {
							name: t.icon,
							size: 24
						})
					}), /* @__PURE__ */ jsx("span", { children: t.label })]
				}, t.label) : /* @__PURE__ */ jsxs(Link, {
					href: t.href,
					className: cx("tabbar__item", active(t.href) && "is-active"),
					"aria-current": active(t.href) ? "page" : void 0,
					children: [/* @__PURE__ */ jsxs("span", {
						className: "tabbar__icon",
						children: [/* @__PURE__ */ jsx(Icon, {
							name: t.icon,
							size: 24
						}), t.badge ? /* @__PURE__ */ jsx("span", {
							className: "count-badge",
							children: t.badge > 9 ? "9+" : t.badge
						}) : null]
					}), /* @__PURE__ */ jsx("span", { children: t.label })]
				}, t.label))
			}),
			/* @__PURE__ */ jsxs(Drawer, {
				open: searchOpen,
				onClose: () => setSearchOpen(false),
				title: "Поиск",
				children: [/* @__PURE__ */ jsx(SearchBox, {
					variant: "hero",
					autoFocus: true,
					onDone: () => setSearchOpen(false)
				}), /* @__PURE__ */ jsx("p", {
					className: "text-sm text-muted",
					style: { marginTop: 16 },
					children: "Например: «болит зуб», «имплантация», «детский стоматолог», название клиники или фамилия врача."
				})]
			}),
			/* @__PURE__ */ jsx(AssistantWidget, {}),
			/* @__PURE__ */ jsx(ToastHost, {})
		]
	}) });
}
//#endregion
//#region resources/js/app.tsx
registerServiceWorker();
setupFastNavigation();
setupTouchHover();
if (typeof window !== "undefined") router.on("navigate", (event) => {
	if (window.ym && window.ymCounterId) window.ym(window.ymCounterId, "hit", event.detail.page.url, { referer: document.referrer });
	const url = event.detail.page.url;
	if (!url.includes("/admin") && !url.includes("/cabinet") && !url.includes("/max")) trackAnalyticsEvent(AnalyticsEvents.pageView, { path: url });
});
var renderPromise = createInertiaApp({
	resolve: async (name, page) => {
		const pages = /* #__PURE__ */ Object.assign({
			"./pages/Account/Appointments.tsx": () => import("./assets/Appointments-DaX8PruM.js"),
			"./pages/Account/Compare.tsx": () => import("./assets/Compare-tWU4z9al.js"),
			"./pages/Account/Favorites.tsx": () => import("./assets/Favorites-Byvj9bRT.js"),
			"./pages/Account/History.tsx": () => import("./assets/History-CVOMwmz5.js"),
			"./pages/Account/Leads.tsx": () => import("./assets/Leads-BRQvR5z-.js"),
			"./pages/Account/Notifications.tsx": () => import("./assets/Notifications-rtWa88dZ.js"),
			"./pages/Account/Overview.tsx": () => import("./assets/Overview-AiNqG1kt.js"),
			"./pages/Account/Profile.tsx": () => import("./assets/Profile-CmiTy00a.js"),
			"./pages/Account/Reviews.tsx": () => import("./assets/Reviews-P7NXLTah.js"),
			"./pages/Admin/Analytics.tsx": () => import("./assets/Analytics-EuEC8svk.js"),
			"./pages/Admin/Appointments.tsx": () => import("./assets/Appointments-VDV29EIQ.js"),
			"./pages/Admin/Assistant.tsx": () => import("./assets/Assistant-D0RyWCAl.js"),
			"./pages/Admin/AssistantConversation.tsx": () => import("./assets/AssistantConversation-CbSflSHy.js"),
			"./pages/Admin/Audit.tsx": () => import("./assets/Audit-DkAcbx4_.js"),
			"./pages/Admin/BroadcastShow.tsx": () => import("./assets/BroadcastShow-C1DTvEti.js"),
			"./pages/Admin/Broadcasts.tsx": () => import("./assets/Broadcasts-BUAqtMak.js"),
			"./pages/Admin/Campaign.tsx": () => import("./assets/Campaign-CHsJQJqs.js"),
			"./pages/Admin/Campaigns.tsx": () => import("./assets/Campaigns-Dipfzias.js"),
			"./pages/Admin/CardBonuses.tsx": () => import("./assets/CardBonuses-CiPoZr__.js"),
			"./pages/Admin/ClinicCardAppearance.tsx": () => import("./assets/ClinicCardAppearance-CXHUJjme.js"),
			"./pages/Admin/ClinicCreate.tsx": () => import("./assets/ClinicCreate-DHAg1eFh.js"),
			"./pages/Admin/ClinicShow.tsx": () => import("./assets/ClinicShow-ixduDh8_.js"),
			"./pages/Admin/Clinics.tsx": () => import("./assets/Clinics-zevuFAGn.js"),
			"./pages/Admin/Complaints.tsx": () => import("./assets/Complaints-BAaB4dzD.js"),
			"./pages/Admin/Dashboard.tsx": () => import("./assets/Dashboard-BNl_NxZ6.js"),
			"./pages/Admin/Dictionary.tsx": () => import("./assets/Dictionary-DQtV1QH3.js"),
			"./pages/Admin/Doctors.tsx": () => import("./assets/Doctors-D98ONitv.js"),
			"./pages/Admin/Duplicates.tsx": () => import("./assets/Duplicates-Dj7WRCGp.js"),
			"./pages/Admin/Finance.tsx": () => import("./assets/Finance-uLJGP_d1.js"),
			"./pages/Admin/Geography.tsx": () => import("./assets/Geography-DvmrwSnJ.js"),
			"./pages/Admin/Integrations.tsx": () => import("./assets/Integrations-DnNrZv4f.js"),
			"./pages/Admin/MaxPublish.tsx": () => import("./assets/MaxPublish-BREXZV9H.js"),
			"./pages/Admin/Moderation.tsx": () => import("./assets/Moderation-B0P6El7H.js"),
			"./pages/Admin/Offer.tsx": () => import("./assets/Offer-U4hc2Let.js"),
			"./pages/Admin/OfferTemplate.tsx": () => import("./assets/OfferTemplate-XPmOutNN.js"),
			"./pages/Admin/Offers.tsx": () => import("./assets/Offers-CjBlmR6m.js"),
			"./pages/Admin/ParsedOrganization.tsx": () => import("./assets/ParsedOrganization-DCby3N4_.js"),
			"./pages/Admin/Parser.tsx": () => import("./assets/Parser-D7CAnL5E.js"),
			"./pages/Admin/Promotions.tsx": () => import("./assets/Promotions-B6U89lJA.js"),
			"./pages/Admin/Reports.tsx": () => import("./assets/Reports-C0NPvimi.js"),
			"./pages/Admin/Reviews.tsx": () => import("./assets/Reviews-D7yTyY4Q.js"),
			"./pages/Admin/Roles.tsx": () => import("./assets/Roles-BVF4jAH_.js"),
			"./pages/Admin/SiteDisplay.tsx": () => import("./assets/SiteDisplay-DRyWB_Nz.js"),
			"./pages/Admin/SystemHealth.tsx": () => import("./assets/SystemHealth-D4cNQ2IK.js"),
			"./pages/Admin/Tariffs.tsx": () => import("./assets/Tariffs-C97A1V_1.js"),
			"./pages/Admin/UserShow.tsx": () => import("./assets/UserShow-1GqJ2eTO.js"),
			"./pages/Admin/Users.tsx": () => import("./assets/Users-zGofeIMv.js"),
			"./pages/Auth/AcceptStaffInvite.tsx": () => import("./assets/AcceptStaffInvite-VodrJ_aE.js"),
			"./pages/Auth/ForgotPassword.tsx": () => import("./assets/ForgotPassword-DzXVvt9i.js"),
			"./pages/Auth/LinkSocial.tsx": () => import("./assets/LinkSocial-C-pxBVOa.js"),
			"./pages/Auth/Login.tsx": () => import("./assets/Login-CUIUSQnU.js"),
			"./pages/Auth/MaxLogin.tsx": () => import("./assets/MaxLogin-D1Y8GyoY.js"),
			"./pages/Auth/Register.tsx": () => import("./assets/Register-CRNB_MK6.js"),
			"./pages/Auth/RegisterClinic.tsx": () => import("./assets/RegisterClinic-BdTii8hu.js"),
			"./pages/Auth/ResetPassword.tsx": () => import("./assets/ResetPassword-CMRfNUjN.js"),
			"./pages/Auth/VerifyEmail.tsx": () => import("./assets/VerifyEmail-D0R-8Bsa.js"),
			"./pages/Booking/Create.tsx": () => import("./assets/Create-C_EyFvw9.js"),
			"./pages/Booking/Show.tsx": () => import("./assets/Show-BGBKJIfp.js"),
			"./pages/Cabinet/BranchForm.tsx": () => import("./assets/BranchForm-qE6lm8Ei.js"),
			"./pages/Cabinet/Branches.tsx": () => import("./assets/Branches-DJEgqdmX.js"),
			"./pages/Cabinet/Broadcasts.tsx": () => import("./assets/Broadcasts-DMSiC15d.js"),
			"./pages/Cabinet/Calendar.tsx": () => import("./assets/Calendar-CahxVoMV.js"),
			"./pages/Cabinet/CardBonuses.tsx": () => import("./assets/CardBonuses-DWcPEaEV.js"),
			"./pages/Cabinet/Dashboard.tsx": () => import("./assets/Dashboard-Bf40up59.js"),
			"./pages/Cabinet/DoctorForm.tsx": () => import("./assets/DoctorForm-Bf7SPLs6.js"),
			"./pages/Cabinet/DoctorSchedules.tsx": () => import("./assets/DoctorSchedules-CV-B_Blq.js"),
			"./pages/Cabinet/Doctors.tsx": () => import("./assets/Doctors-BG7A7IZ1.js"),
			"./pages/Cabinet/Documents.tsx": () => import("./assets/Documents-DBObHyVy.js"),
			"./pages/Cabinet/Leads.tsx": () => import("./assets/Leads-R9khBBKe.js"),
			"./pages/Cabinet/Organization.tsx": () => import("./assets/Organization-i1sIZEJJ.js"),
			"./pages/Cabinet/Payments.tsx": () => import("./assets/Payments-BQkCw9nG.js"),
			"./pages/Cabinet/Photos.tsx": () => import("./assets/Photos-Bhe2-55M.js"),
			"./pages/Cabinet/Posts.tsx": () => import("./assets/Posts-BC5RvG5J.js"),
			"./pages/Cabinet/Prices.tsx": () => import("./assets/Prices-Fam2CJJQ.js"),
			"./pages/Cabinet/Promotions.tsx": () => import("./assets/Promotions-DdkUGVcr.js"),
			"./pages/Cabinet/Reviews.tsx": () => import("./assets/Reviews-DcxWEsf9.js"),
			"./pages/Cabinet/Schedule.tsx": () => import("./assets/Schedule-90ytJwDi.js"),
			"./pages/Cabinet/Settings.tsx": () => import("./assets/Settings-B6Iln2or.js"),
			"./pages/Cabinet/Staff.tsx": () => import("./assets/Staff-D7Tw2HYd.js"),
			"./pages/Cabinet/Stats.tsx": () => import("./assets/Stats-BrdHPzeR.js"),
			"./pages/Clinics/Index.tsx": () => import("./assets/Index-C78AvwDi.js"),
			"./pages/Clinics/Show.tsx": () => import("./assets/Show-BIM8NUmG.js"),
			"./pages/Collections/Compare.tsx": () => import("./assets/Compare-D-y-l1lK.js"),
			"./pages/Collections/Favorites.tsx": () => import("./assets/Favorites-oYQ0QqAh.js"),
			"./pages/Concerns/Show.tsx": () => import("./assets/Show-TEY3uiGJ.js"),
			"./pages/Directions/Index.tsx": () => import("./assets/Index-DFbx7JPX.js"),
			"./pages/Directions/Show.tsx": () => import("./assets/Show-DF8WL8sh.js"),
			"./pages/Doctors/Index.tsx": () => import("./assets/Index-CLAHT0Bz.js"),
			"./pages/Doctors/Show.tsx": () => import("./assets/Show-BBLq-Vxr.js"),
			"./pages/Error.tsx": () => import("./assets/Error-H9Z2MRWR.js"),
			"./pages/Home.tsx": () => import("./assets/Home-B6-IoPpj.js"),
			"./pages/Max/Appointments.tsx": () => import("./assets/Appointments-BnJkxfbR.js"),
			"./pages/Max/ClinicShow.tsx": () => import("./assets/ClinicShow-BLWblnNZ.js"),
			"./pages/Max/Clinics.tsx": () => import("./assets/Clinics-DNg66XDB.js"),
			"./pages/Max/Home.tsx": () => import("./assets/Home-eg0eW05s.js"),
			"./pages/Offer/Claim.tsx": () => import("./assets/Claim-DkEiKlWS.js"),
			"./pages/Offer/Show.tsx": () => import("./assets/Show-BpJ5H6Lb.js"),
			"./pages/Offer/Unsubscribe.tsx": () => import("./assets/Unsubscribe-CcebS-vp.js"),
			"./pages/Page.tsx": () => import("./assets/Page-BskXDT8U.js"),
			"./pages/Prices/Index.tsx": () => import("./assets/Index-Bqmt_P9P.js"),
			"./pages/Reviews/Index.tsx": () => import("./assets/Index-b_7us2QA.js"),
			"./pages/Search/Index.tsx": () => import("./assets/Index-C-3VvxaS.js"),
			"./pages/Tz.tsx": () => import("./assets/Tz-BUkOG5vE.js")
		});
		const module = await (pages[`./pages/${name}.tsx`] || pages[`./pages/${name}.jsx`] || pages[`./Pages/${name}.tsx`] || pages[`./Pages/${name}.jsx`])?.();
		if (!module) throw new Error(`Page not found: ${name}`);
		return module.default ?? module;
	},
	layout: (name) => {
		if (name.startsWith("Auth/")) return AuthLayout;
		if (name.startsWith("Account/")) return AccountLayout;
		if (name.startsWith("Cabinet/")) return CabinetLayout;
		if (name.startsWith("Admin/")) return AdminLayout;
		if (name.startsWith("Max/")) return MaxLayout;
		if (name === "Error") return AuthLayout;
		return PublicLayout;
	},
	progress: {
		color: "#2F6BFF",
		delay: 0,
		includeCSS: true,
		showSpinner: false
	},
	defaults: { prefetch: {
		cacheFor: "30s",
		hoverDelay: 65
	} }
});
renderPromise.catch((error) => console.error(error));
var renderPage = async (page) => {
	return (await renderPromise)(page, renderToString);
};
createServer(renderPage);
//#endregion
export { trackAnalyticsEvent as A, SelectField as C, Lightbox as D, Drawer as E, Modal as O, SearchInput as S, TextField as T, Stars as _, can as a, CitySearchField as b, Alert as c, Breadcrumbs as d, renderPage as default, EmptyState as f, Skeleton as g, SectionHead as h, useCity as i, AnalyticsEvents as k, Avatar as l, Pagination as m, formatEta as n, SearchBox as o, ErrorState as p, useCollections as r, useLead as s, ParserTaskProgress as t, Badge$1 as u, Tabs as v, TextArea as w, PhoneField as x, Check as y };

//# sourceMappingURL=app.js.map