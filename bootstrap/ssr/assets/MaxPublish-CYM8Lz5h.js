import { l as Badge, s as Alert } from "../app.js";
import { r as PageHead } from "./Dash-mdaQWR8t.js";
import { Link } from "@inertiajs/react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region resources/js/pages/Admin/MaxPublish.tsx
function MaxPublish({ items, summary }) {
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(PageHead, { title: "Публикация MAX" }), /* @__PURE__ */ jsxs("div", {
		className: "stack",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "row row--between row--wrap",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
					className: "page-title",
					children: "Чек-лист публикации MAX"
				}), /* @__PURE__ */ jsx("p", {
					className: "text-muted text-sm",
					children: "Бот, Mini App и модерация (фаза 6.3)"
				})] }), /* @__PURE__ */ jsx(Link, {
					href: "/admin/integrations",
					className: "text-sm",
					children: "← Интеграции"
				})]
			}),
			/* @__PURE__ */ jsxs(Alert, {
				tone: "info",
				children: [
					"Автоматически проверено: ",
					summary.auto_done,
					" из ",
					summary.auto_total,
					". Пункты с пометкой «вручную» — на стороне заказчика и QA."
				]
			}),
			summary.last_api_check ? /* @__PURE__ */ jsxs("p", {
				className: "text-sm text-muted",
				children: [
					"Последняя проверка API MAX: ",
					summary.last_api_check.at,
					" —",
					" ",
					summary.last_api_check.ok ? "успешно" : summary.last_api_check.message
				]
			}) : null,
			/* @__PURE__ */ jsx("div", {
				className: "stack",
				children: items.map((item, index) => /* @__PURE__ */ jsxs("div", {
					className: "card stack",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "row row--wrap row--between",
							children: [/* @__PURE__ */ jsxs("strong", { children: [
								index + 1,
								". ",
								item.title
							] }), item.manual ? /* @__PURE__ */ jsx(Badge, {
								tone: "info",
								children: "Вручную"
							}) : item.ok ? /* @__PURE__ */ jsx(Badge, {
								tone: "success",
								children: "Готово"
							}) : /* @__PURE__ */ jsx(Badge, {
								tone: "warning",
								children: "Проверить"
							})]
						}),
						/* @__PURE__ */ jsx("p", {
							className: "text-sm text-muted",
							children: item.detail
						}),
						item.links?.length ? /* @__PURE__ */ jsx("div", {
							className: "row row--wrap",
							children: item.links.map((link) => /* @__PURE__ */ jsx("a", {
								href: link.href,
								className: "text-sm",
								target: "_blank",
								rel: "noreferrer",
								children: link.label
							}, link.href))
						}) : null
					]
				}, item.key))
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "card stack text-sm",
				children: [
					/* @__PURE__ */ jsx("strong", { children: "Быстрые URL" }),
					/* @__PURE__ */ jsxs("div", { children: ["Webhook: ", summary.webhook_url] }),
					/* @__PURE__ */ jsxs("div", { children: ["Mini App: ", summary.mini_app_url] })
				]
			})
		]
	})] });
}
//#endregion
export { MaxPublish as default };

//# sourceMappingURL=MaxPublish-CYM8Lz5h.js.map