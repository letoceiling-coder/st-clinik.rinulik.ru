import { usePage } from "@inertiajs/react";
import { useCallback, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/components/auth/SocialOAuthButtons.tsx
var ICONS = {
	yandex: "https://template.cheepy.shop/images/auth/social/yandex.svg",
	vk: "https://template.cheepy.shop/images/auth/social/vk.svg",
	max: "https://template.cheepy.shop/images/auth/social/max.png?v=2"
};
var LABELS = {
	yandex: "Яндекс ID",
	vk: "VK ID",
	max: "MAX"
};
var HREF = {
	yandex: "/auth/yandex/redirect",
	vk: "/auth/vk/redirect",
	max: "/auth/max/start"
};
function SocialOAuthButtons({ providers, showHeading = true }) {
	const oauth = usePage().props.oauth ?? {};
	const [busy, setBusy] = useState(null);
	const items = (providers ?? [
		"yandex",
		"vk",
		"max"
	]).filter((key) => oauth[key]);
	const start = useCallback((e, key, href) => {
		e.preventDefault();
		if (busy) return;
		setBusy(key);
		window.setTimeout(() => {
			window.location.assign(href);
		}, 80);
	}, [busy]);
	if (items.length === 0) return null;
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsxs("div", {
		className: "oauth stack-sm",
		children: [showHeading && /* @__PURE__ */ jsx("p", {
			className: "text-sm text-muted text-center",
			children: "или быстрый вход"
		}), /* @__PURE__ */ jsx("div", {
			className: "oauth__grid oauth__grid--icons",
			role: "group",
			"aria-label": "Быстрый вход",
			children: items.map((key) => /* @__PURE__ */ jsxs("a", {
				href: HREF[key],
				className: `oauth__btn oauth__btn--${key}${busy === key ? " is-loading" : ""}`,
				"aria-label": LABELS[key],
				title: LABELS[key],
				"aria-busy": busy === key || void 0,
				onClick: (e) => start(e, key, HREF[key]),
				children: [/* @__PURE__ */ jsx("img", {
					src: ICONS[key],
					alt: "",
					className: "oauth__icon",
					width: 28,
					height: 28,
					loading: "eager",
					decoding: "async"
				}), /* @__PURE__ */ jsx("span", {
					className: "oauth__label",
					children: LABELS[key]
				})]
			}, key))
		})]
	}), busy && /* @__PURE__ */ jsx("div", {
		className: "oauth-busy",
		role: "dialog",
		"aria-modal": "true",
		"aria-labelledby": "oauth-busy-title",
		children: /* @__PURE__ */ jsxs("div", {
			className: "oauth-busy__panel card card--shadow stack",
			children: [
				/* @__PURE__ */ jsx("span", {
					className: "spinner spinner--lg",
					"aria-hidden": "true"
				}),
				/* @__PURE__ */ jsxs("p", {
					id: "oauth-busy-title",
					className: "oauth-busy__title",
					children: [
						"Подключаем ",
						LABELS[busy],
						"…"
					]
				}),
				/* @__PURE__ */ jsx("p", {
					className: "text-sm text-muted text-center",
					children: "Сейчас откроется страница входа. Не закрывайте вкладку."
				}),
				/* @__PURE__ */ jsx("div", {
					className: "oauth-busy__bar",
					"aria-hidden": "true",
					children: /* @__PURE__ */ jsx("span", {})
				})
			]
		})
	})] });
}
//#endregion
export { SocialOAuthButtons as t };

//# sourceMappingURL=SocialOAuthButtons-BfmrBF_z.js.map