import { t as Icon } from "./Icon-_sloiNX5.js";
import { n as cx } from "./format-BP5psl3Q.js";
import { n as Button } from "./Button-C2BxTtRt.js";
import { r as PageHead } from "./Dash-C8plSzIc.js";
import { router } from "@inertiajs/react";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/SystemHealth.tsx
var OVERALL = {
	ok: {
		title: "Всё работает",
		text: "Все проверки пройдены."
	},
	warn: {
		title: "Есть предупреждения",
		text: "Сайт работает, но что-то требует внимания."
	},
	fail: {
		title: "Есть сбои",
		text: "Часть функций не работает — пользователи могут это заметить."
	}
};
var ICON = {
	ok: "check-circle",
	warn: "alert",
	fail: "alert"
};
function SystemHealth({ checks, overall, checkedAt, failedJobs }) {
	const [busy, setBusy] = useState(false);
	const sorted = [...checks].sort((a, b) => [
		"fail",
		"warn",
		"ok"
	].indexOf(a.status) - [
		"fail",
		"warn",
		"ok"
	].indexOf(b.status));
	return /* @__PURE__ */ jsxs("div", {
		className: "stack-lg",
		children: [
			/* @__PURE__ */ jsx(PageHead, {
				title: "Состояние системы",
				text: "Сервисы, которые ломаются незаметно. Проверка идёт каждые 10 минут: о новом сбое суперадмины получают сообщение в MAX и на почту.",
				action: /* @__PURE__ */ jsx(Button, {
					variant: "outline",
					icon: "refresh",
					loading: busy,
					onClick: () => router.post("/admin/system/refresh", {}, {
						preserveScroll: true,
						onStart: () => setBusy(true),
						onFinish: () => setBusy(false)
					}),
					children: "Проверить сейчас"
				})
			}),
			/* @__PURE__ */ jsxs("section", {
				className: cx("card health-overall", `health-overall--${overall}`),
				children: [/* @__PURE__ */ jsx(Icon, {
					name: ICON[overall],
					size: 28
				}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("b", { children: OVERALL[overall].title }), /* @__PURE__ */ jsxs("p", {
					className: "text-sm",
					children: [
						OVERALL[overall].text,
						" Проверено ",
						checkedAt,
						"."
					]
				})] })]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "health-grid",
				children: sorted.map((c) => /* @__PURE__ */ jsxs("article", {
					className: cx("card health-card", `health-card--${c.status}`),
					children: [/* @__PURE__ */ jsx("span", {
						className: "health-card__dot",
						"aria-hidden": "true"
					}), /* @__PURE__ */ jsxs("div", {
						className: "health-card__body",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "health-card__label",
								children: c.label
							}),
							/* @__PURE__ */ jsx("b", {
								className: "health-card__value",
								children: c.value
							}),
							c.hint && c.status !== "ok" ? /* @__PURE__ */ jsx("p", {
								className: "health-card__hint",
								children: c.hint
							}) : null
						]
					})]
				}, c.key))
			}),
			failedJobs.length > 0 ? /* @__PURE__ */ jsxs("section", {
				className: "card stack",
				children: [/* @__PURE__ */ jsx("h2", {
					className: "card-title",
					children: "Последние упавшие задачи"
				}), /* @__PURE__ */ jsx("ul", {
					className: "health-jobs",
					children: failedJobs.map((j) => /* @__PURE__ */ jsxs("li", { children: [/* @__PURE__ */ jsxs("span", {
						className: "text-xs text-muted",
						children: [
							j.failed_at,
							" · ",
							j.queue
						]
					}), /* @__PURE__ */ jsx("code", { children: j.error })] }, j.id))
				})]
			}) : null
		]
	});
}
//#endregion
export { SystemHealth as default };

//# sourceMappingURL=SystemHealth-D4cNQ2IK.js.map